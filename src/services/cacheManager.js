// symbolCache and eventCache refresh logic
// Per FR-003, FR-004: Cache management with 7-day expiry and retry logic

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { fetchApi } from './fmpClient.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const DOCS_DIR = join(PROJECT_ROOT, 'docs');
const SYMBOL_CACHE_PATH = join(DOCS_DIR, 'symbolCache.json');
const EVENT_CACHE_PATH = join(DOCS_DIR, 'getEventCache.json');

const CACHE_EXPIRY_DAYS = 7;
const MAX_RETRIES = 3;

/**
 * Ensure docs directory exists
 */
async function ensureDocsDir() {
  if (!existsSync(DOCS_DIR)) {
    await mkdir(DOCS_DIR, { recursive: true });
  }
}

/**
 * Check if cache is older than specified days
 * Per FR-003: Check if symbolCache is 7+ days old
 *
 * @param {string} timestamp - ISO 8601 timestamp
 * @param {number} days - Number of days
 * @returns {boolean} True if cache is older than specified days
 */
function isCacheExpired(timestamp, days) {
  const cacheDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - cacheDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= days;
}

/**
 * Load symbol cache from disk
 * @returns {Promise<{symbols: Array, meta: Object}>}
 */
export async function loadSymbolCache() {
  try {
    const content = await readFile(SYMBOL_CACHE_PATH, 'utf-8');
    const cached = JSON.parse(content);

    // Convert ticker object to symbols array if needed
    if (cached.ticker && !cached.symbols) {
      const symbols = Object.entries(cached.ticker).map(([ticker, data]) => ({
        ticker,
        ...data
      }));
      return {
        symbols,
        meta: cached.meta
      };
    }

    return cached;
  } catch (error) {
    // Return empty cache if file doesn't exist
    return {
      symbols: [],
      meta: {
        symbolCache_generated_at: null,
        totalCount: 0
      }
    };
  }
}

/**
 * Save symbol cache to disk
 * @param {Array} symbols - Array of symbol objects
 * @returns {Promise<void>}
 */
async function saveSymbolCache(symbols) {
  await ensureDocsDir();

  const cache = {
    symbols,
    meta: {
      symbolCache_generated_at: getCurrentTimestampISO(),
      totalCount: symbols.length
    }
  };

  await writeFile(SYMBOL_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(JSON.stringify({
    type: 'cache_update',
    cache: 'symbolCache',
    count: symbols.length,
    timestamp: getCurrentTimestampISO()
  }));
}

/**
 * Refresh symbol cache from FMP API
 * Per FR-003, FR-004: Refresh with retry logic
 *
 * @returns {Promise<{success: boolean, symbols?: Array, error?: Object}>}
 */
async function refreshSymbolCache() {
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();

  if (!fmpApiKey) {
    return {
      success: false,
      error: {
        serviceId: 'fmp-company-screener',
        errorMessage: 'FMP_API_KEY environment variable not set',
        timestamp: getCurrentTimestampISO()
      }
    };
  }

  const filterConfig = apiList.filter.target['service-FMP'];
  const url = buildApiUrl(filterConfig.API, { fmpApiKey });

  // Retry up to MAX_RETRIES times
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await fetchApi(url, filterConfig.id);

    if (result.success) {
      // Map fields according to fieldMap
      const { fieldMap } = filterConfig;
      const symbols = Array.isArray(result.data) ? result.data.map(item => {
        const mapped = {};
        for (const [localKey, remoteKey] of Object.entries(fieldMap)) {
          mapped[localKey] = item[remoteKey];
        }
        return mapped;
      }) : [];

      await saveSymbolCache(symbols);

      return {
        success: true,
        symbols
      };
    }

    if (attempt < MAX_RETRIES) {
      console.log(JSON.stringify({
        type: 'cache_refresh_retry',
        attempt,
        maxRetries: MAX_RETRIES,
        serviceId: filterConfig.id,
        timestamp: getCurrentTimestampISO()
      }));
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  // All retries failed
  return {
    success: false,
    error: {
      serviceId: filterConfig.id,
      errorMessage: `Failed after ${MAX_RETRIES} retry attempts`,
      timestamp: getCurrentTimestampISO()
    }
  };
}

/**
 * Get symbol cache, refreshing if necessary
 * Per FR-003, FR-004: Auto-refresh if expired
 *
 * @returns {Promise<{symbols: Array, refreshError?: Object}>}
 */
export async function getSymbolCache() {
  const cache = await loadSymbolCache();

  // Check if cache needs refresh
  const needsRefresh = !cache.meta.symbolCache_generated_at ||
                       isCacheExpired(cache.meta.symbolCache_generated_at, CACHE_EXPIRY_DAYS);

  if (needsRefresh) {
    console.log(JSON.stringify({
      type: 'cache_refresh_needed',
      cache: 'symbolCache',
      reason: cache.meta.symbolCache_generated_at ? 'expired' : 'missing',
      timestamp: getCurrentTimestampISO()
    }));

    const refreshResult = await refreshSymbolCache();

    if (refreshResult.success) {
      return { symbols: refreshResult.symbols };
    } else {
      // Per FR-004: Use stale cache if refresh fails
      console.error(JSON.stringify({
        type: 'cache_refresh_failed',
        cache: 'symbolCache',
        usingStaleCache: cache.symbols.length > 0,
        timestamp: getCurrentTimestampISO()
      }));

      return {
        symbols: cache.symbols,
        refreshError: refreshResult.error
      };
    }
  }

  return { symbols: cache.symbols };
}

/**
 * Save event cache to disk
 * Per FR-008: Save successful getEvent results
 *
 * @param {Object} meta - Metadata object
 * @param {Array} events - Array of event records
 * @returns {Promise<void>}
 */
export async function saveEventCache(meta, events) {
  await ensureDocsDir();

  const cache = { meta, events };
  await writeFile(EVENT_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log(JSON.stringify({
    type: 'cache_update',
    cache: 'eventCache',
    eventCount: events.length,
    timestamp: getCurrentTimestampISO()
  }));
}

/**
 * Load event cache from disk
 * Per FR-009, FR-010: Load cached getEvent results
 *
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function loadEventCache() {
  try {
    if (!existsSync(EVENT_CACHE_PATH)) {
      return {
        success: false,
        error: 'GET_EVENT_CACHE_NOT_AVAILABLE'
      };
    }

    const content = await readFile(EVENT_CACHE_PATH, 'utf-8');
    const data = JSON.parse(content);

    return {
      success: true,
      data
    };
  } catch (error) {
    // File exists but parsing failed
    return {
      success: false,
      error: 'CACHE_FILE_CORRUPTED'
    };
  }
}

export default {
  getSymbolCache,
  loadSymbolCache,
  saveEventCache,
  loadEventCache
};
