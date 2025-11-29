/**
 * Price Tracker Service - Individual trade performance tracking
 * Per US1: Track trades over D+1 to D+14 horizons with cap-aware returns
 *
 * Orchestrates FMP API calls, trading calendar logic, and return calculations
 */

import { getHistoricalOHLC } from './fmpClient.js';
import { calculateDPlusN } from '../lib/dateUtils.js';
import { getNextTradingDay, isNonTradingDay } from '../lib/tradingCalendar.js';
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

  // Check if purchase date is a trading day
  const date = parseISO(purchaseDate);
  if (isNonTradingDay(date)) {
    return {
      success: false,
      error: {
        code: 'NON_TRADING_DAY',
        message: `${purchaseDate} is a non-trading day (weekend or holiday)`
      }
    };
  }

  // Fetch OHLC data from FMP
  const result = await getHistoricalOHLC(ticker, purchaseDate);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.statusCode === 404 ? 'TICKER_NOT_FOUND' : 'API_ERROR',
        message: result.error.errorMessage
      }
    };
  }

  // Return open price as currentPrice
  return {
    success: true,
    data: result.data.open
  };
}

/**
 * Fetch price history for a trade across D+1 to D+14 horizons
 * Per FR-033: Handle non-trading days by finding next trading day within 7 days
 */
export async function fetchPriceHistoryForTrade(ticker, purchaseDate) {
  const priceHistory = [];
  const missingDates = [];
  const errors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let n = 1; n <= 14; n++) {
    const targetDate = calculateDPlusN(purchaseDate, n);
    const targetDateObj = parseISO(targetDate);

    if (targetDateObj > today) {
      priceHistory.push(null);
      continue;
    }

    let actualDateObj = targetDateObj;
    if (isNonTradingDay(targetDateObj)) {
      actualDateObj = getNextTradingDay(targetDateObj, 7);
      if (!actualDateObj) {
        missingDates.push(targetDate);
        priceHistory.push(null);
        continue;
      }
    }

    const actualDate = format(actualDateObj, 'yyyy-MM-dd');
    const result = await getHistoricalOHLC(ticker, actualDate);

    if (!result.success) {
      errors.push({
        timestamp: new Date().toISOString(),
        message: `Failed to fetch data for ${ticker} on ${actualDate}: ${result.error.message}`,
        code: result.error.code
      });
      priceHistory.push(null);
      continue;
    }

    priceHistory.push({
      targetDate,
      actualDate,
      open: result.data.open,
      high: result.data.high,
      low: result.data.low,
      close: result.data.close
    });
  }

  return { success: true, data: priceHistory, missingDates, errors };
}

export function calculateCapAwareReturn(position, currentPrice, priceData, maxCapPct = 0.20, lowCapPct = 0.05) {
  const { open, high, low, close } = priceData;

  if (position === 'long') {
    const maxCapThreshold = currentPrice * (1 + maxCapPct);
    const lowCapThreshold = currentPrice * (1 - lowCapPct);

    if (high >= maxCapThreshold) {
      return { returnRate: (open - currentPrice) / currentPrice, returnSource: 'open_maxCap' };
    } else if (low <= lowCapThreshold) {
      return { returnRate: (open - currentPrice) / currentPrice, returnSource: 'open_lowCap' };
    } else {
      return { returnRate: (close - currentPrice) / currentPrice, returnSource: 'close' };
    }
  } else {
    const maxCapThreshold = currentPrice * (1 - maxCapPct);
    const lowCapThreshold = currentPrice * (1 + lowCapPct);

    if (low <= maxCapThreshold) {
      return { returnRate: ((open - currentPrice) / currentPrice) * -1, returnSource: 'open_maxCap' };
    } else if (high >= lowCapThreshold) {
      return { returnRate: ((open - currentPrice) / currentPrice) * -1, returnSource: 'open_lowCap' };
    } else {
      return { returnRate: ((close - currentPrice) / currentPrice) * -1, returnSource: 'close' };
    }
  }
}

export function calculateReturnsArray(position, currentPrice, priceHistory, maxCap = 0.20, lowCap = 0.05) {
  const returns = [];
  let cumulativeReturn = 0;

  for (let i = 0; i < 14; i++) {
    const priceData = priceHistory[i];
    if (priceData === null) {
      returns.push(null);
      continue;
    }

    const { returnRate, returnSource } = calculateCapAwareReturn(position, currentPrice, priceData, maxCap, lowCap);
    cumulativeReturn += returnRate;
    returns.push({ date: priceData.actualDate, returnRate, returnSource, cumulativeReturn });
  }

  return returns;
}

export async function createTradeRecord(position, modelName, ticker, purchaseDate, maxCap = 0.20, lowCap = 0.05) {
  const currentPriceResult = await fetchCurrentPrice(ticker, purchaseDate);
  if (!currentPriceResult.success) {
    return { success: false, error: currentPriceResult.error };
  }

  const currentPrice = currentPriceResult.data;
  const priceHistoryResult = await fetchPriceHistoryForTrade(ticker, purchaseDate);
  const priceHistory = priceHistoryResult.data;
  const missingDates = priceHistoryResult.missingDates || [];
  const errors = priceHistoryResult.errors || [];
  const returns = calculateReturnsArray(position, currentPrice, priceHistory, maxCap, lowCap);

  const now = new Date().toISOString();
  return {
    success: true,
    data: {
      position, modelName, ticker, purchaseDate,
      currentPrice: Number(currentPrice.toFixed(4)),
      priceHistory, returns,
      meta: { createdAt: now, updatedAt: now, missingDates, errors }
    }
  };
}

export default {
  fetchCurrentPrice,
  fetchPriceHistoryForTrade,
  calculateCapAwareReturn,
  calculateReturnsArray,
  createTradeRecord
};
