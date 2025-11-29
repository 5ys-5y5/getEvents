/**
 * JSON Schema definitions for validation
 * Data model schemas for Price Tracker feature
 *
 * Per data-model.md: 6 entities with 26 validation rules
 */

/**
 * PriceHistory Schema (per data-model.md section 2)
 * VR-006 to VR-011: Field validations and trading day logic
 */
export const PriceHistorySchema = {
  type: 'object',
  required: ['targetDate'],
  properties: {
    targetDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Intended D+N date (YYYY-MM-DD)',
    },
    actualDate: {
      type: ['string', 'null'],
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Actual trading day used (null if future date)',
    },
    open: {
      type: ['number', 'null'],
      minimum: 0,
      exclusiveMinimum: true,
      description: 'Opening price (null if future date)',
    },
    high: {
      type: ['number', 'null'],
      minimum: 0,
      exclusiveMinimum: true,
      description: 'Intraday high (null if future date)',
    },
    low: {
      type: ['number', 'null'],
      minimum: 0,
      exclusiveMinimum: true,
      description: 'Intraday low (null if future date)',
    },
    close: {
      type: ['number', 'null'],
      minimum: 0,
      exclusiveMinimum: true,
      description: 'Closing price (null if future date)',
    },
  },
};

/**
 * ReturnRecord Schema (per data-model.md section 3)
 * VR-012 to VR-015: Cap-aware return calculation logic
 */
export const ReturnRecordSchema = {
  type: 'object',
  required: ['date'],
  properties: {
    date: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Return calculation date (matches PriceHistory.actualDate)',
    },
    returnRate: {
      type: ['number', 'null'],
      description: 'Daily return rate (null if future date)',
    },
    returnSource: {
      type: ['string', 'null'],
      enum: ['close', 'open_maxCap', 'open_lowCap', null],
      description: 'Price type used for calculation',
    },
    cumulativeReturn: {
      type: ['number', 'null'],
      description: 'Cumulative return from purchase date (null if future date)',
    },
  },
};

/**
 * TradeMetadata Schema
 * Collection metadata per data-model.md
 */
export const TradeMetadataSchema = {
  type: 'object',
  required: ['createdAt', 'updatedAt', 'missingDates', 'errors'],
  properties: {
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Trade creation timestamp (ISO 8601, UTC)',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Last update timestamp (ISO 8601, UTC)',
    },
    missingDates: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      description: 'D+N dates with no trading day within 7 days',
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          message: { type: 'string' },
          code: { type: 'string' },
        },
      },
      description: 'Collection errors encountered',
    },
  },
};

/**
 * TradeRecord Schema (per data-model.md section 1)
 * VR-001 to VR-005: Core trade record validations
 * Unique key: (position, modelName, ticker, purchaseDate)
 */
export const TradeRecordSchema = {
  type: 'object',
  required: [
    'position',
    'modelName',
    'ticker',
    'purchaseDate',
    'currentPrice',
    'priceHistory',
    'returns',
    'meta',
  ],
  properties: {
    position: {
      type: 'string',
      enum: ['long', 'short'],
      description: 'Trading direction',
    },
    modelName: {
      type: 'string',
      pattern: '^MODEL-\\d+$',
      description: 'Model identifier (e.g., MODEL-0)',
    },
    ticker: {
      type: 'string',
      pattern: '^[A-Z]+$',
      description: 'Stock symbol (uppercase)',
    },
    purchaseDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Trade entry date (YYYY-MM-DD, UTC)',
    },
    currentPrice: {
      type: 'number',
      minimum: 0,
      exclusiveMinimum: true,
      description: 'Purchase date open price (up to 4 decimal places)',
    },
    priceHistory: {
      type: 'array',
      minItems: 14,
      maxItems: 14,
      items: {
        oneOf: [PriceHistorySchema, { type: 'null' }],
      },
      description: 'OHLC data for D+1 to D+14 (nulls for future dates)',
    },
    returns: {
      type: 'array',
      minItems: 14,
      maxItems: 14,
      items: {
        oneOf: [ReturnRecordSchema, { type: 'null' }],
      },
      description: 'Position-specific returns for D+1 to D+14 (nulls for future dates)',
    },
    meta: TradeMetadataSchema,
  },
};

/**
 * ModelSummary Schema (per data-model.md section 4)
 * VR-016 to VR-019: Aggregated performance metrics with percentile calculations
 */
export const ModelSummarySchema = {
  type: 'object',
  required: [
    'modelName',
    'tradeCount',
    'suggestedMaxCap',
    'suggestedLowCap',
    'avgReturn',
    'winRate',
  ],
  properties: {
    modelName: {
      type: 'string',
      pattern: '^MODEL-\\d+$',
      description: 'Model identifier',
    },
    tradeCount: {
      type: 'integer',
      minimum: 0,
      description: 'Total trades for this model',
    },
    suggestedMaxCap: {
      type: ['number', 'null'],
      description: '20th percentile of all returns (null if tradeCount < 3)',
    },
    suggestedLowCap: {
      type: ['number', 'null'],
      description: '5th percentile of all returns (null if tradeCount < 3)',
    },
    avgReturn: {
      type: ['number', 'null'],
      description: 'Mean of all completed returns (null if no returns)',
    },
    winRate: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 1,
      description: 'Proportion of positive returns (null if no returns)',
    },
  },
};

/**
 * CacheMeta Schema (per data-model.md section 5)
 * Cache-level metadata for TrackedPriceCache
 */
export const CacheMetaSchema = {
  type: 'object',
  required: ['lastUpdatedAt', 'totalTrades', 'totalModels', 'cacheVersion'],
  properties: {
    lastUpdatedAt: {
      type: ['string', 'null'],
      format: 'date-time',
      description: 'Last cache update timestamp (ISO 8601, UTC)',
    },
    totalTrades: {
      type: 'integer',
      minimum: 0,
      description: 'Total number of trades in cache',
    },
    totalModels: {
      type: 'integer',
      minimum: 0,
      description: 'Number of unique models',
    },
    cacheVersion: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Schema version (semantic versioning)',
    },
  },
};

/**
 * TrackedPriceCache Schema (per data-model.md section 5)
 * VR-020 to VR-023: Cache structure with unique constraints and locking
 */
export const TrackedPriceCacheSchema = {
  type: 'object',
  required: ['meta', 'trades', 'modelSummaries'],
  properties: {
    meta: CacheMetaSchema,
    trades: {
      type: 'array',
      items: TradeRecordSchema,
      description: 'All tracked trades',
    },
    modelSummaries: {
      type: 'array',
      items: ModelSummarySchema,
      description: 'Aggregated model stats',
    },
  },
};

/**
 * AnalystLogMetadata Schema (per data-model.md section 6)
 * VR-024 to VR-026: Checkpoint metadata for fault tolerance
 */
export const AnalystLogMetadataSchema = {
  type: 'object',
  required: ['lastSavedAt', 'totalRecords', 'lastProcessedId', 'checkpointBatchSize'],
  properties: {
    lastSavedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Last checkpoint time (ISO 8601, UTC)',
    },
    totalRecords: {
      type: 'integer',
      minimum: 0,
      description: 'Total analyst records processed',
    },
    lastProcessedId: {
      type: 'string',
      pattern: '^analyst_\\d+$',
      description: 'Resume point identifier',
    },
    checkpointBatchSize: {
      type: 'integer',
      const: 100,
      description: 'Records per checkpoint (fixed at 100)',
    },
  },
};
