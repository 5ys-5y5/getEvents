/**
 * Price Tracker Service - Individual trade performance tracking
 * Per US1: Track trades over D+1 to D+14 horizons
 *
 * Orchestrates FMP API calls, trading calendar logic, and return calculations
 * 
 * D+N is calculated based on TRADING DAYS, not calendar days.
 * - D+1 = 1st trading day after purchase date
 * - D+2 = 2nd trading day after purchase date
 * - Weekends and market holidays are skipped
 * 
 * NOTE: Returns are stored as PURE returns (close price based, no cap applied).
 * Cap-aware returns are calculated dynamically in Dashboard/Control UI.
 */

import { getHistoricalOHLC } from './fmpClient.js';
import { getNthTradingDay, isNonTradingDay, setHolidaysCache, getNearestTradingDay } from '../lib/tradingCalendar.js';
import { loadHolidaysFromDB } from './tradingDayService.js';
import { parseISO, format } from 'date-fns';

/**
 * Fetch current price (purchase date open price) for a trade
 * Per data-model.md: currentPrice is the open price on purchase date
 *
 * @param {string} ticker - Stock symbol (uppercase)
 * @param {string} purchaseDate - Purchase date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data?: number, error?: Object}>}
 *
 * @example
 * const result = await fetchCurrentPrice('AAPL', '2025-11-01');
 * if (result.success) {
 *   console.log(result.data); // 150.25 (open price on 2025-11-01)
 * }
 */
export async function fetchCurrentPrice(ticker, purchaseDate) {
  // Validate inputs
  if (!ticker || typeof ticker !== 'string') {
    return {
      success: false,
      error: {
        code: 'INVALID_TICKER',
        message: 'ticker must be a non-empty string'
      }
    };
  }

  if (!purchaseDate || typeof purchaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    return {
      success: false,
      error: {
        code: 'INVALID_DATE',
        message: 'purchaseDate must be in YYYY-MM-DD format'
      }
    };
  }

  // Load holidays from DB and set cache
  const holidays = await loadHolidaysFromDB();
  setHolidaysCache(holidays);

  // Check if purchase date is a trading day, auto-adjust if not
  const date = parseISO(purchaseDate);
  const { adjustedDate, wasAdjusted, reason } = getNearestTradingDay(date, 7, holidays);
  
  // Use adjusted date for API call
  const effectiveDate = format(adjustedDate, 'yyyy-MM-dd');

  // Fetch OHLC data from FMP
  const result = await getHistoricalOHLC(ticker, effectiveDate);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.statusCode === 404 ? 'TICKER_NOT_FOUND' : 'API_ERROR',
        message: result.error.errorMessage
      }
    };
  }

  // Return open price as currentPrice with adjustment info
  return {
    success: true,
    data: result.data.open,
    meta: wasAdjusted ? {
      dateAdjusted: true,
      originalDate: purchaseDate,
      adjustedDate: effectiveDate,
      adjustmentReason: reason,
      weekendRecommendation: reason === 'weekend'
    } : null
  };
}

/**
 * Fetch price history for a trade across D+1 to D+14 horizons
 *
 * ⚡ OPTIMIZED: Uses SINGLE API call with from/to range (ApiList.json getLastPrice)
 *
 * IMPORTANT: D+N means the N-th TRADING DAY after purchase date.
 * - D+1 = 1st trading day after purchase
 * - D+2 = 2nd trading day after purchase
 * - Weekends and market holidays are automatically skipped
 *
 * Example: If purchase date is Friday 2025-09-19
 * - D+1 = Monday 2025-09-22 (skip Sat/Sun)
 * - D+2 = Tuesday 2025-09-23
 * - D+3 = Wednesday 2025-09-24
 *
 * @param {string} ticker - Stock symbol
 * @param {string} purchaseDate - Purchase date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data: Array, missingDates: Array, errors: Array}>}
 */
