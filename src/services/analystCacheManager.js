// Analyst cache management service
// Manages analystLog.json and analystRating.json

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { getSymbolCache } from './cacheManager.js';
import { fetchApi } from './fmpClient.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const ANALYST_LOG_PATH = join(PROJECT_ROOT, 'docs', 'analystLog.json');
const ANALYST_RATING_PATH = join(PROJECT_ROOT, 'docs', 'analystRating.json');

// D+N horizons for price trend tracking
const PRICE_TREND_HORIZONS = [1, 2, 3, 4, 5, 6, 7, 14, 30, 60, 180, 365];

/**
 * Fetch price for a specific date using getLastPrice API
 * @param {string} ticker - Stock ticker symbol
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @param {object} apiConfig - API configuration
 * @param {string} fmpApiKey - FMP API key
 * @returns {Promise<number|null>} Closing price or null if unavailable
 */
async function fetchPriceForDate(ticker, fromDate, toDate, apiConfig, fmpApiKey) {
  try {
    const url = buildApiUrl(apiConfig.API, { ticker, fromDate, toDate, fmpApiKey });
    const result = await fetchApi(url, apiConfig.id);

    if (result.success && result.data && result.data.historical && result.data.historical.length > 0) {
      // Return the close price of the most recent date in the range
      const priceData = result.data.historical[result.data.historical.length - 1];
      return priceData.close || null;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${ticker} on ${fromDate}: ${error.message}`);
    return null;
  }
}

/**
 * Calculate priceTrend for an analyst record
 * Only fetches prices for null values in existing priceTrend
 * @param {object} analystRecord - Analyst record with publishedDate
 * @param {object} existingPriceTrend - Existing priceTrend object (or null/undefined)
 * @param {object} apiConfig - getLastPrice API configuration
 * @param {string} fmpApiKey - FMP API key
 * @returns {Promise<object>} priceTrend object with D1-D365 prices
 */
async function calculatePriceTrend(analystRecord, existingPriceTrend, apiConfig, fmpApiKey) {
  const priceTrend = existingPriceTrend || {};
  const publishedDate = new Date(analystRecord.publishedDate);
  const ticker = analystRecord.symbol || analystRecord.ticker;

  // Fetch prices only for null or missing horizons
  for (const horizon of PRICE_TREND_HORIZONS) {
    const key = `D${horizon}`;

    // Skip if price already exists and is not null
    if (priceTrend[key] !== null && priceTrend[key] !== undefined) {
      continue;
    }

    // Calculate target date (publishedDate + horizon days)
    const targetDate = new Date(publishedDate);
    targetDate.setUTCDate(targetDate.getUTCDate() + horizon);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Fetch price (with 7-day window to handle market closures)
    const windowStart = targetDateStr;
    const windowEnd = new Date(targetDate);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);
    const windowEndStr = windowEnd.toISOString().split('T')[0];

    const price = await fetchPriceForDate(ticker, windowStart, windowEndStr, apiConfig, fmpApiKey);
    priceTrend[key] = price;

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return priceTrend;
}

/**
 * Load analyst log cache
 * @returns {Promise<object>} Analyst log data
 */
export async function loadAnalystLog() {
  try {
    const content = await readFile(ANALYST_LOG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      meta: {
        lastUpdated: null,
        tickerCount: 0,
        totalAnalysts: 0,
        errors: 0
      },
      analysts: {} // { ticker: [analyst records] }
    };
  }
}

/**
 * Save analyst log cache
 * @param {object} analystLog - Analyst log data
 */
async function saveAnalystLog(analystLog) {
  await writeFile(ANALYST_LOG_PATH, JSON.stringify(analystLog, null, 2));
}

/**
 * Step 1: Refresh price target data from API
 * Fetches getEachPriceTargetConsensus and merges with existing data
 *
 * @param {object} options - Options for refresh
 * @param {boolean} options.testMode - If true, only process top 10 tickers
 * @param {string[]} options.tickers - Array of specific ticker symbols to process
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function refreshPriceTarget(options = {}) {
  console.log('[Step 1] Refreshing price target data...');
  const startTime = Date.now();

  const { symbols } = await getSymbolCache();
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();

  // Load existing analyst log
  const existingLog = await loadAnalystLog();
  const existingAnalysts = existingLog.analysts || {};

  // Determine which tickers to process
  let tickersToProcess;
  if (options.tickers && options.tickers.length > 0) {
    tickersToProcess = symbols.filter(s => options.tickers.includes(s.ticker));
    console.log(`Processing ${tickersToProcess.length} selected tickers: ${options.tickers.join(', ')}`);
  } else if (options.testMode) {
    tickersToProcess = symbols.slice(0, 10);
    console.log(`Processing ${tickersToProcess.length} tickers (TEST MODE - top 10)`);
  } else {
    tickersToProcess = symbols;
    console.log(`Processing ${tickersToProcess.length} tickers (all)`);
  }

  // Start with existing analyst data
  const analystData = { ...existingAnalysts };
  const errors = [];
  let processedCount = 0;
  let newRecordsCount = 0;

  const BATCH_SIZE = 3;
  const BATCH_DELAY_MS = 1000;

  for (let i = 0; i < tickersToProcess.length; i += BATCH_SIZE) {
    const batch = tickersToProcess.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (symbol) => {
      const ticker = symbol.ticker;

      try {
        const config = apiList.getQualativeValuation.getEachPriceTargetConsensus['service-FMP'];
        const url = buildApiUrl(config.API, { ticker, fmpApiKey });
        const result = await fetchApi(url, config.id);

        if (result.success && result.data && result.data.length > 0) {
          const newRecords = result.data;
          const existingRecords = existingAnalysts[ticker] || [];

          // Merge: keep existing, add only new based on publishedDate
          const mergedRecords = [...existingRecords];
          const existingDates = new Set(existingRecords.map(r => r.publishedDate));

          for (const newRecord of newRecords) {
            if (!existingDates.has(newRecord.publishedDate)) {
              mergedRecords.push(newRecord);
              newRecordsCount++;
            }
          }

          analystData[ticker] = mergedRecords;
        } else if (result.error) {
          errors.push({ ticker, error: result.error });
        }
      } catch (error) {
        errors.push({
          ticker,
          error: {
            serviceId: 'price-target-refresh',
            errorMessage: error.message,
            timestamp: getCurrentTimestampISO()
          }
        });
      }
    });

    await Promise.all(batchPromises);
    processedCount += batch.length;

    if (processedCount % 10 === 0 || processedCount === tickersToProcess.length) {
      const percentage = Math.round(processedCount / tickersToProcess.length * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Price Target] ${processedCount}/${tickersToProcess.length} (${percentage}%) - New records: ${newRecordsCount}`);
    }

    if (i + BATCH_SIZE < tickersToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const analystLog = {
    meta: {
      lastUpdated: getCurrentTimestampISO(),
      tickerCount: Object.keys(analystData).length,
      totalAnalysts: Object.values(analystData).reduce((sum, records) => sum + records.length, 0),
      processedTickers: tickersToProcess.map(s => s.ticker),
      processedTickerCount: tickersToProcess.length,
      newRecords: newRecordsCount,
      errors: errors.length,
      duration: `${Date.now() - startTime}ms`,
      step: 'priceTarget'
    },
    analysts: analystData,
    errors: errors.slice(0, 100)
  };

  await saveAnalystLog(analystLog);

  console.log(`[Price Target] Completed in ${analystLog.meta.duration}`);
  console.log(`- New records added: ${newRecordsCount}`);
  console.log(`- Total tickers in cache: ${analystLog.meta.tickerCount}`);

  return { success: true, meta: analystLog.meta };
}

/**
 * Step 2: Initialize priceTrend frame for all records
 * Adds priceTrend structure (all null) to records that don't have it
 *
 * @param {object} options - Options
 * @param {string[]} options.tickers - Array of specific ticker symbols to process
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function initializePriceTrendFrame(options = {}) {
  console.log('[Step 2] Initializing priceTrend frames...');
  const startTime = Date.now();

  const existingLog = await loadAnalystLog();
  const analystData = existingLog.analysts || {};

  let tickersToProcess = Object.keys(analystData);
  if (options.tickers && options.tickers.length > 0) {
    tickersToProcess = tickersToProcess.filter(t => options.tickers.includes(t));
    console.log(`Processing ${tickersToProcess.length} selected tickers: ${options.tickers.join(', ')}`);
  } else {
    console.log(`Processing all ${tickersToProcess.length} tickers`);
  }

  let framesAdded = 0;
  let recordsProcessed = 0;

  for (const ticker of tickersToProcess) {
    const records = analystData[ticker] || [];

    for (const record of records) {
      recordsProcessed++;

      if (!record.priceTrend) {
        // Initialize empty priceTrend structure
        record.priceTrend = {};
        PRICE_TREND_HORIZONS.forEach(h => {
          record.priceTrend[`D${h}`] = null;
        });
        framesAdded++;
      }
    }
  }

  const analystLog = {
    meta: {
      lastUpdated: getCurrentTimestampISO(),
      tickerCount: Object.keys(analystData).length,
      totalAnalysts: Object.values(analystData).reduce((sum, records) => sum + records.length, 0),
      processedTickers: tickersToProcess,
      recordsProcessed,
      framesAdded,
      duration: `${Date.now() - startTime}ms`,
      step: 'initFrame'
    },
    analysts: analystData,
    errors: existingLog.errors || []
  };

  await saveAnalystLog(analystLog);

  console.log(`[Frame Init] Completed in ${analystLog.meta.duration}`);
  console.log(`- Records processed: ${recordsProcessed}`);
  console.log(`- Frames added: ${framesAdded}`);

  return { success: true, meta: analystLog.meta };
}

/**
 * Step 3: Fill null priceTrend values with API quotes
 * Only fetches prices for null values in priceTrend
 *
 * @param {object} options - Options
 * @param {string[]} options.tickers - Array of specific ticker symbols to process
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function fillPriceTrendQuotes(options = {}) {
  console.log('[Step 3] Filling priceTrend quotes...');
  const startTime = Date.now();

  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  const priceApiConfig = apiList.getQuantitiveValuation.getLastPrice['service-FMP'];

  const existingLog = await loadAnalystLog();
  const analystData = existingLog.analysts || {};

  let tickersToProcess = Object.keys(analystData);
  if (options.tickers && options.tickers.length > 0) {
    tickersToProcess = tickersToProcess.filter(t => options.tickers.includes(t));
    console.log(`Processing ${tickersToProcess.length} selected tickers: ${options.tickers.join(', ')}`);
  } else {
    console.log(`Processing all ${tickersToProcess.length} tickers`);
  }

  let quotesUpdated = 0;
  let recordsProcessed = 0;
  const errors = [];

  for (const ticker of tickersToProcess) {
    const records = analystData[ticker] || [];

    for (const record of records) {
      recordsProcessed++;

      if (!record.priceTrend) {
        console.warn(`Record ${ticker} ${record.publishedDate} missing priceTrend - skipping`);
        continue;
      }

      try {
        // Calculate priceTrend (only updates null values)
        const updatedPriceTrend = await calculatePriceTrend(
          record,
          record.priceTrend,
          priceApiConfig,
          fmpApiKey
        );

        // Count updates
        const hasUpdates = PRICE_TREND_HORIZONS.some(h => {
          const key = `D${h}`;
          return record.priceTrend[key] === null && updatedPriceTrend[key] !== null;
        });

        if (hasUpdates) {
          quotesUpdated++;
        }

        record.priceTrend = updatedPriceTrend;

        // Progress logging every 10 records
        if (recordsProcessed % 10 === 0) {
          console.log(`[Quote Fill] Processed ${recordsProcessed} records, ${quotesUpdated} updated`);
        }

      } catch (error) {
        errors.push({
          ticker,
          publishedDate: record.publishedDate,
          error: error.message
        });
      }
    }
  }

  const analystLog = {
    meta: {
      lastUpdated: getCurrentTimestampISO(),
      tickerCount: Object.keys(analystData).length,
      totalAnalysts: Object.values(analystData).reduce((sum, records) => sum + records.length, 0),
      processedTickers: tickersToProcess,
      recordsProcessed,
      quotesUpdated,
      errors: errors.length,
      duration: `${Date.now() - startTime}ms`,
      step: 'fillQuotes'
    },
    analysts: analystData,
    errors: errors.slice(0, 100)
  };

  await saveAnalystLog(analystLog);

  console.log(`[Quote Fill] Completed in ${analystLog.meta.duration}`);
  console.log(`- Records processed: ${recordsProcessed}`);
  console.log(`- Quotes updated: ${quotesUpdated}`);

  return { success: true, meta: analystLog.meta };
}

/**
 * Refresh analyst log for all tickers in symbol cache
 * Orchestrates all three steps based on options
 *
 * @param {object} options - Options for refresh
 * @param {boolean} options.testMode - If true, only process top 10 tickers
 * @param {string[]} options.tickers - Array of specific ticker symbols to process
 * @param {boolean} options.priceTarget - If true, run step 1 (price target refresh)
 * @param {boolean} options.frame - If true, run step 2 (frame initialization)
 * @param {boolean} options.quote - If true, run step 3 (quote filling)
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function refreshAnalystLog(options = {}) {
  console.log('Starting analyst log refresh orchestrator...');
  const results = [];

  // Step 1: Price Target (if requested)
  if (options.priceTarget) {
    const result = await refreshPriceTarget(options);
    results.push({ step: 'priceTarget', ...result });
  }

  // Step 2: Frame Initialization (if requested)
  if (options.frame) {
    const result = await initializePriceTrendFrame(options);
    results.push({ step: 'frame', ...result });
  }

  // Step 3: Quote Filling (if requested)
  if (options.quote) {
    const result = await fillPriceTrendQuotes(options);
    results.push({ step: 'quote', ...result });
  }

  // If no specific steps requested, run all three
  if (!options.priceTarget && !options.frame && !options.quote) {
    console.log('No specific steps requested - running all three steps');

    const step1 = await refreshPriceTarget(options);
    results.push({ step: 'priceTarget', ...step1 });

    const step2 = await initializePriceTrendFrame(options);
    results.push({ step: 'frame', ...step2 });

    const step3 = await fillPriceTrendQuotes(options);
    results.push({ step: 'quote', ...step3 });
  }

  console.log('Analyst log refresh orchestrator completed');
  console.log(`- Steps executed: ${results.map(r => r.step).join(', ')}`);

  return {
    success: true,
    steps: results
  };
}

/**
 * Load analyst rating cache
 * @returns {Promise<object>} Analyst rating data
 */
export async function loadAnalystRating() {
  try {
    const content = await readFile(ANALYST_RATING_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      meta: {
        lastUpdated: null,
        analystCount: 0
      },
      analysts: {} // { analystName: { rating data } }
    };
  }
}

/**
 * Calculate statistics (mean, std, count) for an array of numbers, excluding null/undefined
 * Includes confidence metrics: standard error (SE) and 95% confidence interval (CI)
 *
 * @param {number[]} values - Array of numeric values
 * @returns {object} { mean, std, count, se, ci95Lower, ci95Upper, ci95Width }
 */
function calculateStats(values) {
  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  const count = validValues.length;

  if (count === 0) {
    return {
      mean: null,
      std: null,
      count: 0,
      se: null,
      ci95Lower: null,
      ci95Upper: null,
      ci95Width: null
    };
  }

  const mean = validValues.reduce((sum, v) => sum + v, 0) / count;

  if (count === 1) {
    return {
      mean,
      std: 0,
      count,
      se: null,  // Cannot calculate SE with only 1 sample
      ci95Lower: null,
      ci95Upper: null,
      ci95Width: null
    };
  }

  const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
  const std = Math.sqrt(variance);

  // Standard Error (SE) = σ / √n
  const se = std / Math.sqrt(count);

  // 95% Confidence Interval ≈ mean ± 1.96 × SE (≈ 2 × SE for simplicity)
  // Using 1.96 for more accuracy (z-score for 95% CI)
  const margin = 1.96 * se;
  const ci95Lower = mean - margin;
  const ci95Upper = mean + margin;
  const ci95Width = 2 * margin;  // Total width of CI

  return {
    mean,
    std,
    count,
    se,
    ci95Lower,
    ci95Upper,
    ci95Width
  };
}

/**
 * Calculate quantiles from an array of numbers
 * @param {number[]} sortedValues - Sorted array of numbers
 * @param {number} q - Quantile (0-1)
 * @returns {number|null} Quantile value
 */
function calculateQuantile(sortedValues, q) {
  if (sortedValues.length === 0) return null;
  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Generate analyst rating from analyst log
 * Calculates D+N gap rates for each unique analyst (analystName + analystCompany combination)
 *
 * Gap Rate Definition:
 *   gapRate(D+N) = (D+N price / priceWhenPosted) - 1
 *
 * For each analyst:
 *   - Collects all gapRate values for each D+N horizon across all their price targets
 *   - Calculates mean, std, count for each horizon (excluding null values)
 *   - Calculates timeToTarget statistics (days until price target is reached)
 *
 * @returns {Promise<object>} Result with success status
 */
export async function generateAnalystRating() {
  console.log('Starting analyst rating generation...');
  const startTime = Date.now();

  const analystLog = await loadAnalystLog();

  if (!analystLog.analysts || Object.keys(analystLog.analysts).length === 0) {
    console.log('No analyst log data available. Please refresh analyst log first.');
    return {
      success: false,
      error: 'No analyst log data available'
    };
  }

  // Extract unique analysts by analystName + analystCompany combination
  const uniqueAnalysts = {};

  for (const ticker in analystLog.analysts) {
    const records = analystLog.analysts[ticker];

    for (const record of records) {
      const analystName = record.analystName || 'Unknown';
      const analystCompany = record.analystCompany || 'Unknown';
      const analystKey = `${analystName}|${analystCompany}`;

      if (!uniqueAnalysts[analystKey]) {
        uniqueAnalysts[analystKey] = {
          analystName,
          analystCompany,
          records: []
        };
      }

      // Only include records with valid priceWhenPosted and priceTrend
      if (record.priceWhenPosted && record.priceTrend) {
        uniqueAnalysts[analystKey].records.push({
          ticker: record.symbol || ticker,
          publishedDate: record.publishedDate,
          priceTarget: record.priceTarget,
          adjPriceTarget: record.adjPriceTarget,
          priceWhenPosted: record.priceWhenPosted,
          priceTrend: record.priceTrend
        });
      }
    }
  }

  // Calculate gap rates for each analyst
  const analystRatings = {};

  for (const analystKey in uniqueAnalysts) {
    const analyst = uniqueAnalysts[analystKey];
    const { analystName, analystCompany, records } = analyst;

    // Collect gap rates for each D+N horizon
    const gapRatesByHorizon = {};
    PRICE_TREND_HORIZONS.forEach(h => {
      gapRatesByHorizon[`D${h}`] = [];
    });

    // Collect timeToTarget data
    const timeToTargetData = [];

    for (const record of records) {
      const { priceWhenPosted, priceTarget, priceTrend } = record;

      // Calculate gap rates for each horizon
      for (const horizon of PRICE_TREND_HORIZONS) {
        const key = `D${horizon}`;
        const priceAtHorizon = priceTrend[key];

        if (priceAtHorizon !== null && priceAtHorizon !== undefined && priceWhenPosted > 0) {
          const gapRate = (priceAtHorizon / priceWhenPosted) - 1;
          gapRatesByHorizon[key].push(gapRate);
        }
      }

      // Calculate timeToTarget (first time price reaches target)
      if (priceTarget && priceWhenPosted > 0) {
        let targetReached = false;
        for (const horizon of PRICE_TREND_HORIZONS) {
          const key = `D${horizon}`;
          const priceAtHorizon = priceTrend[key];

          if (priceAtHorizon !== null && priceAtHorizon !== undefined) {
            // Check if target is reached (within 2% tolerance)
            const targetRatio = priceAtHorizon / priceTarget;
            if (targetRatio >= 0.98 && targetRatio <= 1.02) {
              timeToTargetData.push({
                daysToTarget: horizon,
                targetPrice: priceTarget,
                actualPrice: priceAtHorizon,
                accuracy: targetRatio
              });
              targetReached = true;
              break;
            }
          }
        }

        // If target not reached, record as null
        if (!targetReached) {
          timeToTargetData.push({
            daysToTarget: null,
            targetPrice: priceTarget,
            actualPrice: null,
            accuracy: null
          });
        }
      }
    }

    // Calculate statistics for each horizon
    const gapRates = {};
    for (const horizon of PRICE_TREND_HORIZONS) {
      const key = `D${horizon}`;
      const values = gapRatesByHorizon[key];
      const stats = calculateStats(values);

      gapRates[key] = {
        meanGapRate: stats.mean,
        stdGapRate: stats.std,
        count: stats.count,
        // Statistical confidence metrics
        standardError: stats.se,
        ci95Lower: stats.ci95Lower,
        ci95Upper: stats.ci95Upper,
        ci95Width: stats.ci95Width
      };
    }

    // Calculate timeToTarget statistics
    const validTimeToTarget = timeToTargetData
      .map(d => d.daysToTarget)
      .filter(d => d !== null);

    const sortedTTT = [...validTimeToTarget].sort((a, b) => a - b);
    const timeToTargetStats = calculateStats(validTimeToTarget);

    const timeToTarget = {
      mean: timeToTargetStats.mean,
      median: sortedTTT.length > 0 ? calculateQuantile(sortedTTT, 0.5) : null,
      q25: sortedTTT.length > 0 ? calculateQuantile(sortedTTT, 0.25) : null,
      q75: sortedTTT.length > 0 ? calculateQuantile(sortedTTT, 0.75) : null,
      min: sortedTTT.length > 0 ? sortedTTT[0] : null,
      max: sortedTTT.length > 0 ? sortedTTT[sortedTTT.length - 1] : null,
      targetReachedCount: validTimeToTarget.length,
      totalTargets: timeToTargetData.length,
      reachedRatio: timeToTargetData.length > 0 ? validTimeToTarget.length / timeToTargetData.length : null
    };

    // Calculate overall accuracy metrics
    const accuracyValues = timeToTargetData
      .map(d => d.accuracy)
      .filter(a => a !== null);
    const accuracyStats = calculateStats(accuracyValues);

    analystRatings[analystKey] = {
      analystName,
      analystCompany,
      priceTargetCount: records.length,
      gapRates,
      timeToTarget,
      accuracy: {
        mean: accuracyStats.mean,
        std: accuracyStats.std,
        count: accuracyStats.count
      }
    };
  }

  const analystRating = {
    meta: {
      lastUpdated: getCurrentTimestampISO(),
      analystCount: Object.keys(analystRatings).length,
      sourceLogDate: analystLog.meta.lastUpdated,
      horizons: PRICE_TREND_HORIZONS,
      description: 'Gap rate = (D+N price / priceWhenPosted) - 1. Statistics exclude null values.',
      duration: `${Date.now() - startTime}ms`
    },
    analysts: analystRatings
  };

  await writeFile(ANALYST_RATING_PATH, JSON.stringify(analystRating, null, 2));

  console.log(`Analyst rating generation completed in ${analystRating.meta.duration}`);
  console.log(`- Unique analysts: ${analystRating.meta.analystCount}`);
  console.log(`- Price trend horizons: ${PRICE_TREND_HORIZONS.join(', ')}`);

  return {
    success: true,
    meta: analystRating.meta
  };
}

export default {
  loadAnalystLog,
  refreshAnalystLog,
  loadAnalystRating,
  generateAnalystRating
};
