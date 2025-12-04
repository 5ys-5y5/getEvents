// FMP API client with retry logic and rate limiting
// Per spec.md (FR-024, FR-025)

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { RATE_LIMIT, BATCH, ADAPTIVE_RATE } from '../config/appConfig.js';

// Configure axios with retry logic
const client = axios.create({
  timeout: RATE_LIMIT.API_TIMEOUT_MS,
});

// Retry failed requests
axiosRetry(client, {
  retries: RATE_LIMIT.MAX_RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response?.status >= 500);
  }
});

// Global rate limiter (from config)
const RATE_LIMIT_PER_MINUTE = RATE_LIMIT.FMP_REQUESTS_PER_MINUTE;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT.FMP_WINDOW_MS;
const requestTimestamps = []; // For rate limiting (1 minute window)

// ============================================
// THROUGHPUT-BASED ADAPTIVE RATE LIMITING
// ============================================
// Measures actual throughput and converges to target rate

// Separate timestamps for throughput measurement (keep longer history)
const throughputTimestamps = []; // Keep last 2 minutes for accurate measurement
const MAX_THROUGHPUT_HISTORY_MS = 120000; // 2 minutes

// Throughput measurement state
const throughputWindow = []; // {timestamp, count} entries for measuring actual throughput
let currentDelayMs = ADAPTIVE_RATE.INITIAL_DELAY_MS || 200; // Start with conservative delay
let lastThroughputLog = 0;
let totalRequestsProcessed = 0;
let adaptiveCallCount = 0; // Counter for adaptive rate limiting

// PID-like controller state for smooth convergence
let integralError = 0;
let lastError = 0;

// Store last measured throughput for fallback
let lastMeasuredThroughput = { throughputPerSec: 0, throughputPerMin: 0 };

// Endpoint-specific settings (can be customized per endpoint)
const endpointSettings = {
  'fmp-historical-price-eod': {
    // Historical price API - can be faster, less critical
    targetMultiplier: 0.95, // 95% of limit
    initialDelay: 150,
    minDelay: 10,
    maxDelay: 1000
  },
  'default': {
    // Default settings for other endpoints
    targetMultiplier: 0.90, // 90% of limit (more conservative)
    initialDelay: 200,
    minDelay: 20,
    maxDelay: 2000
  }
};

/**
 * Clean up old throughput timestamps (keep last 2 minutes)
 */
function cleanupThroughputTimestamps() {
  const now = Date.now();
  const cutoff = now - MAX_THROUGHPUT_HISTORY_MS;
  while (throughputTimestamps.length > 0 && throughputTimestamps[0] < cutoff) {
    throughputTimestamps.shift();
  }
}

/**
 * Get current throughput (requests per second) over the measurement window
 * Uses throughputTimestamps which keeps longer history than requestTimestamps
 * @returns {{ throughputPerSec: number, throughputPerMin: number, windowSize: number }}
 */