export async function fetchPriceHistoryForTrade(ticker, purchaseDate) {
  const priceHistory = [];
  const missingDates = [];
  const errors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load holidays from DB and set cache
  const holidays = await loadHolidaysFromDB();
  setHolidaysCache(holidays);

  const purchaseDateObj = parseISO(purchaseDate);

  // ============================================
  // STEP 1: Calculate target trading dates (D+1 to D+14)
  // ============================================
  const tradingDates = [];
  let firstPastDate = null;
  let lastPastDate = null;

  for (let n = 1; n <= 14; n++) {
    const tradingDayObj = getNthTradingDay(purchaseDateObj, n, holidays);

    if (!tradingDayObj) {
      tradingDates.push({ n, date: null, isFuture: false, notFound: true });
      continue;
    }

    const isFuture = tradingDayObj >= today;
    const dateStr = format(tradingDayObj, 'yyyy-MM-dd');

    tradingDates.push({ n, date: dateStr, dateObj: tradingDayObj, isFuture, notFound: false });

    // Track first and last past trading dates for API call range
    if (!isFuture) {
      if (!firstPastDate) firstPastDate = dateStr;
      lastPastDate = dateStr;
    }
  }

  // ============================================
  // STEP 2: Single API call for all past dates (from first to last)
  // ============================================
  let priceDataMap = new Map(); // date -> {open, high, low, close}

  if (firstPastDate && lastPastDate) {
    // Import the optimized range function
    const { getHistoricalOHLCRange } = await import('./fmpClient.js');

    const result = await getHistoricalOHLCRange(ticker, firstPastDate, lastPastDate);

    if (result.success) {
      // Build map for O(1) lookup
      result.data.forEach(dayData => {
        priceDataMap.set(dayData.date, {
          open: dayData.open,
          high: dayData.high,
          low: dayData.low,
          close: dayData.close
        });
      });
    } else {
      // API call failed - log error but continue with empty map
      errors.push({
        timestamp: new Date().toISOString(),
        message: `Failed to fetch price range for ${ticker} from ${firstPastDate} to ${lastPastDate}: ${result.error?.errorMessage}`,
        code: result.error?.statusCode
      });
    }
  }

  // ============================================
  // STEP 3: Match trading dates with fetched price data
  // ============================================
  for (const { n, date, dateObj, isFuture, notFound } of tradingDates) {
    if (notFound) {
      missingDates.push(`D+${n}`);
      priceHistory.push(null);
      continue;
    }

    if (isFuture) {
      priceHistory.push({
        targetDate: date,
        actualDate: null,
        open: null,
        high: null,
        low: null,
        close: null,
        isFutureDate: true  // Mark as future date - no API call made
      });
      continue;
    }

    // Look up price data from map
    const priceData = priceDataMap.get(date);

    if (!priceData) {
      // Price data not found for this trading date (non-trading day or API gap)
      // Fallback: Try to find nearest available trading day data
      const fallbackData = findNearestTradingDayData(priceDataMap, date, dateObj, holidays);

      if (fallbackData) {
        priceHistory.push({
          targetDate: date,
          actualDate: fallbackData.actualDate,  // Date of fallback data
          open: fallbackData.open,
          high: fallbackData.high,
          low: fallbackData.low,
          close: fallbackData.close,
          isFutureDate: false,
          usedFallback: true  // Indicate fallback was used
        });
      } else {
        missingDates.push(`D+${n}`);
        priceHistory.push(null);
      }
      continue;
    }

    // Exact match found
    priceHistory.push({
      targetDate: date,
      actualDate: date,  // Exact match
      open: priceData.open,
      high: priceData.high,
      low: priceData.low,
      close: priceData.close,
      isFutureDate: false
    });
  }

  return { success: true, data: priceHistory, missingDates, errors };
}

/**
 * Find nearest trading day data when exact date is not available
 * Fallback strategy: Look backwards up to 7 calendar days for available data
 *
 * @param {Map} priceDataMap - Map of date -> OHLC data
 * @param {string} targetDate - Target date (YYYY-MM-DD)
 * @param {Date} targetDateObj - Target date as Date object
 * @param {Array} holidays - Market holidays array
 * @returns {Object|null} Nearest trading day data or null
 */
function findNearestTradingDayData(priceDataMap, targetDate, targetDateObj, holidays) {
  // Search backwards up to 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const candidateDate = new Date(targetDateObj);
    candidateDate.setDate(candidateDate.getDate() - offset);

    const candidateDateStr = format(candidateDate, 'yyyy-MM-dd');

    // Check if this date has data
    if (priceDataMap.has(candidateDateStr)) {
      return {
        ...priceDataMap.get(candidateDateStr),
        actualDate: candidateDateStr
      };
    }
  }

  return null; // No fallback found within 7 days
}

