// Price fetching service
// Fetches current price based on market hours

import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { fetchApi } from './fmpClient.js';
import { getMarketStatus } from '../lib/marketHours.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';

/**
 * Get current price for a ticker based on market hours
 * - Regular market hours: use quote API
 * - Pre/Post market hours: use pre-post-market API
 * - Closed: use quote API (last close price)
 *
 * @param {string} ticker - Stock ticker symbol
 * @returns {object} Price data with source info
 */
export async function getCurrentPrice(ticker) {
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  const marketStatus = getMarketStatus();

  let priceData = null;
  let source = null;
  let error = null;

  // Determine which API to use based on market status
  // For regular market hours: prioritize quote API (real-time during trading)
  // For pre/post market: use pre-post-market API
  // For closed: try pre-post-market first (might have extended hours data), fallback to quote

  if (marketStatus === 'regular') {
    // Regular market hours: use quote API
    const quoteConfig = apiList.getQuantitiveValuation.marketCap['service-FMP'];
    const quoteUrl = buildApiUrl(quoteConfig.API, { ticker, fmpApiKey });
    const result = await fetchApi(quoteUrl, quoteConfig.id);

    if (result.success && result.data && result.data.length > 0) {
      priceData = {
        current: result.data[0].price,
        timestamp: result.data[0].timestamp || getCurrentTimestampISO(),
        source: 'quote',
        marketStatus
      };
    } else {
      error = result.error;
    }
  } else {
    // Pre-market, post-market, or closed: try pre-post-market API first
    const prePostConfig = apiList.getQuantitiveValuation.getCurrentPrice['service-FMP'];
    const prePostUrl = buildApiUrl(prePostConfig.API, { ticker, fmpApiKey });
    const result = await fetchApi(prePostUrl, prePostConfig.id);

    // Pre-post-market API returns an object (not array)
    if (result.success && result.data && result.data.price !== undefined) {
      priceData = {
        current: result.data.price,
        timestamp: result.data.timestamp || getCurrentTimestampISO(),
        source: 'pre-post-market',
        marketStatus
      };
    } else {
      error = result.error;
    }
  }

  // Fallback to the other API if primary fails
  if (!priceData) {
    if (marketStatus === 'regular') {
      // Try pre-post-market as fallback
      const prePostConfig = apiList.getQuantitiveValuation.getCurrentPrice['service-FMP'];
      const prePostUrl = buildApiUrl(prePostConfig.API, { ticker, fmpApiKey });
      const result = await fetchApi(prePostUrl, prePostConfig.id);

      if (result.success && result.data && result.data.price !== undefined) {
        priceData = {
          current: result.data.price,
          timestamp: result.data.timestamp || getCurrentTimestampISO(),
          source: 'pre-post-market',
          marketStatus
        };
      }
    } else {
      // Try quote as fallback
      const quoteConfig = apiList.getQuantitiveValuation.marketCap['service-FMP'];
      const quoteUrl = buildApiUrl(quoteConfig.API, { ticker, fmpApiKey });
      const result = await fetchApi(quoteUrl, quoteConfig.id);

      if (result.success && result.data && result.data.length > 0) {
        priceData = {
          current: result.data[0].price,
          timestamp: result.data[0].timestamp || getCurrentTimestampISO(),
          source: 'quote',
          marketStatus
        };
      }
    }

    // If still no data, set error
    if (!priceData) {
      error = error || {
        serviceId: 'price-service',
        errorMessage: 'Failed to fetch current price from both APIs',
        timestamp: getCurrentTimestampISO()
      };
    }
  }

  return {
    price: priceData,
    error
  };
}

/**
 * Get current prices for multiple tickers
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {object} Map of ticker to price data
 */
export async function getCurrentPrices(tickers) {
  const prices = {};
  const errors = [];

  for (const ticker of tickers) {
    const result = await getCurrentPrice(ticker);

    if (result.price) {
      prices[ticker] = result.price;
    }

    if (result.error) {
      errors.push({
        ticker,
        ...result.error
      });
    }
  }

  return {
    prices,
    errors
  };
}

export default {
  getCurrentPrice,
  getCurrentPrices
};
