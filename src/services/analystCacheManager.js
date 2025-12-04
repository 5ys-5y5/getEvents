// Analyst cache management service
// Manages analyst data in Supabase database

import { supabase } from '../config/supabase.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { getSymbolCache } from './dbManager.js';
import { fetchApi, getAdaptiveBatchSettings, getCurrentRateUsage, notifyBatchComplete, resetAdaptiveController } from './fmpClient.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';
import { DB_LIMITS, BATCH, TABLES, PRICE_TREND, RATE_LIMIT } from '../config/appConfig.js';
import { getNthTradingDay, setHolidaysCache } from '../lib/tradingCalendar.js';
import { loadHolidaysFromDB } from './tradingDayService.js';
import { format, parseISO } from 'date-fns';

// D+N horizons for price trend tracking (from config)
const PRICE_TREND_HORIZONS = PRICE_TREND.HORIZONS;

// fetchPriceForDate function REMOVED
// Now using single range API call in calculatePriceTrend instead of multiple individual calls

/**
 * Calculate priceTrend for an analyst record (OPTIMIZED - SINGLE API CALL)
 * Only fetches prices for null values in existing priceTrend
 * ⚡ Uses SINGLE range API call (from earliest to latest target date)
 *
 * @param {object} analystRecord - Analyst record with publishedDate
 * @param {object} existingPriceTrend - Existing priceTrend object (or null/undefined)
 * @param {object} apiConfig - getLastPrice API configuration
 * @param {string} fmpApiKey - FMP API key
 * @returns {Promise<object>} priceTrend object with D1-D365 prices
 *
 * @example
 * // publishedDate: 2022-05-11
 * // Horizons: D1, D2, ..., D365
 * // Earliest target: 2022-05-12 (D1)
 * // Latest target: 2023-05-11 (D365)
 * // API call: from=2022-05-12&to=2023-05-11 (single call for all horizons!)
 */
async function calculatePriceTrend(analystRecord, existingPriceTrend, apiConfig, fmpApiKey) {
  const priceTrend = existingPriceTrend || {};
  const publishedDate = new Date(analystRecord.publishedDate);
  const ticker = analystRecord.ticker || analystRecord.symbol;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to start of day

  // ============================================
  // STEP 1: Collect horizons that need fetching
  // ============================================
  const horizonsToFetch = [];
  let earliestDate = null;
  let latestDate = null;

  for (const horizon of PRICE_TREND_HORIZONS) {
    const key = `D${horizon}`;

    // Skip if price already exists and is not null
    if (priceTrend[key] !== null && priceTrend[key] !== undefined) {
      continue;
    }

    // Calculate target date (publishedDate + horizon days)
    const targetDate = new Date(publishedDate);
    targetDate.setUTCDate(targetDate.getUTCDate() + horizon);

    // Skip if target date is in the future (no price data available)
    if (targetDate > today) {
      continue;
    }

    const targetDateStr = targetDate.toISOString().split('T')[0];

    horizonsToFetch.push({
      horizon,
      key,
      targetDate: targetDateStr,
      targetDateObj: targetDate
    });

    // Track earliest and latest target dates for range query
    if (!earliestDate || targetDate < new Date(earliestDate)) {
      earliestDate = targetDateStr;
    }
    if (!latestDate || targetDate > new Date(latestDate)) {
      latestDate = targetDateStr;
    }
  }

  // If nothing to fetch, return early
  if (horizonsToFetch.length === 0) {
    return priceTrend;
  }

  // ============================================
  // STEP 2: SINGLE API CALL for entire range
  // ============================================
  // from: earliestDate (e.g., 2022-05-12 for D1)
  // to: latestDate (e.g., 2023-05-11 for D365)
  // → Returns ALL prices in the range in one call!

  // Add 7-day buffer to latestDate for fallback logic
  const latestDateWithBuffer = new Date(latestDate);
  latestDateWithBuffer.setUTCDate(latestDateWithBuffer.getUTCDate() + 7);
  const latestDateWithBufferStr = latestDateWithBuffer.toISOString().split('T')[0];

  const url = buildApiUrl(apiConfig.API, {
    ticker,
    fromDate: earliestDate,
    toDate: latestDateWithBufferStr,
    fmpApiKey
  });

  const result = await fetchApi(url, apiConfig.id);

  if (!result.success || !result.data || !result.data.historical || !Array.isArray(result.data.historical)) {
    console.error(`Failed to fetch price range for ${ticker} from ${earliestDate} to ${latestDateWithBufferStr}`);
    // Return existing priceTrend with nulls for missing horizons
    for (const { key } of horizonsToFetch) {
      if (priceTrend[key] === undefined) {
        priceTrend[key] = null;
      }
    }
    return priceTrend;
  }

  // ============================================
  // STEP 3: Build price lookup map (date → price data)
  // ============================================
  const priceMap = new Map();
  for (const dayData of result.data.historical) {
    if (dayData.date && dayData.close !== null && dayData.close !== undefined) {
      priceMap.set(dayData.date, {
        open: dayData.open,
        high: dayData.high,
        low: dayData.low,
        close: dayData.close
      });
    }
  }

  // ============================================
  // STEP 4: Match horizons to price data (with fallback)
  // ============================================
  for (const { horizon, key, targetDate, targetDateObj } of horizonsToFetch) {
    // Try exact match first
    let priceData = priceMap.get(targetDate);

    // Fallback: Search backwards up to 7 days for nearest trading day
    if (!priceData) {
      for (let offset = 1; offset <= 7; offset++) {
        const fallbackDate = new Date(targetDateObj);
        fallbackDate.setUTCDate(fallbackDate.getUTCDate() - offset);
        const fallbackDateStr = fallbackDate.toISOString().split('T')[0];

        priceData = priceMap.get(fallbackDateStr);
        if (priceData) {
          // Found fallback data
          break;
        }
      }
    }

    // Store result (close price only for backward compatibility)
    priceTrend[key] = priceData ? priceData.close : null;
  }

  return priceTrend;
}