/**
 * Calculate pure return (close price based, no cap applied)
 * This is the ONLY return calculation used for storage.
 * Cap-aware returns are calculated dynamically in Dashboard/Control UI.
 * 
 * @param {string} position - 'long' or 'short'
 * @param {number} currentPrice - Entry price
 * @param {Object} priceData - OHLC data
 * @returns {{returnRate: number}} Pure return rate
 */
export function calculatePureReturn(position, currentPrice, priceData) {
  const { close } = priceData;

  if (position === 'long') {
    return { returnRate: (close - currentPrice) / currentPrice };
  } else {
    // Short: profit when price goes down
    return { returnRate: ((close - currentPrice) / currentPrice) * -1 };
  }
}

/**
 * Calculate pure returns array (no cap applied)
 * This is stored in DB. Cap-aware returns are calculated dynamically in UI.
 * 
 * @param {string} position - 'long' or 'short'
 * @param {number} currentPrice - Entry price
 * @param {Array} priceHistory - Array of OHLC data for D+1 to D+14
 * @returns {Array} Array of pure returns with OHLC data for dynamic cap calculation
 */
export function calculateReturnsArray(position, currentPrice, priceHistory) {
  const returns = [];
  let cumulativeReturn = 0;

  for (let i = 0; i < 14; i++) {
    const priceData = priceHistory[i];
    if (priceData === null) {
      returns.push(null);
      continue;
    }

    const { returnRate } = calculatePureReturn(position, currentPrice, priceData);
    cumulativeReturn += returnRate;
    
    // Store OHLC data for dynamic cap calculation in UI
    returns.push({ 
      date: priceData.actualDate, 
      returnRate,      // Pure return (close-based)
      cumulativeReturn,
      // Include OHLC for dynamic cap calculation in Dashboard/Control
      open: priceData.open,
      high: priceData.high,
      low: priceData.low,
      close: priceData.close
    });
  }

  return returns;
}

/**
 * Batch create trade records with ticker-grouped API optimization
 * ⚡ OPTIMIZED: Groups trades by ticker and makes single API call per ticker
 *
 * @param {Array<{position: string, modelName: string, ticker: string, recommendationDate: string}>} trades - Array of trades
 * @returns {Promise<Array<{success: boolean, data?: Object, error?: Object, trade: Object}>>}
 *
 * @example
 * const trades = [
 *   { position: 'long', modelName: 'MODEL-1', ticker: 'AAPL', recommendationDate: '2025-11-01' },
 *   { position: 'long', modelName: 'MODEL-2', ticker: 'AAPL', recommendationDate: '2025-11-05' },
 *   { position: 'short', modelName: 'MODEL-1', ticker: 'MSFT', recommendationDate: '2025-11-03' }
 * ];
 * // Result: 2 API calls (AAPL, MSFT) instead of 3
 */
