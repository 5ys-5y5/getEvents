// FMP API client with retry logic and rate limiting
// Per spec.md (FR-024, FR-025)
// Global rate limit: 200 requests per minute (FMP limit: 300/min)

import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configure axios with retry logic
const client = axios.create({
  timeout: 30000, // 30 second timeout
});

// Retry failed requests up to 3 times
axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response?.status >= 500);
  }
});

// Global rate limiter: 200 requests per minute
const RATE_LIMIT_PER_MINUTE = 200;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const requestTimestamps = [];

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
 */
function recordRequest() {
  requestTimestamps.push(Date.now());
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
 * Enforces global rate limit of 200 req/min
 *
 * @param {string} url - Full API URL with parameters
 * @param {string} serviceId - Service identifier for error tracking
 * @returns {Promise<{success: boolean, data?: any, error?: Object}>}
 */
export async function fetchApi(url, serviceId) {
  // Wait for rate limit before making request
  await waitForRateLimit();

  // Record this request
  recordRequest();

  const startTime = Date.now();

  try {
    const response = await client.get(url);
    const duration = Date.now() - startTime;

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
  const BATCH_SIZE = 4;
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
  fetchMultiple
};
