/**
 * TypeScript-style JSDoc type definitions for Price Tracker entities
 * Per data-model.md: 6 entities with validation rules
 *
 * These JSDoc types enable IntelliSense in VS Code and type checking
 * without requiring TypeScript compilation
 */

/**
 * Price History - Daily OHLC price data for D+N horizons
 * @typedef {Object} PriceHistory
 * @property {string} targetDate - Intended D+N date (YYYY-MM-DD)
 * @property {string|null} actualDate - Actual trading day used (null if future)
 * @property {number|null} open - Opening price (null if future)
 * @property {number|null} high - Intraday high (null if future)
 * @property {number|null} low - Intraday low (null if future)
 * @property {number|null} close - Closing price (null if future)
 */

/**
 * Return Record - Position-specific return calculation with cap-aware tracking
 * @typedef {Object} ReturnRecord
 * @property {string} date - Return calculation date (matches PriceHistory.actualDate)
 * @property {number|null} returnRate - Daily return rate (null if future)
 * @property {'close'|'open_maxCap'|'open_lowCap'|null} returnSource - Price type used
 * @property {number|null} cumulativeReturn - Cumulative return from purchase date
 */

/**
 * Trade Metadata - Collection metadata
 * @typedef {Object} TradeMetadata
 * @property {string} createdAt - Trade creation timestamp (ISO 8601, UTC)
 * @property {string} updatedAt - Last update timestamp (ISO 8601, UTC)
 * @property {string[]} missingDates - D+N dates with no trading day within 7 days
 * @property {Array<{timestamp: string, message: string, code: string}>} errors - Collection errors
 */

/**
 * Trade Record - Individual trade entry with position-specific metadata
 * Unique key: (position, modelName, ticker, purchaseDate)
 *
 * @typedef {Object} TradeRecord
 * @property {'long'|'short'} position - Trading direction
 * @property {string} modelName - Model identifier (e.g., "MODEL-0")
 * @property {string} ticker - Stock symbol (uppercase)
 * @property {string} purchaseDate - Trade entry date (YYYY-MM-DD, UTC)
 * @property {number} currentPrice - Purchase date open price
 * @property {Array<PriceHistory|null>} priceHistory - OHLC data for D+1 to D+14
 * @property {Array<ReturnRecord|null>} returns - Position-specific returns for D+1 to D+14
 * @property {TradeMetadata} meta - Collection metadata
 */

/**
 * Model Summary - Aggregated performance metrics per model
 * @typedef {Object} ModelSummary
 * @property {string} modelName - Model identifier (e.g., "MODEL-0")
 * @property {number} tradeCount - Total trades for this model
 * @property {number|null} suggestedMaxCap - 20th percentile of returns (null if tradeCount < 3)
 * @property {number|null} suggestedLowCap - 5th percentile of returns (null if tradeCount < 3)
 * @property {number|null} avgReturn - Mean of all completed returns
 * @property {number|null} winRate - Proportion of positive returns (0.0 to 1.0)
 */

/**
 * Cache Meta - Cache-level metadata
 * @typedef {Object} CacheMeta
 * @property {string|null} lastUpdatedAt - Last cache update timestamp (ISO 8601, UTC)
 * @property {number} totalTrades - Total number of trades in cache
 * @property {number} totalModels - Number of unique models
 * @property {string} cacheVersion - Schema version (semantic versioning)
 */

/**
 * Tracked Price Cache - File-based cache structure (docs/trackedPriceCache.json)
 * @typedef {Object} TrackedPriceCache
 * @property {CacheMeta} meta - Cache-level metadata
 * @property {TradeRecord[]} trades - All tracked trades
 * @property {ModelSummary[]} modelSummaries - Aggregated model stats
 */

/**
 * Analyst Log Metadata - Checkpoint metadata for fault tolerance
 * @typedef {Object} AnalystLogMetadata
 * @property {string} lastSavedAt - Last checkpoint time (ISO 8601, UTC)
 * @property {number} totalRecords - Total analyst records processed
 * @property {string} lastProcessedId - Resume point identifier (e.g., "analyst_250000")
 * @property {100} checkpointBatchSize - Records per checkpoint (fixed at 100)
 */

/**
 * HTTP 207 Multi-Status Trade Result - Per-trade status in batch response
 * @typedef {Object} TradeResult
 * @property {number} index - Zero-based index of trade in request
 * @property {200|400|404|500} status - HTTP status code for this specific trade
 * @property {Object} trade - Input trade data (position, modelName, ticker, purchaseDate)
 * @property {Object} [data] - Trade data if status 200 (currentPrice, priceHistory, returns)
 * @property {Object} [error] - Error details if status not 200 (message, code)
 */

/**
 * HTTP 207 Multi-Status Batch Response
 * @typedef {Object} BatchResponse
 * @property {TradeResult[]} results - Per-trade results array
 * @property {{total: number, succeeded: number, failed: number}} summary - Batch summary
 */

// Export empty object to make this a module
export {};