export async function batchCreateTradeRecords(trades) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return [];
  }

  // Load holidays once for all trades
  const holidays = await loadHolidaysFromDB();
  setHolidaysCache(holidays);

  // ============================================
  // STEP 1: Group trades by ticker
  // ============================================
  const tickerGroups = new Map();

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    const { ticker, recommendationDate } = trade;

    if (!tickerGroups.has(ticker)) {
      tickerGroups.set(ticker, {
        trades: [],
        minDate: null,
        maxDate: null
      });
    }

    const group = tickerGroups.get(ticker);

    // Adjust recommendation date to purchase date (nearest trading day)
    const recDateObj = parseISO(recommendationDate);
    const { adjustedDate } = getNearestTradingDay(recDateObj, 7, holidays);
    const purchaseDate = format(adjustedDate, 'yyyy-MM-dd');

    // Calculate D+14 trading day for this trade
    const d14TradingDay = getNthTradingDay(adjustedDate, 14, holidays);
    const d14DateStr = d14TradingDay ? format(d14TradingDay, 'yyyy-MM-dd') : purchaseDate;

    group.trades.push({
      index: i,
      originalTrade: trade,
      purchaseDate,
      d14Date: d14DateStr
    });

    // Track date range for API call
    if (!group.minDate || purchaseDate < group.minDate) {
      group.minDate = purchaseDate;
    }
    if (!group.maxDate || d14DateStr > group.maxDate) {
      group.maxDate = d14DateStr;
    }
  }

  console.log(`[batchCreateTradeRecords] Grouped ${trades.length} trades into ${tickerGroups.size} tickers`);

  // ============================================
  // STEP 2: Fetch price data once per ticker
  // ============================================
  const tickerPriceData = new Map();

  for (const [ticker, group] of tickerGroups.entries()) {
    console.log(`[batchCreateTradeRecords] Fetching ${ticker}: ${group.minDate} to ${group.maxDate} (${group.trades.length} trades)`);

    // Single API call for all trades of this ticker
    const { getHistoricalOHLCRange } = await import('./fmpClient.js');
    const result = await getHistoricalOHLCRange(ticker, group.minDate, group.maxDate);

    if (result.success) {
      // Build price map for O(1) lookup
      const priceMap = new Map();
      result.data.forEach(dayData => {
        priceMap.set(dayData.date, {
          open: dayData.open,
          high: dayData.high,
          low: dayData.low,
          close: dayData.close
        });
      });
      tickerPriceData.set(ticker, priceMap);
      console.log(`[batchCreateTradeRecords] ${ticker}: Loaded ${priceMap.size} price records`);
    } else {
      console.error(`[batchCreateTradeRecords] ${ticker}: Failed to fetch price data`);
      tickerPriceData.set(ticker, null); // Mark as failed
    }
  }

  // ============================================
  // STEP 3: Build trade records using cached price data
  // ============================================
  const results = new Array(trades.length);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const [ticker, group] of tickerGroups.entries()) {
    const priceMap = tickerPriceData.get(ticker);

    for (const tradeData of group.trades) {
      const { index, originalTrade, purchaseDate } = tradeData;
      const { position, modelName, recommendationDate } = originalTrade;

      // If API failed for this ticker, return error for all its trades
      if (!priceMap) {
        results[index] = {
          success: false,
          error: {
            code: 'API_ERROR',
            message: `Failed to fetch price data for ${ticker}`
          },
          trade: originalTrade
        };
        continue;
      }

      // Fetch current price (open on purchase date)
      const currentPriceData = priceMap.get(purchaseDate);
      if (!currentPriceData) {
        // Fallback: search backwards up to 7 days
        let foundPrice = null;
        for (let offset = 1; offset <= 7; offset++) {
          const fallbackDate = new Date(parseISO(purchaseDate));
          fallbackDate.setDate(fallbackDate.getDate() - offset);
          const fallbackDateStr = format(fallbackDate, 'yyyy-MM-dd');
          foundPrice = priceMap.get(fallbackDateStr);
          if (foundPrice) break;
        }

        if (!foundPrice) {
          results[index] = {
            success: false,
            error: {
              code: 'PRICE_NOT_FOUND',
              message: `No price data found for ${ticker} on ${purchaseDate}`
            },
            trade: originalTrade
          };
          continue;
        }
      }

      const currentPrice = currentPriceData?.open || 0;

      // Build price history for D+1 to D+14
      const priceHistory = [];
      const missingDates = [];
      const purchaseDateObj = parseISO(purchaseDate);

      for (let n = 1; n <= 14; n++) {
        const tradingDayObj = getNthTradingDay(purchaseDateObj, n, holidays);

        if (!tradingDayObj) {
          missingDates.push(`D+${n}`);
          priceHistory.push(null);
          continue;
        }

        const targetDate = format(tradingDayObj, 'yyyy-MM-dd');

        // Skip future dates
        if (tradingDayObj >= today) {
          priceHistory.push({
            targetDate,
            actualDate: null,
            open: null,
            high: null,
            low: null,
            close: null,
            isFutureDate: true
          });
          continue;
        }

        // Look up price data from map
        let dayPriceData = priceMap.get(targetDate);

        // Fallback if not found
        if (!dayPriceData) {
          for (let offset = 1; offset <= 7; offset++) {
            const fallbackDate = new Date(tradingDayObj);
            fallbackDate.setDate(fallbackDate.getDate() - offset);
            const fallbackDateStr = format(fallbackDate, 'yyyy-MM-dd');
            dayPriceData = priceMap.get(fallbackDateStr);
            if (dayPriceData) {
              priceHistory.push({
                targetDate,
                actualDate: fallbackDateStr,
                open: dayPriceData.open,
                high: dayPriceData.high,
                low: dayPriceData.low,
                close: dayPriceData.close,
                isFutureDate: false,
                usedFallback: true
              });
              break;
            }
          }
          if (!dayPriceData) {
            missingDates.push(`D+${n}`);
            priceHistory.push(null);
          }
          continue;
        }

        priceHistory.push({
          targetDate,
          actualDate: targetDate,
          open: dayPriceData.open,
          high: dayPriceData.high,
          low: dayPriceData.low,
          close: dayPriceData.close,
          isFutureDate: false
        });
      }

      // Calculate pure returns
      const returns = calculateReturnsArray(position, currentPrice, priceHistory);

      // Build trade record
      const tradeRecord = {
        position,
        modelName,
        ticker,
        recommendationDate,
        purchaseDate,
        currentPrice,
        priceHistory,
        returns,
        meta: {
          dateAdjusted: recommendationDate !== purchaseDate,
          originalDate: recommendationDate,
          adjustedDate: purchaseDate,
          missingDates,
          recordedAt: new Date().toISOString()
        }
      };

      results[index] = {
        success: true,
        data: tradeRecord,
        trade: originalTrade
      };
    }
  }

  console.log(`[batchCreateTradeRecords] Completed: ${tickerGroups.size} API calls for ${trades.length} trades`);
  return results;
}