/**
 * Load analyst log from database (with pagination to bypass Supabase 1000-row limit)
 * @param {string[]} tickers - Optional array of tickers to filter
 * @returns {Promise<object>} Analyst log data
 */
export async function loadAnalystLog(tickers = null) {
  try {
    // Check if Supabase is available
    if (!supabase) {
      console.error('[loadAnalystLog] Supabase client not initialized');
      return {
        meta: { lastUpdated: null, tickerCount: 0, totalAnalysts: 0, errors: 0 },
        analysts: {}
      };
    }

    const pageSize = 1000; // Supabase 최대 행 수 우회용 페이지 크기
    let offset = 0;
    let allRows = [];

    // 페이지네이션 루프
    // Supabase는 limit를 크게 줘도 1000행으로 제한될 수 있으므로 range() 사용
    /* eslint-disable no-constant-condition */
    while (true) {
      let query = supabase
        .from(TABLES.ANALYST_RECORDS)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (tickers && tickers.length > 0) {
        query = query.in('ticker', tickers);  // Filter by ticker column (matches DB schema)
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[loadAnalystLog] DB error on range ${offset}-${offset + pageSize - 1}: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows = allRows.concat(data);

      if (data.length < pageSize || allRows.length >= DB_LIMITS.ANALYST_RECORDS) {
        // 마지막 페이지거나 앱 설정 상 한도에 도달
        break;
      }

      offset += pageSize;
    }
    /* eslint-enable no-constant-condition */

    if (allRows.length === 0) {
      console.log('[loadAnalystLog] No analyst_records rows found in database');
      return {
        meta: { lastUpdated: null, tickerCount: 0, totalAnalysts: 0, errors: 0 },
        analysts: {}
      };
    }

    // Group records by ticker
    const analysts = {};
    for (const record of allRows) {
      const ticker = record.ticker;
      if (!ticker) continue;

      if (!analysts[ticker]) {
        analysts[ticker] = [];
      }
      analysts[ticker].push({
        symbol: ticker,
        ticker: ticker,
        publishedDate: record.published_date,
        newsURL: record.news_url,
        newsTitle: record.news_title,
        analystName: record.analyst_name,
        priceTarget: record.price_target,
        adjPriceTarget: record.adj_price_target,
        priceWhenPosted: record.price_when_posted,
        newsPublisher: record.news_publisher,
        newsBaseURL: record.news_base_url,
        analystCompany: record.analyst_company,
        priceTrend: record.price_trend
      });
    }

    if (tickers && tickers.length > 0) {
      console.log(`[loadAnalystLog] Loaded ${Object.keys(analysts).length} tickers (filtered: ${tickers.join(',')}) from database (rows: ${allRows.length})`);
    } else {
      console.log(`[loadAnalystLog] Loaded ${Object.keys(analysts).length} tickers from database (rows: ${allRows.length})`);
    }
    return {
      meta: {
        lastUpdated: getCurrentTimestampISO(),
        tickerCount: Object.keys(analysts).length,
        totalAnalysts: allRows.length,
        errors: 0
      },
      analysts
    };
  } catch (error) {
    console.error(`[loadAnalystLog] Failed to load: ${error.message}`);
    return {
      meta: { lastUpdated: null, tickerCount: 0, totalAnalysts: 0, errors: 0 },
      analysts: {}
    };
  }
}

/**
 * Save analyst log to database
 * @param {object} analystLog - Analyst log data with analysts object
 * @returns {Promise<{success: boolean, savedCount: number, errorCount: number, errors: string[]}>}
 */
async function saveAnalystLog(analystLog) {
  // Check Supabase connection
  if (!supabase) {
    console.error('[saveAnalystLog] ERROR: Supabase client not initialized');
    console.error('[saveAnalystLog] Cannot save analyst records to database');
    return { success: false, savedCount: 0, errorCount: 1, errors: ['Supabase client not initialized'] };
  }

  const analysts = analystLog.analysts || {};
  const uniqueMap = new Map();
  let skippedMissingName = 0;

  // 평면 레코드 + 중복 제거 (ticker, published_date, analyst_name 기준)
  for (const [ticker, tickerRecords] of Object.entries(analysts)) {
    for (const record of tickerRecords) {
      const tickerValue = record.ticker || ticker;
      const publishedDate = record.publishedDate;
      const analystName = record.analystName;

      // DB 제약 조건: analyst_name NOT NULL → 이름이 없는 레코드는 저장하지 않음
      if (!tickerValue || !publishedDate || !analystName) {
        skippedMissingName++;
        continue;
      }

      const key = `${tickerValue}|${publishedDate}|${analystName}`;
      uniqueMap.set(key, {
        ticker: tickerValue,
        published_date: publishedDate,
        news_url: record.newsURL,
        news_title: record.newsTitle,
        analyst_name: analystName,
        price_target: record.priceTarget,
        adj_price_target: record.adjPriceTarget,
        price_when_posted: record.priceWhenPosted,
        news_publisher: record.newsPublisher,
        news_base_url: record.newsBaseURL,
        analyst_company: record.analystCompany,
        price_trend: record.priceTrend
      });
    }
  }

  const records = Array.from(uniqueMap.values());

  if (records.length === 0) {
    console.log('[saveAnalystLog] No records to save (after filtering)');
    if (skippedMissingName > 0) {
      console.log(`[saveAnalystLog] Skipped ${skippedMissingName} records with missing analyst_name or keys`);
    }
    return { success: true, savedCount: 0, errorCount: 0, errors: [] };
  }

  if (skippedMissingName > 0) {
    console.log(`[saveAnalystLog] Skipped ${skippedMissingName} records with missing analyst_name or keys before upsert`);
  }

  // Upsert in batches with detailed error tracking
  const batchSize = BATCH.DB_UPSERT_BATCH_SIZE;
  let successBatchCount = 0;
  let errorBatchCount = 0;
  const batchErrors = [];

  console.log(`[saveAnalystLog] Starting upsert of ${records.length} records in batches of ${batchSize}...`);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(records.length / batchSize);

    try {
      const { data, error } = await supabase
        .from(TABLES.ANALYST_RECORDS)
        .upsert(batch, { onConflict: 'ticker,published_date,analyst_name' })
        .select('ticker');

      if (error) {
        errorBatchCount++;
        const errorMsg = `Batch ${batchNum}/${totalBatches}: ${error.message} (code: ${error.code || 'unknown'})`;
        console.error(`[saveAnalystLog] ERROR - ${errorMsg}`);
        batchErrors.push(errorMsg);

        // 첫 번째 배치 에러인 경우, 더 자세한 정보 로깅
        if (errorBatchCount === 1) {
          console.error(`[saveAnalystLog] First error details:`, JSON.stringify({
            table: TABLES.ANALYST_RECORDS,
            batchSize: batch.length,
            sampleRecord: batch[0],
            errorDetails: error
          }, null, 2));
        }
      } else {
        successBatchCount++;
        // 처음, 중간, 마지막 배치만 로깅
        if (batchNum === 1 || batchNum === totalBatches || batchNum % 10 === 0) {
          console.log(`[saveAnalystLog] Batch ${batchNum}/${totalBatches} saved successfully (${batch.length} records)`);
        }
      }
    } catch (err) {
      errorBatchCount++;
      const errorMsg = `Batch ${batchNum}/${totalBatches}: Unexpected error - ${err.message}`;
      console.error(`[saveAnalystLog] EXCEPTION - ${errorMsg}`);
      batchErrors.push(errorMsg);
    }
  }

  const totalBatches = Math.ceil(records.length / batchSize);
  const estimatedSaved = successBatchCount * batchSize;
  const actualSaved = Math.min(estimatedSaved, records.length);

  console.log(`[saveAnalystLog] Upsert completed:`);
  console.log(`  - Total records: ${records.length}`);
  console.log(`  - Successful batches: ${successBatchCount}/${totalBatches}`);
  console.log(`  - Failed batches: ${errorBatchCount}/${totalBatches}`);
  console.log(`  - Estimated saved: ~${actualSaved} records`);

  if (batchErrors.length > 0) {
    console.error(`[saveAnalystLog] Errors encountered:`, batchErrors.slice(0, 5));
  }

  // 저장 후 검증: 최근 저장된 레코드 수 확인
  try {
    const { count, error: countError } = await supabase
      .from(TABLES.ANALYST_RECORDS)
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`[saveAnalystLog] Verification: Total records in DB table: ${count}`);
    } else {
      console.warn(`[saveAnalystLog] Could not verify record count: ${countError.message}`);
    }
  } catch (verifyErr) {
    console.warn(`[saveAnalystLog] Verification failed: ${verifyErr.message}`);
  }

  return {
    success: errorBatchCount === 0,
    savedCount: actualSaved,
    errorCount: errorBatchCount * batchSize,
    errors: batchErrors
  };
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

  console.log('[refreshPriceTarget] Calling getSymbolCache()...');
  const { symbols } = await getSymbolCache();
  console.log(`[refreshPriceTarget] Got ${symbols.length} symbols`);
  
  console.log('[refreshPriceTarget] Loading apiList...');
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  console.log('[refreshPriceTarget] apiList loaded');

  // Get API config for endpoint-specific settings
  const priceTargetConfig = apiList.getQualativeValuation.getEachPriceTargetConsensus['service-FMP'];
  
  // Reset adaptive controller for fresh start with endpoint-specific settings
  resetAdaptiveController(priceTargetConfig.id);

  // Load existing analyst log (only for specific tickers if provided)
  console.log('[refreshPriceTarget] Loading existing analyst log...');
  const tickersFilter = (options.tickers && options.tickers.length > 0) ? options.tickers : null;
  const existingLog = await loadAnalystLog(tickersFilter);
  const existingAnalysts = existingLog.analysts || {};
  console.log(`[refreshPriceTarget] Existing log has ${Object.keys(existingAnalysts).length} tickers`);

  // Determine which tickers to process
  let tickersToProcess;
  if (options.tickers && options.tickers.length > 0) {
    // First try to find tickers in symbol_cache
    tickersToProcess = symbols.filter(s => options.tickers.includes(s.ticker));
    
    // If some tickers are not in symbol_cache, create temporary entries for them
    const foundTickers = new Set(tickersToProcess.map(s => s.ticker));
    const missingTickers = options.tickers.filter(t => !foundTickers.has(t));
    
    if (missingTickers.length > 0) {
      console.log(`[Warning] ${missingTickers.length} tickers not in symbol_cache: ${missingTickers.join(', ')}`);
      console.log(`[Info] Adding missing tickers for API calls...`);
      // Add missing tickers as temporary entries
      for (const ticker of missingTickers) {
        tickersToProcess.push({ ticker, sector: 'Unknown', industry: 'Unknown' });
      }
    }
    
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

  // Throughput-based adaptive rate limiting
  let i = 0;
  while (i < tickersToProcess.length) {
    // Get adaptive settings based on real-time throughput measurement
    const adaptiveSettings = getAdaptiveBatchSettings();
    const batchSize = adaptiveSettings.batchSize;
    const delayMs = adaptiveSettings.delayMs;

    const batch = tickersToProcess.slice(i, i + batchSize);

    const batchPromises = batch.map(async (symbol) => {
      const ticker = symbol.ticker;

      try {
        const config = apiList.getQualativeValuation.getEachPriceTargetConsensus['service-FMP'];
        const url = buildApiUrl(config.API, { ticker, fmpApiKey });
        const result = await fetchApi(url, config.id);

        if (result.success && result.data && result.data.length > 0) {
          const newRecords = result.data;
          const existingRecords = existingAnalysts[ticker] || [];

          // Create a map of existing records with their priceTrend data
          // Key: publishedDate|analystName (matches DB unique constraint)
          const existingMap = new Map();
          for (const record of existingRecords) {
            const key = `${record.publishedDate}|${record.analystName}`;
            existingMap.set(key, record);
          }

          // Merge: API data takes priority, but preserve existing priceTrend
          const mergedRecords = [];
          const processedKeys = new Set();

          for (const newRecord of newRecords) {
            const key = `${newRecord.publishedDate}|${newRecord.analystName}`;
            const existingRecord = existingMap.get(key);

            // Helper function to create empty price data object (new format)
            const createEmptyPriceData = () => ({
              low: null,
              high: null,
              open: null,
              close: null,
              actualDate: null,
              targetDate: null
            });

            if (existingRecord) {
              // Update with API data but preserve priceTrend if it exists
              // If no priceTrend exists, initialize with empty frame (new format)
              let priceTrend = existingRecord.priceTrend || newRecord.priceTrend;
              if (!priceTrend) {
                priceTrend = {};
                PRICE_TREND_HORIZONS.forEach(h => {
                  priceTrend[`D${h}`] = createEmptyPriceData();
                });
              }
              mergedRecords.push({
                ...newRecord,
                priceTrend
              });
            } else {
              // New record from API - initialize with empty priceTrend frame (new format)
              const emptyPriceTrend = {};
              PRICE_TREND_HORIZONS.forEach(h => {
                emptyPriceTrend[`D${h}`] = createEmptyPriceData();
              });
              mergedRecords.push({
                ...newRecord,
                priceTrend: emptyPriceTrend
              });
              newRecordsCount++;
            }
            processedKeys.add(key);
          }

          // Add existing records that are not in API response (keep old data)
          // Also ensure priceTrend frame exists for all records
          for (const record of existingRecords) {
            const key = `${record.publishedDate}|${record.analystName}`;
            if (!processedKeys.has(key)) {
              // Initialize priceTrend if not exists (new format)
              if (!record.priceTrend) {
                record.priceTrend = {};
                PRICE_TREND_HORIZONS.forEach(h => {
                  record.priceTrend[`D${h}`] = {
                    low: null,
                    high: null,
                    open: null,
                    close: null,
                    actualDate: null,
                    targetDate: null
                  };
                });
              }
              mergedRecords.push(record);
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
    
    // Notify adaptive controller of completed batch
    notifyBatchComplete(batch.length);
    
    processedCount += batch.length;
    i += batchSize;

    // Progress log every 50 tickers or at completion
    if (processedCount % 50 === 0 || processedCount === tickersToProcess.length) {
      const percentage = Math.round(processedCount / tickersToProcess.length * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rateInfo = getCurrentRateUsage();
      const stats = adaptiveSettings.stats || {};
      console.log(`[Price Target] ${processedCount}/${tickersToProcess.length} (${percentage}%) | Elapsed: ${elapsed}s | Rate: ${rateInfo.current}/${rateInfo.limit} | Throughput: ${stats.throughputPerMin?.toFixed(0) || 0}/${stats.targetPerMin?.toFixed(0) || 237} req/min | Mode: ${adaptiveSettings.message}`);
    }

    // Apply adaptive delay if there are more tickers to process
    if (i < tickersToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
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
 * Adds new horizon keys to priceTrend while preserving existing values
 * 기존 값은 유지하면서 새 HORIZONS 키만 추가
 *
 * @param {object} options - Options
 * @param {string[]} options.tickers - Array of specific ticker symbols to process
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function initializePriceTrendFrame(options = {}) {
  console.log('[Step 2] Initializing priceTrend frames...');
  console.log(`[Step 2] Current HORIZONS: ${PRICE_TREND_HORIZONS.join(', ')}`);
  const startTime = Date.now();

  // When specific tickers are provided, only load those tickers from DB
  const tickersFilter = (options.tickers && options.tickers.length > 0) ? options.tickers : null;
  const existingLog = await loadAnalystLog(tickersFilter);
  const analystData = existingLog.analysts || {};

  let tickersToProcess = Object.keys(analystData);
  if (tickersFilter) {
    console.log(`Processing ${tickersToProcess.length} selected tickers: ${tickersFilter.join(', ')}`);
  } else {
    console.log(`Processing all ${tickersToProcess.length} tickers`);
  }

  // Helper function to create empty price data object (same format as trades.price_history)
  const createEmptyPriceData = () => ({
    low: null,
    high: null,
    open: null,
    close: null,
    actualDate: null,
    targetDate: null
  });

  // Helper function to check if value is in old format (simple number or null)
  const isOldFormat = (value) => {
    return value === null || typeof value === 'number';
  };

  // Helper function to migrate old format to new format
  const migrateToNewFormat = (value) => {
    if (value === null) {
      return createEmptyPriceData();
    }
    if (typeof value === 'number') {
      // Old format: just a close price number
      return {
        low: null,
        high: null,
        open: null,
        close: value,  // Preserve the existing close price
        actualDate: null,
        targetDate: null
      };
    }
    // Already in new format
    return value;
  };

  let framesAdded = 0;
  let keysAdded = 0;
  let valuesMigrated = 0;
  let recordsProcessed = 0;

  for (const ticker of tickersToProcess) {
    const records = analystData[ticker] || [];

    for (const record of records) {
      recordsProcessed++;

      if (!record.priceTrend) {
        // Initialize empty priceTrend structure with all horizon keys (new format)
        record.priceTrend = {};
        PRICE_TREND_HORIZONS.forEach(h => {
          record.priceTrend[`D${h}`] = createEmptyPriceData();
        });
        framesAdded++;
      } else {
        // priceTrend exists - process each horizon key
        for (const h of PRICE_TREND_HORIZONS) {
          const key = `D${h}`;
          
          if (!(key in record.priceTrend)) {
            // Key doesn't exist - add with new format
            record.priceTrend[key] = createEmptyPriceData();
            keysAdded++;
          } else if (isOldFormat(record.priceTrend[key])) {
            // Key exists but in old format - migrate to new format
            record.priceTrend[key] = migrateToNewFormat(record.priceTrend[key]);
            valuesMigrated++;
          }
          // If already in new format, keep as is
        }
      }
    }
  }

  console.log(`[Step 2] Frames added: ${framesAdded}, Keys added: ${keysAdded}, Values migrated to new format: ${valuesMigrated}`);

  // Save only the processed tickers, not the entire dataset
  const analystLog = {
    meta: {
      lastUpdated: getCurrentTimestampISO(),
      tickerCount: tickersToProcess.length,
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
 * Step 3: Fill null priceTrend values with API quotes (OPTIMIZED VERSION)
 * 티커별로 한 번의 API 호출로 모든 필요한 날짜의 가격 데이터를 가져옴
 * price_trend 형식: { "D1": { "low": ..., "high": ..., "open": ..., "close": ..., "actualDate": ..., "targetDate": ... }, ... }
 *
 * @param {object} options - Options
 * @param {string[]} options.tickers - Array of specific ticker symbols to process
 * @param {boolean} options.setAll - If true, overwrite all values including existing ones (default: false)
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function fillPriceTrendQuotes(options = {}) {
  const setAll = options.setAll === true;
  console.log('[Step 3] Filling priceTrend quotes (OPTIMIZED - per-ticker API call)...');
  console.log('[Step 3] Using TRADING DAY based D+N calculation (weekends/holidays skipped)');
  console.log(`[Step 3] setAll=${setAll} - ${setAll ? 'Overwriting ALL values' : 'Only filling null values'}`);
  const startTime = Date.now();

  // Check Supabase connection early
  if (!supabase) {
    const errorMsg = 'Supabase client not initialized. Cannot load/save analyst records.';
    console.error(`[Step 3] ERROR: ${errorMsg}`);
    console.error('[Step 3] SOLUTION: Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
    console.error('[Step 3] Example:');
    console.error('   SUPABASE_URL=https://your-project.supabase.co');
    console.error('   SUPABASE_ANON_KEY=your-anon-key-here');
    return {
      success: false,
      error: errorMsg,
      meta: {
        recordsProcessed: 0,
        quotesUpdated: 0,
        duration: `${Date.now() - startTime}ms`,
        step: 'fillQuotes'
      }
    };
  }

  // Load holidays from DB and set cache for trading day calculations
  console.log('[Step 3] Loading market holidays...');
  const holidays = await loadHolidaysFromDB();
  setHolidaysCache(holidays);
  console.log(`[Step 3] Loaded ${holidays ? holidays.size : 0} market holidays`);

  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  const priceApiConfig = apiList.getQuantitiveValuation.getLastPrice['service-FMP'];

  // Reset adaptive controller for fresh start with endpoint-specific settings
  resetAdaptiveController(priceApiConfig.id);

  // When specific tickers are provided, only load those tickers from DB
  const tickersFilter = (options.tickers && options.tickers.length > 0) ? options.tickers : null;
  let existingLog = await loadAnalystLog(tickersFilter);
  const analystData = existingLog.analysts || {};

  console.log(`[Step 3] Loaded analyst data: ${Object.keys(analystData).length} tickers`);

  let tickersToProcess = Object.keys(analystData);
  if (tickersFilter) {
    console.log(`Processing ${tickersToProcess.length} selected tickers: ${tickersFilter.join(', ')}`);
  } else {
    console.log(`Processing all ${tickersToProcess.length} tickers`);
  }

  // Early exit if no tickers to process
  if (tickersToProcess.length === 0) {
    console.log('[Step 3] No tickers to process - exiting early');
    return { 
      success: true, 
      meta: { 
        recordsProcessed: 0, 
        quotesUpdated: 0,
        duration: `${Date.now() - startTime}ms`,
        step: 'fillQuotes',
        message: 'No tickers to process'
      } 
    };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  let totalRecordsUpdated = 0;
  let totalSlotsUpdated = 0;
  let totalApiCalls = 0;
  const errors = [];

  // Group records by ticker and calculate date range needed
  const tickerGroups = new Map();
  let totalRecordsToProcess = 0;
  let totalSlotsToFill = 0;

  for (const ticker of tickersToProcess) {
    const records = analystData[ticker] || [];
    const tickerData = {
      records: [],
      minDate: null,
      maxDate: null,
      slotsToFill: 0
    };

    for (const record of records) {
      if (!record.priceTrend) continue;

      const publishedDate = new Date(record.publishedDate);
      const recordData = {
        record,
        slotsToFill: []
      };

      // Find slots that need filling (not in the future)
      // Use TRADING DAY based D+N calculation (skips weekends and holidays)
      for (const horizon of PRICE_TREND_HORIZONS) {
        const key = `D${horizon}`;
        const existingValue = record.priceTrend[key];

        // Check if already filled (only skip if setAll is false):
        // - New format: object with close value that is not null
        // - Old format: number value (should be migrated by frame step, but handle for safety)
        if (!setAll) {
          const isAlreadyFilled = existingValue !== null && existingValue !== undefined && (
            (typeof existingValue === 'object' && existingValue.close !== null) ||
            (typeof existingValue === 'number')
          );
          
          if (isAlreadyFilled) {
            continue;
          }
        }

        // Calculate target date using TRADING DAYS (not calendar days)
        // D+1 = 1st trading day after published date
        // D+7 = 7th trading day after published date (skipping weekends/holidays)
        const tradingDay = getNthTradingDay(publishedDate, horizon, holidays);
        
        if (!tradingDay) {
          // Could not calculate trading day (rare edge case)
          continue;
        }
        
        // Skip future dates
        if (tradingDay >= today) continue;

        const targetDateStr = format(tradingDay, 'yyyy-MM-dd');
        recordData.slotsToFill.push({ key, horizon, targetDate: targetDateStr, publishedDate: record.publishedDate });
        tickerData.slotsToFill++;
        totalSlotsToFill++;

        // Track date range for API call
        if (!tickerData.minDate || targetDateStr < tickerData.minDate) {
          tickerData.minDate = targetDateStr;
        }
        if (!tickerData.maxDate || targetDateStr > tickerData.maxDate) {
          tickerData.maxDate = targetDateStr;
        }
      }

      if (recordData.slotsToFill.length > 0) {
        tickerData.records.push(recordData);
        totalRecordsToProcess++;
      }
    }

    if (tickerData.records.length > 0) {
      tickerGroups.set(ticker, tickerData);
    }
  }

  console.log(`[Step 3] ${tickerGroups.size} tickers need processing (${totalRecordsToProcess} records, ${totalSlotsToFill} slots)`);

  if (tickerGroups.size === 0) {
    console.log('[Step 3] All records already have quotes - nothing to do');
    return { 
      success: true, 
      meta: { 
        recordsProcessed: 0, 
        quotesUpdated: 0,
        duration: `${Date.now() - startTime}ms`,
        step: 'fillQuotes',
        message: 'All records already have quotes'
      } 
    };
  }

  // Process tickers in batches with adaptive rate limiting
  const tickerArray = Array.from(tickerGroups.entries());
  const SAVE_INTERVAL = 10; // Save to DB every N tickers
  let tickersProcessed = 0;
  let lastSaveIndex = 0;

  let i = 0;
  while (i < tickerArray.length) {
    // Get adaptive settings with endpoint-specific configuration
    const adaptiveSettings = getAdaptiveBatchSettings(priceApiConfig.id);
    const batchSize = adaptiveSettings.batchSize;
    const delayMs = adaptiveSettings.delayMs;

    const batch = tickerArray.slice(i, i + batchSize);

    // Process batch in parallel - one API call per ticker
    const batchPromises = batch.map(async ([ticker, tickerData]) => {
      try {
        // Fetch all historical prices for this ticker in one API call
        const url = buildApiUrl(priceApiConfig.API, { 
          ticker, 
          fromDate: tickerData.minDate, 
          toDate: tickerData.maxDate || todayStr, 
          fmpApiKey 
        });
        
        const result = await fetchApi(url, priceApiConfig.id);
        totalApiCalls++;

        if (!result.success || !result.data || !result.data.historical) {
          console.warn(`[Step 3] No price data for ${ticker}`);
          return { ticker, recordsUpdated: 0, slotsUpdated: 0 };
        }

        // Build price lookup map: date -> { low, high, open, close }
        const priceMap = new Map();
        for (const priceData of result.data.historical) {
          priceMap.set(priceData.date, {
            low: priceData.low,
            high: priceData.high,
            open: priceData.open,
            close: priceData.close
          });
        }

        let recordsUpdated = 0;
        let slotsUpdated = 0;

        // Fill in priceTrend for each record
        for (const recordData of tickerData.records) {
          const { record, slotsToFill } = recordData;
          let recordHasUpdates = false;

          for (const slot of slotsToFill) {
            const { key, targetDate, publishedDate } = slot;

            // Find price data (try exact date and nearby dates)
            let priceData = priceMap.get(targetDate);
            
            // If exact date not found, try nearby dates (weekends/holidays)
            if (!priceData) {
              const targetDt = new Date(targetDate);
              for (let offset = 1; offset <= 5; offset++) {
                // Try previous days
                const prevDate = new Date(targetDt);
                prevDate.setUTCDate(prevDate.getUTCDate() - offset);
                const prevDateStr = prevDate.toISOString().split('T')[0];
                if (priceMap.has(prevDateStr)) {
                  priceData = priceMap.get(prevDateStr);
                  break;
                }
              }
            }

            if (priceData) {
              // Store in price_history compatible format
              record.priceTrend[key] = {
                low: priceData.low,
                high: priceData.high,
                open: priceData.open,
                close: priceData.close,
                actualDate: targetDate,
                targetDate: targetDate
              };
              slotsUpdated++;
              recordHasUpdates = true;
            }
          }

          if (recordHasUpdates) {
            recordsUpdated++;
          }
        }

        return { ticker, recordsUpdated, slotsUpdated };
      } catch (error) {
        errors.push({ ticker, error: error.message });
        return { ticker, recordsUpdated: 0, slotsUpdated: 0 };
      }
    });

    const results = await Promise.all(batchPromises);
    
    // Notify adaptive controller
    notifyBatchComplete(batch.length);

    // Update counters
    for (const result of results) {
      totalRecordsUpdated += result.recordsUpdated;
      totalSlotsUpdated += result.slotsUpdated;
      tickersProcessed++;
    }

    i += batchSize;

    // Progress log
    const percentage = Math.round(tickersProcessed / tickerArray.length * 100);
    const slotPercentage = totalSlotsToFill > 0 ? Math.round(totalSlotsUpdated / totalSlotsToFill * 100) : 0;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rateInfo = getCurrentRateUsage();
    
    console.log(`[Quote Fill] Tickers: ${tickersProcessed}/${tickerArray.length} (${percentage}%) | Slots: ${totalSlotsUpdated}/${totalSlotsToFill} (${slotPercentage}%) | API Calls: ${totalApiCalls} | Elapsed: ${elapsed}s | Rate: ${rateInfo.current}/${rateInfo.limit}`);

    // Periodic save to database
    if (tickersProcessed - lastSaveIndex >= SAVE_INTERVAL || tickersProcessed === tickerArray.length) {
      const analystLog = {
        meta: {
          lastUpdated: getCurrentTimestampISO(),
          tickerCount: Object.keys(analystData).length,
          totalAnalysts: Object.values(analystData).reduce((sum, recs) => sum + recs.length, 0),
          tickersProcessed,
          totalTickers: tickerArray.length,
          recordsUpdated: totalRecordsUpdated,
          slotsUpdated: totalSlotsUpdated,
          apiCalls: totalApiCalls,
          errors: errors.length,
          duration: `${Date.now() - startTime}ms`,
          step: 'fillQuotes',
          inProgress: tickersProcessed < tickerArray.length
        },
        analysts: analystData,
        errors: errors.slice(0, 100)
      };

      await saveAnalystLog(analystLog);
      lastSaveIndex = tickersProcessed;
      console.log(`[Quote Fill] Checkpoint saved at ${tickersProcessed}/${tickerArray.length} tickers`);
    }

    // Apply adaptive delay
    if (i < tickerArray.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Final save
  const finalLog = {
    meta: {
      lastUpdated: getCurrentTimestampISO(),
      tickerCount: Object.keys(analystData).length,
      totalAnalysts: Object.values(analystData).reduce((sum, records) => sum + records.length, 0),
      tickersProcessed,
      totalTickers: tickerArray.length,
      recordsUpdated: totalRecordsUpdated,
      slotsUpdated: totalSlotsUpdated,
      apiCalls: totalApiCalls,
      errors: errors.length,
      duration: `${Date.now() - startTime}ms`,
      step: 'fillQuotes'
    },
    analysts: analystData,
    errors: errors.slice(0, 100)
  };

  await saveAnalystLog(finalLog);

  console.log(`[Quote Fill] Completed in ${finalLog.meta.duration}`);
  console.log(`- Tickers processed: ${tickersProcessed}/${tickerArray.length}`);
  console.log(`- Records updated: ${totalRecordsUpdated}`);
  console.log(`- Slots updated: ${totalSlotsUpdated}/${totalSlotsToFill}`);
  console.log(`- API calls: ${totalApiCalls} (vs ${totalSlotsToFill} without optimization)`);

  return { success: true, meta: finalLog.meta };
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
 * @param {boolean} options.setAll - If true, overwrite all values including existing ones (default: false)
 * @returns {Promise<object>} Result with success status and metadata
 */
export async function refreshAnalystLog(options = {}) {
  console.log('Starting analyst log refresh orchestrator...');
  if (options.setAll) {
    console.log('[Orchestrator] setAll=true - Will overwrite ALL existing values');
  }
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
          ticker: record.ticker || ticker,
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
        let priceAtHorizonValue = priceTrend[key];

        // Handle new format (object with close field) and old format (number)
        if (priceAtHorizonValue !== null && priceAtHorizonValue !== undefined) {
          if (typeof priceAtHorizonValue === 'object' && priceAtHorizonValue.close !== null && priceAtHorizonValue.close !== undefined) {
            // New format: extract close price
            priceAtHorizonValue = priceAtHorizonValue.close;
          } else if (typeof priceAtHorizonValue === 'number') {
            // Old format: use as is
          } else {
            // Invalid format
            priceAtHorizonValue = null;
          }
        }

        if (priceAtHorizonValue !== null && priceAtHorizonValue !== undefined && priceWhenPosted > 0) {
          const gapRate = (priceAtHorizonValue / priceWhenPosted) - 1;
          gapRatesByHorizon[key].push(gapRate);
        }
      }

      // Calculate timeToTarget (first time price reaches target)
      if (priceTarget && priceWhenPosted > 0) {
        let targetReached = false;
        for (const horizon of PRICE_TREND_HORIZONS) {
          const key = `D${horizon}`;
          let priceAtHorizonValue = priceTrend[key];

          // Handle new format (object with close field) and old format (number)
          if (priceAtHorizonValue !== null && priceAtHorizonValue !== undefined) {
            if (typeof priceAtHorizonValue === 'object' && priceAtHorizonValue.close !== null && priceAtHorizonValue.close !== undefined) {
              // New format: extract close price
              priceAtHorizonValue = priceAtHorizonValue.close;
            } else if (typeof priceAtHorizonValue === 'number') {
              // Old format: use as is
            } else {
              // Invalid format
              priceAtHorizonValue = null;
            }
          }

          if (priceAtHorizonValue !== null && priceAtHorizonValue !== undefined) {
            // Check if target is reached (within 2% tolerance)
            const targetRatio = priceAtHorizonValue / priceTarget;
            if (targetRatio >= 0.98 && targetRatio <= 1.02) {
              timeToTargetData.push({
                daysToTarget: horizon,
                targetPrice: priceTarget,
                actualPrice: priceAtHorizonValue,
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

  // Save to database (analyst_log table)
  if (!supabase) {
    console.error('[generateAnalystRating] ERROR: Supabase client not initialized');
    console.error('[generateAnalystRating] Cannot save analyst ratings to database');
    return {
      success: false,
      error: 'Supabase client not initialized',
      meta: analystRating.meta
    };
  }

  // Prepare records for database insert
  const dbRecords = [];
  for (const analystKey in analystRatings) {
    const rating = analystRatings[analystKey];
    dbRecords.push({
      analyst_name: rating.analystName,
      analyst_company: rating.analystCompany,
      price_target_count: rating.priceTargetCount,
      gap_rates: rating.gapRates,
      time_to_target: rating.timeToTarget,
      accuracy: rating.accuracy
    });
  }

  // Upsert to database in batches
  const batchSize = BATCH.DB_UPSERT_BATCH_SIZE;
  let savedCount = 0;
  let errorCount = 0;
  const saveErrors = [];

  console.log(`[generateAnalystRating] Saving ${dbRecords.length} analyst ratings to database...`);

  for (let i = 0; i < dbRecords.length; i += batchSize) {
    const batch = dbRecords.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(dbRecords.length / batchSize);

    try {
      const { data, error } = await supabase
        .from(TABLES.ANALYST_LOGS)
        .upsert(batch, { onConflict: 'analyst_name,analyst_company' })
        .select('analyst_name');

      if (error) {
        errorCount += batch.length;
        const errorMsg = `Batch ${batchNum}/${totalBatches}: ${error.message}`;
        console.error(`[generateAnalystRating] ERROR - ${errorMsg}`);
        saveErrors.push(errorMsg);
      } else {
        savedCount += batch.length;
        if (batchNum === 1 || batchNum === totalBatches || batchNum % 5 === 0) {
          console.log(`[generateAnalystRating] Batch ${batchNum}/${totalBatches} saved (${batch.length} records)`);
        }
      }
    } catch (err) {
      errorCount += batch.length;
      const errorMsg = `Batch ${batchNum}/${totalBatches}: Unexpected error - ${err.message}`;
      console.error(`[generateAnalystRating] EXCEPTION - ${errorMsg}`);
      saveErrors.push(errorMsg);
    }
  }

  console.log(`[generateAnalystRating] Database save completed:`);
  console.log(`  - Total records: ${dbRecords.length}`);
  console.log(`  - Successfully saved: ${savedCount}`);
  console.log(`  - Failed: ${errorCount}`);

  if (saveErrors.length > 0) {
    console.error(`[generateAnalystRating] Save errors:`, saveErrors.slice(0, 5));
  }

  // Verify saved records
  try {
    const { count, error: countError } = await supabase
      .from(TABLES.ANALYST_LOGS)
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`[generateAnalystRating] Verification: Total records in analyst_logs table: ${count}`);
    }
  } catch (verifyErr) {
    console.warn(`[generateAnalystRating] Verification failed: ${verifyErr.message}`);
  }

  console.log(`Analyst rating generation completed in ${analystRating.meta.duration}`);
  console.log(`- Unique analysts: ${analystRating.meta.analystCount}`);
  console.log(`- Price trend horizons: ${PRICE_TREND_HORIZONS.join(', ')}`);
  console.log(`- Saved to database: ${savedCount}/${dbRecords.length}`);

  return {
    success: errorCount === 0,
    meta: {
      ...analystRating.meta,
      savedCount,
      errorCount,
      errors: saveErrors.length > 0 ? saveErrors : undefined
    }
  };
}

export default {
  loadAnalystLog,
  refreshAnalystLog,
  loadAnalystRating,
  generateAnalystRating
};