function getCurrentThroughput() {
  const now = Date.now();
  cleanupThroughputTimestamps();
  
  // Use 30-second window for stable measurement
  const windowMs = ADAPTIVE_RATE.THROUGHPUT_WINDOW_SEC * 1000 || 30000; // Default 30 sec window
  const windowStart = now - windowMs;
  const minWindowMs = 5000; // Minimum 5 seconds for accurate measurement
  
  // Filter timestamps within window
  const recentTimestamps = throughputTimestamps.filter(ts => ts >= windowStart);
  const requestsInWindow = recentTimestamps.length;
  
  if (requestsInWindow === 0) {
    // No data yet - use last measured value
    return {
      throughputPerSec: lastMeasuredThroughput.throughputPerSec,
      throughputPerMin: lastMeasuredThroughput.throughputPerMin,
      windowSize: 0,
      requestsInWindow: 0,
      actualWindowMs: 0
    };
  }
  
  // Calculate actual time window
  const oldestTimestamp = recentTimestamps[0];
  const newestTimestamp = recentTimestamps[recentTimestamps.length - 1];
  let actualWindowMs = now - oldestTimestamp;
  
  // If we have at least 2 timestamps, use time span between them for more accurate rate
  let timeSpan = actualWindowMs;
  if (requestsInWindow >= 2) {
    const spanBetweenTimestamps = newestTimestamp - oldestTimestamp;
    if (spanBetweenTimestamps > 0) {
      // Use time span between first and last timestamp for rate calculation
      timeSpan = spanBetweenTimestamps;
    }
  }
  
  // If window is too short, use minimum window time for projection
  if (timeSpan < minWindowMs && requestsInWindow >= 2) {
    // Project based on current rate
    const currentRate = requestsInWindow / timeSpan;
    const projectedRequests = currentRate * minWindowMs;
    const throughputPerSec = projectedRequests / (minWindowMs / 1000);
    const throughputPerMin = throughputPerSec * 60;
    
    const result = {
      throughputPerSec,
      throughputPerMin,
      windowSize: requestsInWindow,
      requestsInWindow,
      actualWindowMs: minWindowMs
    };
    
    lastMeasuredThroughput = { throughputPerSec, throughputPerMin };
    return result;
  }
  
  // Calculate throughput using actual window
  const throughputPerSec = timeSpan > 0 
    ? (requestsInWindow / timeSpan) * 1000 
    : 0;
  const throughputPerMin = throughputPerSec * 60;
  
  const result = {
    throughputPerSec,
    throughputPerMin,
    windowSize: requestsInWindow,
    requestsInWindow,
    actualWindowMs: timeSpan
  };
  
  lastMeasuredThroughput = { throughputPerSec, throughputPerMin };
  return result;
}

/**
 * Record throughput data point for a single API call
 * This is called immediately after each API call completes
 * @param {number} count - Number of requests (usually 1 for single call)
 */
function recordThroughput(count = 1) {
  const now = Date.now();
  throughputWindow.push({
    timestamp: now,
    count: count
  });
  totalRequestsProcessed += count;
  
  // Clean up old entries (keep only last 2 minutes for accurate measurement)
  const twoMinutesAgo = now - 120000;
  while (throughputWindow.length > 0 && throughputWindow[0].timestamp < twoMinutesAgo) {
    throughputWindow.shift();
  }
}

/**
 * Record throughput for a batch of requests
 * @param {number} batchSize - Number of requests completed in this batch
 */
function recordBatchThroughput(batchSize) {
  recordThroughput(batchSize);
}

/**
 * Check if we can make a request within rate limits
 * Removes timestamps older than 1 minute and checks count
 * @returns {boolean} true if request is allowed
 */
function canMakeRequest() {
  const now = Date.now();
  const oneMinuteAgo = now - RATE_LIMIT_WINDOW_MS;

  // Remove timestamps older than 1 minute
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }

  return requestTimestamps.length < RATE_LIMIT_PER_MINUTE;
}

/**
 * Record a request timestamp
 * Records in both requestTimestamps (for rate limiting) and throughputTimestamps (for throughput measurement)
 */
function recordRequest() {
  const now = Date.now();
  requestTimestamps.push(now);
  throughputTimestamps.push(now);
  adaptiveCallCount++;
  
  // Clean up throughput timestamps periodically
  if (throughputTimestamps.length % 100 === 0) {
    cleanupThroughputTimestamps();
  }
}

/**
 * Get current rate usage info
 * @returns {{ current: number, limit: number, usage: number, available: number }}
 */
export function getCurrentRateUsage() {
  const now = Date.now();
  const oneMinuteAgo = now - RATE_LIMIT_WINDOW_MS;

  // Clean up old timestamps
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }

  const current = requestTimestamps.length;
  const usage = current / RATE_LIMIT_PER_MINUTE;
  const available = RATE_LIMIT_PER_MINUTE - current;

  return { current, limit: RATE_LIMIT_PER_MINUTE, usage, available };
}