/**
 * Create a trade record with recommendation_date and purchase_date separation
 *
 * @param {string} position - 'long' or 'short'
 * @param {string} modelName - Model identifier
 * @param {string} ticker - Stock ticker
 * @param {string} recommendationDate - User input date (YYYY-MM-DD) - used for duplicate check
 * @returns {Promise<{success: boolean, data?: Object, error?: Object}>}
 *
 * recommendationDate: 사용자가 입력한 추천 날짜 (중복 검사용)
 * purchaseDate: 실제 거래일 (가격 계산용, 주말/휴일인 경우 다음 거래일로 조정됨)
 */
export async function createTradeRecord(position, modelName, ticker, recommendationDate) {
  // recommendationDate is the user input, purchaseDate is the actual trading day
  const currentPriceResult = await fetchCurrentPrice(ticker, recommendationDate);
  if (!currentPriceResult.success) {
    return { success: false, error: currentPriceResult.error };
  }

  const currentPrice = currentPriceResult.data;
  const dateAdjustmentMeta = currentPriceResult.meta;
  
  // purchaseDate is the actual trading day (adjusted if recommendationDate was non-trading day)
  const purchaseDate = dateAdjustmentMeta?.adjustedDate || recommendationDate;
  
  const priceHistoryResult = await fetchPriceHistoryForTrade(ticker, purchaseDate);
  const priceHistory = priceHistoryResult.data;
  const missingDates = priceHistoryResult.missingDates || [];
  const errors = priceHistoryResult.errors || [];
  
  // Calculate pure returns only (cap-aware returns are calculated dynamically in UI)
  const returns = calculateReturnsArray(position, currentPrice, priceHistory);

  const now = new Date().toISOString();
  
  // Build meta object with date adjustment info
  const meta = { 
    createdAt: now, 
    updatedAt: now, 
    missingDates, 
    errors 
  };
  
  // Add date adjustment info to meta if date was adjusted
  if (dateAdjustmentMeta?.dateAdjusted) {
    meta.dateAdjusted = true;
    meta.adjustmentReason = dateAdjustmentMeta.adjustmentReason;
    meta.weekendRecommendation = dateAdjustmentMeta.weekendRecommendation || false;
  }
  
  return {
    success: true,
    data: {
      position, 
      modelName, 
      ticker, 
      // recommendationDate: 사용자 입력 날짜 (중복 검사용)
      recommendationDate,
      // purchaseDate: 실제 거래일 (가격 계산용)
      purchaseDate,
      currentPrice: Number(currentPrice.toFixed(4)),
      priceHistory,
      // Pure returns only (includes OHLC for dynamic cap calculation in UI)
      returns,
      meta
    }
  };
}

export default {
  fetchCurrentPrice,
  fetchPriceHistoryForTrade,
  calculatePureReturn,
  calculateReturnsArray,
  createTradeRecord
};
