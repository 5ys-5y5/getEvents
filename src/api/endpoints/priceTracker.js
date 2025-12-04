/**
 * POST /priceTracker - Individual Trade Tracking Endpoint
 * Per US1: Register trades and track D+1 to D+14 performance with cap-aware returns
 *
 * HTTP 207 Multi-Status: Returns per-trade results with individual success/failure codes
 */

import { createTradeRecord } from '../../services/priceTrackerService.js';
import { loadTrackedPriceCache, saveTrackedPriceCache, mergeTradeRecord, getSymbolCache, findExistingTrade } from '../../services/dbManager.js';
import { generateModelSummary } from '../../services/modelSummaryService.js';
import { getTradingDaysFromDate } from '../../services/tradingDayService.js';

/**
 * Parse request body - supports JSON array or tab-delimited text
 * Per contracts/priceTracker.openapi.yaml: text/plain with tab delimiters or JSON
 *
 * @param {string|Array|Object} body - Request body (string for TSV, array/object for JSON)
 * @returns {Array<{position: string, modelName: string, ticker: string, purchaseDate: string}>}
 */
function parseRequestBody(body) {
  // Handle JSON array or object
  if (Array.isArray(body)) {
    return body.map(item => ({
      position: item.position,
      modelName: item.modelName,
      ticker: item.ticker,
      purchaseDate: item.purchaseDate
    }));
  }
  
  if (typeof body === 'object' && body !== null) {
    // Single object
    return [{
      position: body.position,
      modelName: body.modelName,
      ticker: body.ticker,
      purchaseDate: body.purchaseDate
    }];
  }

  // Handle tab-delimited string
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
  // Check both 'symbol' and 'ticker' fields as DB structure may vary
  const tickerExists = symbolCache.some(s => s.symbol === ticker || s.ticker === ticker);
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
  console.log('[priceTracker] === Request received ===');
  console.log(`[priceTracker] Body type: ${typeof req.body}, length: ${req.body?.length || 0}`);
  
  try {
    // Parse request body
    let trades;
    try {
      trades = parseRequestBody(req.body);
      console.log(`[priceTracker] Parsed ${trades.length} trades`);
      if (trades.length > 0) {
        console.log(`[priceTracker] First trade: ${JSON.stringify(trades[0])}`);
      }
    } catch (error) {
      console.error(`[priceTracker] Parse error: ${error.message}`);
      return res.status(400).json({
        error: {
          code: 'INVALID_FORMAT',
          message: error.message
        }
      });
    }

    if (trades.length === 0) {
      console.log('[priceTracker] No trades in request');
      return res.status(400).json({
        error: {
          code: 'EMPTY_REQUEST',
          message: 'No trades provided in request body'
        }
      });
    }

    // Check if skipValidation flag is set (from tracker page after check phase)
    const skipValidation = req.query.skipValidation === 'true';
    
    // Load symbol cache only if validation is needed
    let symbolCache = [];
    if (!skipValidation) {
    try {
        const cache = await getSymbolCache();
        symbolCache = cache.symbols;
        console.log(`[priceTracker] Loaded ${symbolCache.length} symbols`);
    } catch (error) {
        console.error(`[priceTracker] Symbol cache error: ${error.message}`);
      return res.status(500).json({
          error: { code: 'SYMBOL_CACHE_ERROR', message: error.message }
        });
        }
    }

    // Validate trades if needed
    const validTrades = [];
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];

      // Skip validation if already done in check phase
      if (!skipValidation) {
        const validation = validateTrade(trade, symbolCache);
        if (!validation.valid) {
          console.log(`[priceTracker] Validation failed: ${validation.error.message}`);
          results.push({
            index: i,
            status: validation.error.code === 'TICKER_NOT_FOUND' ? 404 : 400,
            trade,
            error: validation.error
          });
          failed++;
          continue;
        }
      }

      validTrades.push({ ...trade, originalIndex: i });
    }

    console.log(`[priceTracker] ${validTrades.length} valid trades to process`);

    // ============================================
    // ⚡ OPTIMIZED: Batch process with ticker grouping
    // ============================================
    if (validTrades.length > 0) {
      const { batchCreateTradeRecords } = await import('../../services/priceTrackerService.js');

      // Transform trades for batch processing
      const batchTrades = validTrades.map(t => ({
        position: t.position,
        modelName: t.modelName,
        ticker: t.ticker,
        recommendationDate: t.purchaseDate
      }));

      console.log(`[priceTracker] Processing ${batchTrades.length} trades with ticker grouping...`);
      const batchResults = await batchCreateTradeRecords(batchTrades);

      // Process batch results
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const originalTrade = validTrades[i];
        const originalIndex = originalTrade.originalIndex;

        if (!result.success) {
          console.log(`[priceTracker] Failed: ${result.error.message}`);
          results[originalIndex] = {
            index: originalIndex,
            status: result.error.code === 'TICKER_NOT_FOUND' ? 404 : 500,
            trade: originalTrade,
            error: result.error
          };
          failed++;
          continue;
        }

        // Save trade record directly to DB (no full cache reload)
        try {
          await mergeTradeRecord(result.data);
          console.log(`[priceTracker] Saved: ${originalTrade.ticker}`);

          // Check if date was adjusted (weekend/holiday recommendation)
          const wasUpdated = result.data.meta?.dateAdjusted;

          results[originalIndex] = {
            index: originalIndex,
            status: 200,
            trade: wasUpdated ? {
              ...originalTrade,
              purchaseDate: result.data.purchaseDate // Use adjusted date
            } : originalTrade,
            updated: wasUpdated,
            data: {
              currentPrice: result.data.currentPrice,
              priceHistory: result.data.priceHistory,
              returns: result.data.returns,
              meta: result.data.meta
            }
          };
          succeeded++;
        } catch (error) {
          console.error(`[priceTracker] DB save error for ${originalTrade.ticker}: ${error.message}`);
          results[originalIndex] = {
            index: originalIndex,
            status: 500,
            trade: originalTrade,
            error: { code: 'DB_ERROR', message: error.message }
          };
          failed++;
        }
      }
    }

    // Update model summaries once at the end (batch update)
    if (succeeded > 0) {
      try {
        const affectedModels = [...new Set(trades.map(t => t.modelName))];
        const cache = await loadTrackedPriceCache();
        
        for (const modelName of affectedModels) {
          const updatedSummary = generateModelSummary(modelName, cache.trades);
          const summaryIndex = cache.modelSummaries.findIndex(s => s.modelName === modelName);
          if (summaryIndex === -1) {
            cache.modelSummaries.push(updatedSummary);
          } else {
            cache.modelSummaries[summaryIndex] = updatedSummary;
          }
        }
        
        // Ensure modelSummaries is always an array
        if (!Array.isArray(cache.modelSummaries)) {
          cache.modelSummaries = [];
        }
        
        await saveTrackedPriceCache(cache);
        console.log(`[priceTracker] Model summaries updated for ${affectedModels.length} models`);
      } catch (error) {
        console.error(`[priceTracker] Model summary update error: ${error.message}`);
        // Don't fail the whole request, trades are already saved
      }
    }

    console.log(`[priceTracker] Complete: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);

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

/**
 * POST /priceTracker/check - Check trades against DB before processing
 * Returns which trades are new, which need partial update, which are complete
 * 
 * OPTIMIZED: Loads all symbol cache and trades at once, then compares in memory
 * This is MUCH faster than individual DB queries per trade
 */
export async function priceTrackerCheckHandler(req, res) {
  const startTime = Date.now();
  console.log(`[check] === Checking ${req.body?.length || 'unknown'} trades (OPTIMIZED) ===`);
  
  try {
    // Parse request body
    let trades;
    try {
      trades = parseRequestBody(req.body);
      console.log(`[check] Parsed ${trades.length} trades`);
    } catch (error) {
      console.error(`[check] Parse error: ${error.message}`);
      return res.status(400).json({
        error: { code: 'INVALID_FORMAT', message: error.message }
      });
    }

    if (trades.length === 0) {
      return res.status(400).json({
        error: { code: 'EMPTY_REQUEST', message: 'No trades provided' }
      });
    }

    // ========================================
    // OPTIMIZATION: Load ALL data at once
    // ========================================
    console.log(`[check] Loading symbol cache and trades from DB...`);
    const loadStartTime = Date.now();
    
    // Load symbol cache and existing trades in parallel
    const [symbolCacheResult, existingTradesResult] = await Promise.all([
      getSymbolCache(),
      loadTrackedPriceCache()
    ]);
    
    const symbolCache = symbolCacheResult.symbols || [];
    const existingTrades = existingTradesResult.trades || [];
    
    console.log(`[check] Loaded ${symbolCache.length} symbols, ${existingTrades.length} existing trades in ${Date.now() - loadStartTime}ms`);
    
    // ========================================
    // Build lookup maps for O(1) access
    // ========================================
    
    // Symbol lookup: Set for O(1) ticker existence check
    const symbolSet = new Set();
    for (const s of symbolCache) {
      if (s.symbol) symbolSet.add(s.symbol.toUpperCase());
      if (s.ticker) symbolSet.add(s.ticker.toUpperCase());
    }
    
    // Trades lookup: Map for O(1) existing trade lookup
    // Key format: "position|modelName|ticker|recommendationDate"
    // Uses recommendationDate (user input) for duplicate detection
    const tradesMap = new Map();
    for (const t of existingTrades) {
      // Use recommendationDate for lookup key (falls back to purchaseDate for legacy data)
      const recDate = t.recommendationDate || t.purchaseDate;
      const dateOnly = recDate?.split('T')[0] || recDate;
      const key = `${t.position}|${t.modelName}|${t.ticker}|${dateOnly}`;
      tradesMap.set(key, t);
    }
    
    console.log(`[check] Built lookup maps: ${symbolSet.size} symbols, ${tradesMap.size} trades`);

    // ========================================
    // Helper functions (no DB calls)
    // ========================================
    
    // Get today's date in YYYY-MM-DD format (for comparing with target dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    /**
     * Count incomplete entries in price_history that NEED API calls
     * 
     * LOGIC:
     * 1. If entry has targetDate: use actual date to determine if past/future
     * 2. If entry has no targetDate: estimate based on purchaseDate
     * 3. Past date + (null entry OR incomplete OHLC) = needs API call
     * 4. Future date (>= today) = no API call needed
     * 
     * IMPORTANT: Even if entry exists, if ANY of low/high/open/close is null,
     * it needs an API call to get complete data.
     * 
     * @param {Array} priceHistory - Array of price data
     * @param {string} purchaseDate - The purchase date to calculate D+N dates
     * @returns {{nullCount: number, futureCount: number, completeCount: number}} 
     */
    function countNullsInPriceHistory(priceHistory, purchaseDate) {
      let nullCount = 0;      // Entries that need API calls (past dates with missing/incomplete data)
      let futureCount = 0;    // Entries that are today or future (no API call needed)
      let completeCount = 0;  // Entries with complete data
      
      // Estimate past trading days from purchaseDate (fallback when no targetDate)
      let estimatedPastTradingDays = 14; // Default: assume all past
      
      if (purchaseDate) {
        const purchaseDateObj = new Date(purchaseDate + 'T00:00:00Z');
        const daysSincePurchase = Math.floor((today - purchaseDateObj) / (1000 * 60 * 60 * 24));
        
        if (daysSincePurchase <= 0) {
          estimatedPastTradingDays = 0;
        } else {
          // Rough estimate: trading days ≈ calendar days * 5/7, minus 1 for today
          estimatedPastTradingDays = Math.floor((daysSincePurchase - 1) * 5 / 7);
          estimatedPastTradingDays = Math.max(0, Math.min(14, estimatedPastTradingDays));
        }
      }
      
      // If no price history at all
      if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length === 0) {
        nullCount = estimatedPastTradingDays;
        futureCount = 14 - estimatedPastTradingDays;
        return { nullCount, futureCount, completeCount };
      }
      
      // Check each D+N entry (D+1 to D+14)
      for (let i = 0; i < 14; i++) {
        const n = i + 1; // D+1 to D+14
        const entry = priceHistory[i];
        
        // Determine if this D+N is past or future
        let isPastDate = false;
        
        if (entry && entry.targetDate) {
          // Use actual targetDate from data
          const targetDateStr = entry.targetDate.split('T')[0];
          isPastDate = targetDateStr < todayStr;
        } else if (entry && entry.actualDate) {
          // Use actualDate as fallback
          const actualDateStr = entry.actualDate.split('T')[0];
          isPastDate = actualDateStr < todayStr;
        } else {
          // No date info - use estimate based on purchaseDate
          isPastDate = n <= estimatedPastTradingDays;
        }
        
        // Check if marked as future date (explicit flag)
        if (entry && entry.isFutureDate === true) {
          // Was marked as future - check if it's now past
          if (entry.targetDate) {
            const targetDateStr = entry.targetDate.split('T')[0];
            if (targetDateStr < todayStr) {
              // Was future, now past - needs API call
              nullCount++;
              continue;
            }
          }
          futureCount++;
          continue;
        }
        
        // If future date, skip (no API call needed)
        if (!isPastDate) {
          futureCount++;
          continue;
        }
        
        // PAST DATE - check if data is complete
        if (entry === null || entry === undefined) {
          // No data at all - needs API call
          nullCount++;
        } else if (typeof entry === 'object') {
          // Check if ALL OHLC fields are present and non-null
          const isComplete = 
            entry.low !== null && entry.low !== undefined &&
            entry.high !== null && entry.high !== undefined &&
            entry.open !== null && entry.open !== undefined &&
            entry.close !== null && entry.close !== undefined;
          
          if (isComplete) {
            completeCount++;
          } else {
            // Has entry but OHLC is incomplete - needs API call
            nullCount++;
          }
        } else {
          // Invalid entry type - needs API call
          nullCount++;
        }
      }
      
      // Handle missing entries (priceHistory.length < 14)
      if (priceHistory.length < 14) {
        const missingCount = 14 - priceHistory.length;
        
        // For missing entries, estimate how many are past vs future
        for (let i = priceHistory.length; i < 14; i++) {
          const n = i + 1;
          if (n <= estimatedPastTradingDays) {
            nullCount++;
          } else {
            futureCount++;
          }
        }
      }
      
      return { nullCount, futureCount, completeCount };
    }

    // Simple trading day compliance check (without async DB calls)
    function quickTradingDayCheck(priceHistory) {
      if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length === 0) {
        return { compliant: false, reason: 'Empty priceHistory' };
      }
      
      // Quick check: if all entries have valid OHLC data, consider it compliant
      const validEntries = priceHistory.filter(e => 
        e && e.open !== null && e.high !== null && e.low !== null && e.close !== null
      ).length;
      
      // Consider compliant if all non-future entries have data
      return { compliant: validEntries > 0 };
    }

    // ========================================
    // Process all trades in memory (FAST!)
    // ========================================
    const results = [];
    let skipCount = 0;
    let partialCount = 0;
    let newCount = 0;
    let invalidCount = 0;

    const processStartTime = Date.now();
    
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      const { position, modelName, ticker, purchaseDate } = trade;
      
      // Check position
      if (position !== 'long' && position !== 'short') {
        results.push({
          index: i,
          trade,
          status: 'invalid',
          reason: 'position must be "long" or "short"'
        });
        invalidCount++;
        continue;
      }
      
      // Check ticker exists (O(1) lookup)
      const tickerUpper = ticker?.toUpperCase();
      if (!symbolSet.has(tickerUpper)) {
        results.push({
          index: i,
          trade,
          status: 'invalid',
          reason: `Ticker ${ticker} not found in symbolCache`
        });
        invalidCount++;
        continue;
      }
      
      // Check date format (this is the recommendationDate from user input)
      if (!/^\d{4}-\d{2}-\d{2}/.test(purchaseDate)) {
        results.push({
          index: i,
          trade,
          status: 'invalid',
          reason: 'purchaseDate must be in YYYY-MM-DD format'
        });
        invalidCount++;
        continue;
      }

      // Use purchaseDate directly as recommendationDate for lookup
      // No date adjustment needed here - recommendationDate is stored as-is
      // The actual trading day (purchase_date) is calculated during save
      const recommendationDate = purchaseDate.split('T')[0];

      // Check existing trade (O(1) lookup) - use recommendationDate
      const lookupKey = `${position}|${modelName}|${ticker}|${recommendationDate}`;
      const existingTrade = tradesMap.get(lookupKey);
      
      if (!existingTrade) {
        // New trade - calculate how many D+N dates are in the past (need API calls)
        const { nullCount, futureCount } = countNullsInPriceHistory(null, recommendationDate);
        
        if (nullCount === 0) {
          // All D+N dates are in the future - no API calls needed yet
          results.push({
            index: i,
            trade,
            status: 'skip',
            nullCount: 0,
            futureCount,
            reason: `New trade but all D+1~D+14 are future dates - no API calls needed yet`
          });
          skipCount++;
        } else {
          results.push({
            index: i,
            trade,
            status: 'new',
            nullCount,
            futureCount,
            reason: `New trade - will fetch ${nullCount} past D+N prices (${futureCount} future dates skipped)`
          });
          newCount++;
        }
      } else {
        // Use existingTrade.purchaseDate for accurate D+N date calculation
        const { nullCount, futureCount } = countNullsInPriceHistory(
          existingTrade.priceHistory, 
          existingTrade.purchaseDate || existingTrade.recommendationDate
        );
        const tradingDayCheck = quickTradingDayCheck(existingTrade.priceHistory);
        
        if (nullCount === 0) {
          // No past dates need API calls - either complete or all remaining are future
          results.push({
            index: i,
            trade,
            status: 'skip',
            nullCount: 0,
            futureCount,
            reason: futureCount > 0 
              ? `Data complete for past dates - ${futureCount} future dates pending`
              : 'Already complete - no API calls needed',
            existingData: {
              currentPrice: existingTrade.currentPrice,
              priceHistory: existingTrade.priceHistory
            }
          });
          skipCount++;
        } else {
          // Partial update needed for past dates only
          results.push({
            index: i,
            trade,
            status: 'partial',
            nullCount,
            futureCount,
            reason: `Needs ${nullCount} past D+N updates (${futureCount} future dates skipped)`
          });
          partialCount++;
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const processTime = Date.now() - processStartTime;
    
    console.log(`[check] ✅ Completed: ${skipCount} skip, ${partialCount} partial, ${newCount} new, ${invalidCount} invalid`);
    console.log(`[check] ⚡ Performance: ${totalTime}ms total (${processTime}ms processing ${trades.length} trades)`);

    return res.status(200).json({
      results,
      summary: {
        total: trades.length,
        skip: skipCount,
        partial: partialCount,
        new: newCount,
        invalid: invalidCount,
        estimatedApiCalls: (newCount * 14) + results.filter(r => r.status === 'partial').reduce((sum, r) => sum + r.nullCount, 0)
      },
      performance: {
        totalMs: totalTime,
        processMs: processTime,
        tradesPerSecond: Math.round(trades.length / (processTime / 1000))
      }
    });

  } catch (error) {
    console.error('[priceTracker/check] Error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }
    });
  }
}

export default priceTrackerHandler;