/**
 * Get adaptive batch settings based on REAL-TIME THROUGHPUT measurement
 * Uses PID-like controller to converge to target rate (250 req/min)
 * Dynamically adjusts based on actual API call rate
 * Supports endpoint-specific settings
 * 
 * @param {string} endpointId - Optional endpoint identifier for custom settings
 * @returns {{ batchSize: number, delayMs: number, message: string, stats: Object }}
 */
export function getAdaptiveBatchSettings(endpointId = 'default') {
  const config = ADAPTIVE_RATE;
  const { usage, current } = getCurrentRateUsage();
  const { throughputPerSec, throughputPerMin, requestsInWindow, actualWindowMs } = getCurrentThroughput();
  
  // Get endpoint-specific settings
  const endpointConfig = endpointSettings[endpointId] || endpointSettings['default'];
  
  // Target: 250 req/min = 4.17 req/sec, with endpoint-specific multiplier
  const targetPerMin = config.TARGET_REQUESTS_PER_MIN || (RATE_LIMIT_PER_MINUTE * endpointConfig.targetMultiplier);
  const targetPerSec = targetPerMin / 60;
  
  // Calculate how close we are to the limit (0.0 = no usage, 1.0 = at limit)
  const usageRatio = current / RATE_LIMIT_PER_MINUTE;
  const throughputRatio = throughputPerMin / targetPerMin;
  
  // Dynamic batch size: increase when far from limit, decrease when close
  const baseBatchSize = config.BATCH_SIZE || 10;
  let batchSize = baseBatchSize;
  
  // Adjust batch size based on how close we are to limit
  if (usageRatio < 0.5) {
    // Far from limit - can use larger batches
    batchSize = Math.min(baseBatchSize * 2, 20);
  } else if (usageRatio < 0.7) {
    // Moderate usage - use normal batches
    batchSize = baseBatchSize;
  } else if (usageRatio < 0.85) {
    // Getting close - reduce batch size
    batchSize = Math.max(Math.floor(baseBatchSize * 0.7), 5);
  } else {
    // Very close to limit - use small batches
    batchSize = Math.max(Math.floor(baseBatchSize * 0.5), 3);
  }
  
  // PID-like controller for delay adjustment
  // Adjust gains based on proximity to limit
  let Kp = config.PID_KP || 50;
  let Ki = config.PID_KI || 5;
  let Kd = config.PID_KD || 10;
  
  // Reduce aggressiveness as we approach the limit
  if (usageRatio > 0.8) {
    // Close to limit - be more conservative
    Kp *= 0.5;
    Ki *= 0.5;
    Kd *= 0.5;
  } else if (usageRatio > 0.6) {
    // Moderate usage - slightly reduce gains
    Kp *= 0.7;
    Ki *= 0.7;
    Kd *= 0.7;
  }
  
  // Calculate error (positive = too slow, negative = too fast)
  const error = targetPerSec - throughputPerSec;
  
  // Update integral (with anti-windup)
  const maxIntegral = config.MAX_INTEGRAL || 100;
  integralError = Math.max(-maxIntegral, Math.min(maxIntegral, integralError + error));
  
  // Calculate derivative
  const derivative = error - lastError;
  lastError = error;
  
  // PID output: negative means we need to go faster (reduce delay)
  const pidOutput = -(Kp * error + Ki * integralError + Kd * derivative);
  
  // Apply PID output to delay (use endpoint-specific min/max)
  const minDelay = endpointConfig.minDelay || config.MIN_DELAY_MS || 10;
  const maxDelay = endpointConfig.maxDelay || config.MAX_DELAY_MS || 2000;
  
  // Adjust delay: if we're too slow, reduce delay; if too fast, increase delay
  let newDelay = currentDelayMs + pidOutput;
  
  // Additional safety: if we're close to limit, increase delay more aggressively
  if (usageRatio > 0.85) {
    // Very close to limit - add extra delay
    newDelay += 50;
  } else if (usageRatio > 0.7) {
    // Getting close - add moderate delay
    newDelay += 20;
  }
  
  newDelay = Math.max(minDelay, Math.min(maxDelay, newDelay));
  
  // Smooth the delay change (exponential moving average)
  // Use less smoothing when far from limit for faster response
  const smoothing = usageRatio > 0.8 ? 0.5 : (config.DELAY_SMOOTHING || 0.3);
  currentDelayMs = currentDelayMs * (1 - smoothing) + newDelay * smoothing;
  
  // Calculate efficiency metrics
  const efficiency = targetPerSec > 0 ? (throughputPerSec / targetPerSec) * 100 : 0;
  
  // Determine mode based on efficiency and usage
  let mode;
  if (usageRatio > 0.9) mode = 'Near Limit';
  else if (efficiency >= 90) mode = 'Optimal';
  else if (efficiency >= 70) mode = 'Fast';
  else if (efficiency >= 50) mode = 'Moderate';
  else if (efficiency >= 30) mode = 'Slow';
  else mode = 'Starting';
  
  // Log at configured interval
  const logInterval = config.LOG_INTERVAL || 10;
  if (totalRequestsProcessed - lastThroughputLog >= logInterval) {
    console.log(JSON.stringify({
      type: 'throughput_adaptive',
      throughput: {
        perSec: throughputPerSec.toFixed(2),
        perMin: throughputPerMin.toFixed(1),
        target: targetPerMin.toFixed(0)
      },
      efficiency: `${efficiency.toFixed(1)}%`,
      delay: Math.round(currentDelayMs),
      batchSize,
      mode,
      rateLimit: `${current}/${RATE_LIMIT_PER_MINUTE}`,
      usageRatio: usageRatio.toFixed(2),
      pid: {
        error: error.toFixed(2),
        integral: integralError.toFixed(2),
        output: pidOutput.toFixed(2)
      },
      timestamp: new Date().toISOString()
    }));
    lastThroughputLog = totalRequestsProcessed;
  }
  
  return {
    batchSize,
    delayMs: Math.round(currentDelayMs),
    message: `${mode} (${efficiency.toFixed(0)}% efficiency, ${throughputPerMin.toFixed(0)}/${targetPerMin.toFixed(0)} req/min, usage: ${(usageRatio * 100).toFixed(0)}%)`,
    stats: {
      throughputPerSec,
      throughputPerMin,
      targetPerMin,
      efficiency,
      mode,
      delay: Math.round(currentDelayMs),
      usageRatio
    }
  };
}

