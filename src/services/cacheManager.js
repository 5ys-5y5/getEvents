// symbolCache and eventCache refresh logic (Feature 001)
// TrackedPriceCache management (Feature 002)
// Per FR-003, FR-004: Cache management with 7-day expiry and retry logic

import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { fetchApi } from './fmpClient.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';
import lockfile from 'proper-lockfile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const DOCS_DIR = join(PROJECT_ROOT, 'docs');
const SYMBOL_CACHE_PATH = join(DOCS_DIR, 'symbolCache.json');
const EVENT_CACHE_PATH = join(DOCS_DIR, 'getEventCache.json');
const TRACKED_PRICE_CACHE_PATH = join(DOCS_DIR, 'trackedPriceCache.json');
const BACKUP_DIR = join(DOCS_DIR, 'backups');

const CACHE_EXPIRY_DAYS = 7;
const MAX_RETRIES = 3;
const LOCK_OPTIONS = {
  retries: {
    retries: 3,
    minTimeout: 100,
    maxTimeout: 500
  }
};

// ===== FEATURE 001: Symbol Cache and Event Cache =====

async function ensureDocsDir() {
  if (!existsSync(DOCS_DIR)) {
    await mkdir(DOCS_DIR, { recursive: true });
  }
}

function isCacheExpired(timestamp, days) {
  const cacheDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - cacheDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= days;
}

export async function loadSymbolCache() {
  try {
    const content = await readFile(SYMBOL_CACHE_PATH, 'utf-8');
    const cached = JSON.parse(content);

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
    return {
      symbols: [],
      meta: {
        symbolCache_generated_at: null,
        totalCount: 0
      }
    };
  }
}

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

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await fetchApi(url, filterConfig.id);

    if (result.success) {
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
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  return {
    success: false,
    error: {
      serviceId: filterConfig.id,
      errorMessage: `Failed after ${MAX_RETRIES} retry attempts`,
      timestamp: getCurrentTimestampISO()
    }
  };
}

export async function getSymbolCache() {
  const cache = await loadSymbolCache();

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
    return {
      success: false,
      error: 'CACHE_FILE_CORRUPTED'
    };
  }
}

// ===== FEATURE 002: Tracked Price Cache =====

export async function loadTrackedPriceCache() {
  try {
    const content = await readFile(TRACKED_PRICE_CACHE_PATH, 'utf8');
    const cache = JSON.parse(content);

    // Validate cache structure
    if (!cache.meta || !Array.isArray(cache.trades) || !Array.isArray(cache.modelSummaries)) {
      throw new Error('Invalid cache structure: missing required fields');
    }

    return cache;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Cache file not found: ${TRACKED_PRICE_CACHE_PATH}. Run initialization first.`);
    }
    throw error;
  }
}

/**
 * Save tracked price cache to disk with file locking
 * Per VR-023: Atomic write with proper-lockfile
 *
 * @param {Object} cache - TrackedPriceCache object
 * @returns {Promise<void>}
 * @throws {Error} If lock acquisition fails or write fails
 */
export async function saveTrackedPriceCache(cache) {
  let release;

  try {
    // Acquire exclusive lock on cache file
    release = await lockfile.lock(TRACKED_PRICE_CACHE_PATH, LOCK_OPTIONS);

    // Write cache atomically (write to temp file, then rename)
    const tempPath = `${TRACKED_PRICE_CACHE_PATH}.tmp`;
    await writeFile(tempPath, JSON.stringify(cache, null, 2), 'utf8');
    await rename(tempPath, TRACKED_PRICE_CACHE_PATH);

    // Log successful write
    console.log(JSON.stringify({
      type: 'cache_write',
      totalTrades: cache.meta.totalTrades,
      totalModels: cache.meta.totalModels,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    if (error.code === 'ELOCKED') {
      throw new Error('Cache file is locked by another process. Retry after delay.');
    }
    throw error;
  } finally {
    // Always release lock
    if (release) {
      await release();
    }
  }
}

/**
 * Create timestamped backup of cache before modification
 * Per T014: Backup strategy for data safety
 *
 * @returns {Promise<string>} Path to backup file
 * @throws {Error} If backup directory doesn't exist or write fails
 */
export async function backupCache() {
  try {
    // Ensure backup directory exists
    await mkdir(BACKUP_DIR, { recursive: true });

    // Load current cache
    const cache = await loadTrackedPriceCache();

    // Create timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `trackedPriceCache-${timestamp}.json`);

    // Write backup
    await writeFile(backupPath, JSON.stringify(cache, null, 2), 'utf8');

    console.log(JSON.stringify({
      type: 'cache_backup',
      backupPath,
      totalTrades: cache.meta.totalTrades,
      timestamp: new Date().toISOString()
    }));

    return backupPath;
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * Merge new or updated trade record into cache
 * Per T015: Progressive update logic with uniqueness constraint
 *
 * Unique key: (position, modelName, ticker, purchaseDate)
 * If trade exists: merge priceHistory/returns arrays (replace nulls with actual data)
 * If trade new: append to trades array
 *
 * @param {Object} cache - Current TrackedPriceCache
 * @param {Object} newTrade - TradeRecord to merge
 * @returns {Object} Updated cache with merged trade
 */
export function mergeTradeRecord(cache, newTrade) {
  const { position, modelName, ticker, purchaseDate } = newTrade;

  // Find existing trade by unique key
  const existingIndex = cache.trades.findIndex(
    (t) =>
      t.position === position &&
      t.modelName === modelName &&
      t.ticker === ticker &&
      t.purchaseDate === purchaseDate
  );

  if (existingIndex === -1) {
    // New trade: append to array
    cache.trades.push(newTrade);
  } else {
    // Existing trade: merge arrays (replace nulls with actual data)
    const existing = cache.trades[existingIndex];

    // Merge priceHistory (replace nulls at each D+N index)
    for (let i = 0; i < 14; i++) {
      if (existing.priceHistory[i] === null && newTrade.priceHistory[i] !== null) {
        existing.priceHistory[i] = newTrade.priceHistory[i];
      }
    }

    // Merge returns (replace nulls at each D+N index)
    for (let i = 0; i < 14; i++) {
      if (existing.returns[i] === null && newTrade.returns[i] !== null) {
        existing.returns[i] = newTrade.returns[i];
      }
    }

    // Update metadata
    existing.meta.updatedAt = newTrade.meta.updatedAt;

    // Merge missingDates (union of arrays)
    const missingDatesSet = new Set([
      ...existing.meta.missingDates,
      ...newTrade.meta.missingDates
    ]);
    existing.meta.missingDates = Array.from(missingDatesSet);

    // Append new errors
    existing.meta.errors.push(...newTrade.meta.errors);

    // Update currentPrice if provided
    if (newTrade.currentPrice && newTrade.currentPrice !== existing.currentPrice) {
      existing.currentPrice = newTrade.currentPrice;
    }

    // Replace trade at index
    cache.trades[existingIndex] = existing;
  }

  // Update cache metadata
  cache.meta.totalTrades = cache.trades.length;
  cache.meta.lastUpdatedAt = new Date().toISOString();

  // Recalculate unique model count
  const uniqueModels = new Set(cache.trades.map((t) => t.modelName));
  cache.meta.totalModels = uniqueModels.size;

  return cache;
}

export default {
  getSymbolCache,
  loadSymbolCache,
  saveEventCache,
  loadEventCache,
  loadTrackedPriceCache,
  saveTrackedPriceCache,
  backupCache,
  mergeTradeRecord
};
