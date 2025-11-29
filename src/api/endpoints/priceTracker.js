/**
 * POST /priceTracker - Individual Trade Tracking Endpoint
 * Per US1: Register trades and track D+1 to D+14 performance with cap-aware returns
 *
 * HTTP 207 Multi-Status: Returns per-trade results with individual success/failure codes
 */

import { createTradeRecord } from '../../services/priceTrackerService.js';
import { loadTrackedPriceCache, saveTrackedPriceCache, mergeTradeRecord, backupCache } from '../../services/cacheManager.js';
import { generateModelSummary } from '../../services/modelSummaryService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SYMBOL_CACHE_PATH = path.join(__dirname, '../../../docs/symbolCache.json');

/**
 * Load symbol cache for ticker validation
 * Per FR-017: Validate ticker exists in symbolCache
 */
async function loadSymbolCache() {
  try {
    const content = await fs.readFile(SYMBOL_CACHE_PATH, 'utf8');
    const cache = JSON.parse(content);
    return cache.symbols || [];
  } catch (error) {
    throw new Error(`Failed to load symbol cache: ${error.message}`);
  }
}

/**
 * Parse tab-delimited request body
 * Per contracts/priceTracker.openapi.yaml: text/plain with tab delimiters
 *
 * @param {string} body - Request body
 * @returns {Array<{position: string, modelName: string, ticker: string, purchaseDate: string}>}
 */
function parseRequestBody(body) {
  if (!body || typeof body !== 'string') {
    throw new Error('Request body is empty or invalid');
  }

  const lines = body.trim().split('\n');
  const trades = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const fields = line.split('\t');
    if (fields.length !== 4) {
      throw new Error(`Line ${i + 1}: Expected 4 tab-delimited fields, got ${fields.length}`);
    }

    const [position, modelName, ticker, purchaseDate] = fields;
    trades.push({ position, modelName, ticker, purchaseDate });
  }

  return trades;
}

/**
 * Validate trade input per FR-001 to FR-004, FR-017 to FR-019
 *
 * @param {Object} trade - Trade object
 * @param {Array} symbolCache - Symbol cache array
 * @returns {{valid: boolean, error?: {code: string, message: string}}}
 */
function validateTrade(trade, symbolCache) {
  const { position, modelName, ticker, purchaseDate } = trade;

  // FR-001: position must be "long" or "short"
  if (position !== 'long' && position !== 'short') {
    return {
      valid: false,
      error: {
        code: 'INVALID_POSITION',
        message: 'position must be "long" or "short"'
      }
    };
  }

  // FR-002: modelName must match pattern MODEL-{number}
  if (!modelName || !/^MODEL-\d+$/.test(modelName)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_MODEL_NAME',
        message: 'modelName must match pattern MODEL-{number}'
      }
    };
  }

  // FR-003: ticker must be uppercase letters
  if (!ticker || !/^[A-Z]+$/.test(ticker)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_TICKER',
        message: 'ticker must be uppercase letters only'
      }
    };
  }

  // FR-017: ticker must exist in symbolCache
  const tickerExists = symbolCache.some(s => s.symbol === ticker);
  if (!tickerExists) {
    return {
      valid: false,
      error: {
        code: 'TICKER_NOT_FOUND',
        message: `Ticker ${ticker} not found in symbolCache`
      }
    };
  }

  // FR-004: purchaseDate must be YYYY-MM-DD format
  if (!purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_DATE_FORMAT',
        message: 'purchaseDate must be in YYYY-MM-DD format'
      }
    };
  }

  // FR-018: purchaseDate must not be in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const purchaseDateObj = new Date(purchaseDate);
  if (purchaseDateObj > today) {
    return {
      valid: false,
      error: {
        code: 'FUTURE_DATE',
        message: 'purchaseDate cannot be in the future'
      }
    };
  }

  return { valid: true };
}

/**
 * Process batch of trades and return HTTP 207 Multi-Status response
 * Per research.md section 2: HTTP 207 Multi-Status pattern
 */
export async function priceTrackerHandler(req, res) {
  try {
    // Parse request body
    let trades;
    try {
      trades = parseRequestBody(req.body);
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FORMAT',
          message: error.message
        }
      });
    }

    if (trades.length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_REQUEST',
          message: 'No trades provided in request body'
        }
      });
    }

    // Load symbol cache for validation
    let symbolCache;
    try {
      symbolCache = await loadSymbolCache();
    } catch (error) {
      return res.status(500).json({
        error: {
          code: 'SYMBOL_CACHE_ERROR',
          message: error.message
        }
      });
    }

    // Process each trade
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];

      // Validate trade
      const validation = validateTrade(trade, symbolCache);
      if (!validation.valid) {
        results.push({
          index: i,
          status: validation.error.code === 'TICKER_NOT_FOUND' ? 404 : 400,
          trade,
          error: validation.error
        });
        failed++;
        continue;
      }

      // Create trade record
      try {
        const tradeRecordResult = await createTradeRecord(
          trade.position,
          trade.modelName,
          trade.ticker,
          trade.purchaseDate
        );

        if (!tradeRecordResult.success) {
          results.push({
            index: i,
            status: tradeRecordResult.error.code === 'TICKER_NOT_FOUND' ? 404 : 500,
            trade,
            error: tradeRecordResult.error
          });
          failed++;
          continue;
        }

        // Success: add data to result
        results.push({
          index: i,
          status: 200,
          trade,
          data: {
            currentPrice: tradeRecordResult.data.currentPrice,
            priceHistory: tradeRecordResult.data.priceHistory,
            returns: tradeRecordResult.data.returns
          }
        });
        succeeded++;

        // Merge into cache (will be saved in batch after loop)
        let cache = await loadTrackedPriceCache();
        cache = mergeTradeRecord(cache, tradeRecordResult.data);

        // Recalculate model summary for affected model (T036)
        const affectedModelName = trade.modelName;
        const updatedSummary = generateModelSummary(affectedModelName, cache.trades);

        // Update or add model summary in cache
        const summaryIndex = cache.modelSummaries.findIndex(s => s.modelName === affectedModelName);
        if (summaryIndex === -1) {
          cache.modelSummaries.push(updatedSummary);
        } else {
          cache.modelSummaries[summaryIndex] = updatedSummary;
        }

        // Backup before save
        await backupCache();

        // Save updated cache
        await saveTrackedPriceCache(cache);

      } catch (error) {
        console.error('Error processing trade:', error);
        results.push({
          index: i,
          status: 500,
          trade,
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message
          }
        });
        failed++;
      }
    }

    // Return HTTP 207 Multi-Status
    return res.status(207).json({
      results,
      summary: {
        total: trades.length,
        succeeded,
        failed
      }
    });

  } catch (error) {
    console.error('priceTracker endpoint error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    });
  }
}

export default priceTrackerHandler;