/**
 * Notify the adaptive controller that a batch was completed
 * Note: Individual API calls are already recorded via fetchApi()
 * This is kept for backward compatibility but may not be needed
 * @param {number} batchSize - Number of requests completed
 */
export function notifyBatchComplete(batchSize) {
  // Individual calls are already recorded in fetchApi()
  // This function is kept for backward compatibility
  // No need to double-count
}

/**
 * Reset adaptive rate controller state
 * Call at the start of a new refresh operation
 * @param {string} endpointId - Optional endpoint identifier for custom initial delay
 */
export function resetAdaptiveController(endpointId = 'default') {
  throughputWindow.length = 0;
  // throughputTimestamps는 유지 (다른 엔드포인트에서 사용할 수 있음)
  
  // Use endpoint-specific initial delay
  const endpointConfig = endpointSettings[endpointId] || endpointSettings['default'];
  currentDelayMs = endpointConfig.initialDelay || ADAPTIVE_RATE.INITIAL_DELAY_MS || 200;
  
  integralError = 0;
  lastError = 0;
  lastThroughputLog = 0;
  totalRequestsProcessed = 0;
  lastMeasuredThroughput = { throughputPerSec: 0, throughputPerMin: 0 };
  console.log(JSON.stringify({
    type: 'adaptive_controller_reset',
    endpointId,
    initialDelay: currentDelayMs,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Wait until we can make a request within rate limits
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
  while (!canMakeRequest()) {
    // Calculate wait time until oldest request expires
    const now = Date.now();
    const oldestRequest = requestTimestamps[0];
    const waitTime = Math.max(100, oldestRequest + RATE_LIMIT_WINDOW_MS - now);

    console.log(JSON.stringify({
      type: 'rate_limit_wait',
      message: `Rate limit reached (${requestTimestamps.length}/${RATE_LIMIT_PER_MINUTE} req/min), waiting ${waitTime}ms`,
      timestamp: new Date().toISOString()
    }));

    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

/**
 * Fetch data from an API endpoint
 * Per FR-026: Log errors with service context
 * Enforces global rate limit of 250 req/min
 * Records actual API call throughput for adaptive rate limiting
 *
 * @param {string} url - Full API URL with parameters
 * @param {string} serviceId - Service identifier for error tracking
 * @returns {Promise<{success: boolean, data?: any, error?: Object}>}
 */
export async function fetchApi(url, serviceId) {
  // Wait for rate limit before making request
  await waitForRateLimit();

  // Record this request timestamp for rate limiting
  recordRequest();

  const startTime = Date.now();

  try {
    const response = await client.get(url);
    const duration = Date.now() - startTime;

    // Record actual API call completion for throughput measurement
    // This is critical for adaptive rate limiting to work correctly
    recordThroughput(1);

    // Log successful API call
    console.log(JSON.stringify({
      type: 'api_call',
      serviceId,
      url: url.split('?')[0], // Log URL without query params (hides API key)
      statusCode: response.status,
      duration: `${duration}ms`,
      rateLimit: `${requestTimestamps.length}/${RATE_LIMIT_PER_MINUTE}`,
      timestamp: new Date().toISOString()
    }));

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record failed API call too (for accurate throughput measurement)
    recordThroughput(1);

    // Per FR-026: Include reproduction context in error
    const errorInfo = {
      type: 'api_error',
      serviceId,
      url: url.split('?')[0],
      statusCode: error.response?.status || 'NETWORK_ERROR',
      errorMessage: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    console.error(JSON.stringify(errorInfo));

    return {
      success: false,
      error: {
        serviceId,
        statusCode: error.response?.status || 0,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Fetch data from multiple API endpoints in parallel
 * Respects 4 req/s parallel limit per spec
 *
 * @param {Array<{url: string, serviceId: string}>} requests - Array of API requests
 * @returns {Promise<Array<{serviceId: string, success: boolean, data?: any, error?: Object}>>}
 */
export async function fetchMultiple(requests) {
  // Process in batches of 4 to respect rate limits
  const BATCH_SIZE = BATCH.FMP_PARALLEL_BATCH_SIZE;
  const results = [];

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(({ url, serviceId }) =>
        fetchApi(url, serviceId).then(result => ({
          serviceId,
          ...result
        }))
      )
    );
    results.push(...batchResults);
  }

  return results;
}

export default {
  fetchApi,
  fetchMultiple,
  getCurrentRateUsage,
  getAdaptiveBatchSettings
};

/**
 * Get historical OHLC data for a specific date
 * Per data-model.md: Fetch daily open, high, low, close prices
 *
 * @param {string} ticker - Stock symbol (uppercase)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data?: {open: number, high: number, low: number, close: number, date: string}, error?: Object}>}
 *
 * @example
 * const result = await getHistoricalOHLC('AAPL', '2025-11-01');
 * if (result.success) {
 *   console.log(result.data); // { open: 150.25, high: 152.50, low: 149.75, close: 151.00, date: '2025-11-01' }
 * }
 */
/**
 * Get historical OHLC data for a date range (OPTIMIZED for multiple days)
 * Uses ApiList.json getQuantitiveValuation.getLastPrice API
 * Per performance requirement: Single API call for D+1 to D+14 data
 *
 * @param {string} ticker - Stock symbol
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, data?: Array, error?: Object}>}
 *
 * @example
 * const result = await getHistoricalOHLCRange('AAPL', '2025-11-01', '2025-11-20');
 * // Returns: { success: true, data: [{date, open, high, low, close}, ...] }
 */
export async function getHistoricalOHLCRange(ticker, fromDate, toDate) {
  if (!ticker || typeof ticker !== 'string') {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc_range',
        statusCode: 400,
        errorMessage: 'ticker must be a non-empty string',
        timestamp: new Date().toISOString()
      }
    };
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!fromDate || typeof fromDate !== 'string' || !datePattern.test(fromDate)) {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc_range',
        statusCode: 400,
        errorMessage: 'fromDate must be in YYYY-MM-DD format',
        timestamp: new Date().toISOString()
      }
    };
  }

  if (!toDate || typeof toDate !== 'string' || !datePattern.test(toDate)) {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc_range',
        statusCode: 400,
        errorMessage: 'toDate must be in YYYY-MM-DD format',
        timestamp: new Date().toISOString()
      }
    };
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc_range',
        statusCode: 500,
        errorMessage: 'FMP_API_KEY environment variable not set',
        timestamp: new Date().toISOString()
      }
    };
  }

  // ApiList.json: getQuantitiveValuation.getLastPrice.service-FMP
  // API: https://financialmodelingprep.com/api/v3/historical-price-full/{ticker}?from={fromDate}&to={toDate}
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${fromDate}&to=${toDate}&apikey=${apiKey}`;

  const result = await fetchApi(url, 'fmp-historical-price-eod');

  if (!result.success) {
    return result;
  }

  // FMP returns: { symbol: "AAPL", historical: [{ date, open, high, low, close, ... }] }
  const historical = result.data?.historical;

  if (!historical || !Array.isArray(historical)) {
    return {
      success: false,
      error: {
        serviceId: 'fmp-historical-price-eod',
        statusCode: 404,
        errorMessage: `No historical data found for ${ticker} from ${fromDate} to ${toDate}`,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Sort by date ascending (FMP returns descending)
  historical.sort((a, b) => a.date.localeCompare(b.date));

  // Return array of OHLC data with standardized field names
  const data = historical.map(h => ({
    date: h.date,
    open: h.open,
    high: h.high,
    low: h.low,
    close: h.close,
    volume: h.volume,
    change: h.change,
    changePercent: h.changePercent
  }));

  return {
    success: true,
    data
  };
}

/**
 * Get historical OHLC data for a single date (legacy function, uses range query)
 * @param {string} ticker - Stock symbol
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data?: Object, error?: Object}>}
 */
export async function getHistoricalOHLC(ticker, date) {
  if (!ticker || typeof ticker !== 'string') {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc',
        statusCode: 400,
        errorMessage: 'ticker must be a non-empty string',
        timestamp: new Date().toISOString()
      }
    };
  }

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc',
        statusCode: 400,
        errorMessage: 'date must be in YYYY-MM-DD format',
        timestamp: new Date().toISOString()
      }
    };
  }

  // Use range query for single date (same from/to)
  const rangeResult = await getHistoricalOHLCRange(ticker, date, date);

  if (!rangeResult.success) {
    return rangeResult;
  }

  // Find exact date match (should be first/only element)
  const matchingData = rangeResult.data.find(d => d.date === date);

  if (!matchingData) {
    return {
      success: false,
      error: {
        serviceId: 'fmp_historical_ohlc',
        statusCode: 404,
        errorMessage: `No historical data found for ${ticker} on ${date}`,
        timestamp: new Date().toISOString()
      }
    };
  }

  return {
    success: true,
    data: matchingData
  };
}
