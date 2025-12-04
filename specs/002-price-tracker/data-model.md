# Data Model: Price Tracker with Model Performance Analysis

**Feature**: 002-price-tracker
**Date**: 2025-11-28
**Purpose**: Define entities, validation rules, and relationships (Phase 1)

## Overview

This data model supports tracking individual trades with position-specific return calculations, model-level performance aggregation, and progressive D+N data filling as future dates become past. All entities use UTC timestamps in ISO 8601 format. The model implements cap-aware return calculation where intraday high/low prices hitting maxCap/lowCap thresholds trigger open-price-based returns instead of close-price-based returns.

## Entities

### 1. TradeRecord

**Purpose**: Individual trade entry with position-specific metadata and price tracking

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| position | string | Yes | Enum: "long", "short" | Trading direction |
| modelName | string | Yes | Pattern: `MODEL-\d+` | Model identifier (e.g., "MODEL-0") |
| ticker | string | Yes | Uppercase, exists in symbolCache.json | Stock symbol |
| purchaseDate | string | Yes | ISO 8601 date (YYYY-MM-DD), UTC | Trade entry date |
| currentPrice | number | Yes | > 0, up to 4 decimal places | Purchase date open price |
| priceHistory | PriceHistory[] | Yes | Array of 14 elements (D+1 to D+14) | OHLC data per day |
| returns | ReturnRecord[] | Yes | Array of 14 elements (D+1 to D+14) | Position-specific returns |
| meta | object | Yes | See MetaRecord structure | Collection metadata |

**Unique Key**: `(position, modelName, ticker, purchaseDate)`

**Validation Rules**:
- **VR-001**: purchaseDate must be past or present, not future (FR-001)
- **VR-002**: ticker must exist in docs/symbolCache.json (FR-002)
- **VR-003**: currentPrice sourced from FMP historical API for purchaseDate (FR-003)
- **VR-004**: priceHistory array length always 14, nulls allowed for future dates (FR-005, FR-010)
- **VR-005**: returns array length always 14, calculated per position type (FR-007, FR-008)

**State Transitions**:
```
Initial State (purchase date = today):
  priceHistory: [null, null, ..., null] (14 nulls)
  returns: [null, null, ..., null] (14 nulls)

After D+1 becomes past:
  priceHistory[0]: {targetDate, actualDate, open, high, low, close}
  returns[0]: {date, returnRate, returnSource, cumulativeReturn}

After D+14 becomes past:
  All arrays fully populated
```

**Example**:
```json
{
  "position": "long",
  "modelName": "MODEL-0",
  "ticker": "AAPL",
  "purchaseDate": "2025-11-01",
  "currentPrice": 150.25,
  "priceHistory": [
    {
      "targetDate": "2025-11-04",
      "actualDate": "2025-11-04",
      "open": 151.00,
      "high": 153.50,
      "low": 150.75,
      "close": 152.25
    },
    null,
    ...
  ],
  "returns": [
    {
      "date": "2025-11-04",
      "returnRate": 0.0133,
      "returnSource": "close",
      "cumulativeReturn": 0.0133
    },
    null,
    ...
  ],
  "meta": {
    "createdAt": "2025-11-01T09:30:00Z",
    "updatedAt": "2025-11-04T16:00:00Z",
    "missingDates": [],
    "errors": []
  }
}
```

---

### 2. PriceHistory

**Purpose**: Daily OHLC price data for D+N horizons with trading day fallback

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| targetDate | string | Yes | ISO 8601 date (YYYY-MM-DD) | Intended D+N date |
| actualDate | string | Conditional | ISO 8601 date, must be trading day | Actual date used (next trading day if targetDate is holiday) |
| open | number | Conditional | > 0, up to 4 decimal places | Opening price |
| high | number | Conditional | >= open, >= low, >= close | Intraday high |
| low | number | Conditional | <= open, <= high, <= close | Intraday low |
| close | number | Conditional | > 0, up to 4 decimal places | Closing price |

**Validation Rules**:
- **VR-006**: If targetDate is future, all fields except targetDate are null (FR-010)
- **VR-007**: If targetDate is past/present, all fields required (FR-005)
- **VR-008**: actualDate ≥ targetDate (may skip forward to next trading day) (FR-009)
- **VR-009**: high ≥ max(open, low, close) (data integrity)
- **VR-010**: low ≤ min(open, high, close) (data integrity)
- **VR-011**: Sourced from FMP historical price API (FR-005)

**Trading Day Logic**:
```javascript
// If targetDate falls on weekend/holiday
actualDate = getNextTradingDay(targetDate, maxDays=7)
// If no trading day found within 7 days, log to meta.missingDates
```

**Example (Trading Day)**:
```json
{
  "targetDate": "2025-11-04",
  "actualDate": "2025-11-04",
  "open": 151.00,
  "high": 153.50,
  "low": 150.75,
  "close": 152.25
}
```

**Example (Holiday - Thanksgiving)**:
```json
{
  "targetDate": "2025-11-27",
  "actualDate": "2025-11-28",
  "open": 155.00,
  "high": 156.00,
  "low": 154.50,
  "close": 155.75
}
```

**Example (Future Date)**:
```json
{
  "targetDate": "2025-12-15",
  "actualDate": null,
  "open": null,
  "high": null,
  "low": null,
  "close": null
}
```

---

### 3. ReturnRecord

**Purpose**: Position-specific return calculation with cap-aware price source tracking

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| date | string | Yes | ISO 8601 date, matches PriceHistory.actualDate | Return calculation date |
| returnRate | number | Conditional | Decimal (e.g., 0.0133 for 1.33%) | Daily return rate |
| returnSource | string | Conditional | Enum: "close", "open_maxCap", "open_lowCap" | Price type used for calculation |
| cumulativeReturn | number | Conditional | Decimal | Cumulative return from purchase date |

**Validation Rules**:
- **VR-012**: If corresponding PriceHistory is null, all fields except date are null (FR-010)
- **VR-013**: returnRate calculated based on position type and cap logic (FR-007, FR-008)
- **VR-014**: returnSource accurately reflects which price was used (transparency)
- **VR-015**: cumulativeReturn = product of (1 + returnRate) for all prior dates - 1

**Cap-Aware Calculation Logic**:

#### Long Position (FR-007):
```javascript
const { open, high, low, close } = priceHistory;
const highReturn = (high - currentPrice) / currentPrice;
const lowReturn = (low - currentPrice) / currentPrice;

if (highReturn >= maxCapPct) {
  returnRate = (open - currentPrice) / currentPrice;
  returnSource = "open_maxCap";
} else if (lowReturn <= -lowCapPct) {
  returnRate = (open - currentPrice) / currentPrice;
  returnSource = "open_lowCap";
} else {
  returnRate = (close - currentPrice) / currentPrice;
  returnSource = "close";
}
```

#### Short Position (FR-008):
```javascript
const { open, high, low, close } = priceHistory;
const lowReturnShort = ((low - currentPrice) / currentPrice) * -1; // Price drop = gain
const highReturnShort = ((high - currentPrice) / currentPrice) * -1; // Price rise = loss

if (lowReturnShort >= maxCapPct) {
  returnRate = ((open - currentPrice) / currentPrice) * -1;
  returnSource = "open_maxCap";
} else if (highReturnShort <= -lowCapPct) {
  returnRate = ((open - currentPrice) / currentPrice) * -1;
  returnSource = "open_lowCap";
} else {
  returnRate = ((close - currentPrice) / currentPrice) * -1;
  returnSource = "close";
}
```

**Example (Normal Close)**:
```json
{
  "date": "2025-11-04",
  "returnRate": 0.0133,
  "returnSource": "close",
  "cumulativeReturn": 0.0133
}
```

**Example (Hit maxCap - Long)**:
```json
{
  "date": "2025-11-05",
  "returnRate": 0.0067,
  "returnSource": "open_maxCap",
  "cumulativeReturn": 0.0201
}
```

**Example (Future Date)**:
```json
{
  "date": "2025-12-15",
  "returnRate": null,
  "returnSource": null,
  "cumulativeReturn": null
}
```

---

### 4. ModelSummary

**Purpose**: Aggregated performance metrics per model with cap percentile calculations

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| modelName | string | Yes | Pattern: `MODEL-\d+` | Model identifier |
| tradeCount | number | Yes | >= 0 | Total trades for this model |
| suggestedMaxCap | number | Conditional | Decimal percentage (e.g., 0.20 for 20%) | 20th percentile of all returns (FR-011) |
| suggestedLowCap | number | Conditional | Decimal percentage (e.g., 0.05 for 5%) | 5th percentile of all returns (FR-012) |
| avgReturn | number | Conditional | Decimal | Mean of all D+N returns |
| winRate | number | Conditional | 0.0 to 1.0 | Proportion of positive returns |

**Validation Rules**:
- **VR-016**: If tradeCount < 3, suggestedMaxCap and suggestedLowCap are null (FR-014)
- **VR-017**: suggestedMaxCap calculated only from completed returns (non-null) (FR-011)
- **VR-018**: suggestedLowCap calculated only from completed returns (non-null) (FR-012)
- **VR-019**: avgReturn and winRate calculated from all non-null returns (FR-013)

**Percentile Calculation**:
```javascript
// Collect all non-null returns for this model
const allReturns = trackedPriceCache
  .filter(trade => trade.modelName === modelName)
  .flatMap(trade => trade.returns)
  .filter(r => r && r.returnRate !== null)
  .map(r => r.returnRate);

if (allReturns.length >= 3) {
  suggestedMaxCap = percentile(allReturns, 20); // 20th percentile
  suggestedLowCap = percentile(allReturns, 5);  // 5th percentile
}
```

**Example**:
```json
{
  "modelName": "MODEL-0",
  "tradeCount": 150,
  "suggestedMaxCap": 0.0215,
  "suggestedLowCap": -0.0187,
  "avgReturn": 0.0052,
  "winRate": 0.63
}
```

**Example (Insufficient Data)**:
```json
{
  "modelName": "MODEL-1",
  "tradeCount": 2,
  "suggestedMaxCap": null,
  "suggestedLowCap": null,
  "avgReturn": 0.0023,
  "winRate": 0.50
}
```

---

### 5. TrackedPriceCache

**Purpose**: File-based cache structure (docs/trackedPriceCache.json) with atomic write safety

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| meta | CacheMeta | Yes | See CacheMeta structure | Cache-level metadata |
| trades | TradeRecord[] | Yes | Array of TradeRecord entities | All tracked trades |
| modelSummaries | ModelSummary[] | Yes | Array of ModelSummary entities | Aggregated model stats |

**CacheMeta Structure**:
```typescript
{
  lastUpdatedAt: string;      // ISO 8601 timestamp
  totalTrades: number;         // Length of trades array
  totalModels: number;         // Unique modelName count
  cacheVersion: string;        // e.g., "1.0.0"
}
```

**Validation Rules**:
- **VR-020**: Unique constraint on trades array: (position, modelName, ticker, purchaseDate) (FR-016)
- **VR-021**: File locked during write operations using proper-lockfile (FR-018)
- **VR-022**: Backup created before each write (FR-019)
- **VR-023**: Progressive updates fill nulls only, preserve existing values (FR-020)

**Progressive Update Logic**:
```javascript
// Merging new data with existing trade
function mergeTradeRecord(existing, incoming) {
  if (!existing) return incoming; // New trade

  // Fill nulls in priceHistory
  existing.priceHistory = existing.priceHistory.map((existingDay, i) => {
    if (existingDay !== null) return existingDay; // Keep existing
    return incoming.priceHistory[i]; // Fill null with new data
  });

  // Fill nulls in returns
  existing.returns = existing.returns.map((existingReturn, i) => {
    if (existingReturn !== null) return existingReturn;
    return incoming.returns[i];
  });

  existing.meta.updatedAt = incoming.meta.createdAt;
  return existing;
}
```

**Example**:
```json
{
  "meta": {
    "lastUpdatedAt": "2025-11-28T10:30:00Z",
    "totalTrades": 487,
    "totalModels": 5,
    "cacheVersion": "1.0.0"
  },
  "trades": [
    {
      "position": "long",
      "modelName": "MODEL-0",
      "ticker": "AAPL",
      "purchaseDate": "2025-11-01",
      "currentPrice": 150.25,
      "priceHistory": [...],
      "returns": [...],
      "meta": {...}
    },
    ...
  ],
  "modelSummaries": [
    {
      "modelName": "MODEL-0",
      "tradeCount": 150,
      "suggestedMaxCap": 0.0215,
      "suggestedLowCap": -0.0187,
      "avgReturn": 0.0052,
      "winRate": 0.63
    },
    ...
  ]
}
```

---

### 6. AnalystLogMetadata

**Purpose**: Checkpoint metadata for refreshAnalystLog endpoint fault tolerance

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| lastSavedAt | string | Yes | ISO 8601 timestamp | Last checkpoint time |
| totalRecords | number | Yes | >= 0 | Total analyst records processed |
| lastProcessedId | string | Yes | Pattern: `analyst_\d+` | Resume point identifier |
| checkpointBatchSize | number | Yes | Fixed: 100 | Records per checkpoint |

**Validation Rules**:
- **VR-024**: Checkpoint occurs every 100 records (FR-027)
- **VR-025**: File write is atomic with lock acquisition (FR-028)
- **VR-026**: Resume logic uses lastProcessedId to continue from checkpoint (FR-029)

**Checkpoint Implementation**:
```javascript
// Append-only with atomic metadata update
async function checkpointBatch(records) {
  const release = await lockfile.lock('docs/analystLog.json');

  try {
    const cache = JSON.parse(fs.readFileSync('docs/analystLog.json', 'utf-8'));

    // Append new records
    cache.records.push(...records);
    cache.meta.totalRecords += records.length;
    cache.meta.lastProcessedId = records[records.length - 1].id;
    cache.meta.lastSavedAt = new Date().toISOString();

    // Atomic write
    fs.writeFileSync('docs/analystLog.json', JSON.stringify(cache, null, 2));
  } finally {
    await release();
  }
}
```

**Example**:
```json
{
  "meta": {
    "lastSavedAt": "2025-11-28T10:30:00Z",
    "totalRecords": 250000,
    "lastProcessedId": "analyst_250000",
    "checkpointBatchSize": 100
  },
  "errors": [
    {
      "timestamp": "2025-11-28T10:15:00Z",
      "recordId": "analyst_123456",
      "error": "FMP API timeout",
      "retryable": true
    }
  ],
  "records": [
    // Analyst rating records (appended in 100-record batches)
  ]
}
```

---

## Relationships

### TradeRecord ↔ ModelSummary
- **Type**: One-to-Many (Many trades → One model summary)
- **Foreign Key**: TradeRecord.modelName references ModelSummary.modelName
- **Cardinality**: Each ModelSummary aggregates all TradeRecords with matching modelName

### TradeRecord ↔ PriceHistory
- **Type**: One-to-Many (One trade → 14 PriceHistory entries)
- **Composition**: PriceHistory is embedded array within TradeRecord
- **Cardinality**: Always exactly 14 elements (D+1 to D+14)

### TradeRecord ↔ ReturnRecord
- **Type**: One-to-Many (One trade → 14 ReturnRecord entries)
- **Composition**: ReturnRecord is embedded array within TradeRecord
- **Cardinality**: Always exactly 14 elements (D+1 to D+14)
- **Dependency**: ReturnRecord calculation depends on corresponding PriceHistory

### PriceHistory ↔ ReturnRecord
- **Type**: One-to-One (Each PriceHistory → One ReturnRecord for same D+N)
- **Matching**: Array index alignment (priceHistory[0] → returns[0])
- **Dependency**: ReturnRecord.returnRate calculated from PriceHistory.{open, high, low, close}

---

## Data Flow

### 1. Initial Trade Entry (POST /priceTracker)
```
Input: position, modelName, ticker, purchaseDate
  ↓
Fetch currentPrice from FMP API (purchaseDate open)
  ↓
Create TradeRecord with:
  - priceHistory: [null × 14]
  - returns: [null × 14]
  ↓
Merge with existing cache (unique key check)
  ↓
Write to trackedPriceCache.json (locked)
  ↓
Recalculate ModelSummary for modelName
  ↓
Return HTTP 207 with per-trade status
```

### 2. Progressive D+N Update (Scheduled Job)
```
For each TradeRecord in cache:
  For each null in priceHistory[i]:
    If targetDate (purchaseDate + i + 1) <= today:
      Fetch OHLC from FMP API
      If targetDate is holiday:
        actualDate = getNextTradingDay(targetDate)
      Calculate returnRate using cap-aware logic
      Update priceHistory[i] and returns[i]
  ↓
Write updated cache (locked)
  ↓
Recalculate ModelSummary
```

### 3. Model Summary Calculation (GET /trackedPrice)
```
For each unique modelName:
  Collect all non-null returns
  If returns.length >= 3:
    suggestedMaxCap = percentile(returns, 20)
    suggestedLowCap = percentile(returns, 5)
  avgReturn = mean(returns)
  winRate = count(returns > 0) / count(returns)
  ↓
Return { trades: TradeRecord[], modelSummaries: ModelSummary[] }
```

---

## Validation Summary

Total Validation Rules: 26

**Data Integrity (VR-001 to VR-011)**: TradeRecord and PriceHistory field validations
**Calculation Logic (VR-012 to VR-015)**: ReturnRecord cap-aware calculations
**Aggregation Rules (VR-016 to VR-019)**: ModelSummary percentile thresholds
**Cache Management (VR-020 to VR-023)**: Unique constraints, locking, backups, progressive updates
**Checkpoint Safety (VR-024 to VR-026)**: AnalystLog atomic writes and resume logic

---

## Edge Cases Handled

1. **Duplicate Trade Entry**: Merge logic preserves existing non-null values (VR-023)
2. **Holiday D+N Calculation**: Next trading day fallback with actualDate tracking (VR-008)
3. **Insufficient Model Data**: Null suggestedMaxCap/lowCap when tradeCount < 3 (VR-016)
4. **Both Caps Hit Same Day**: maxCap takes precedence over lowCap (profit-taking prioritized)
5. **Missing Trading Day**: Log to meta.missingDates if no trading day within 7 days (FR-033)
6. **Concurrent Writes**: File locking prevents race conditions (VR-021)
7. **Checkpoint Resume**: lastProcessedId enables restart from last successful batch (VR-026)

---

## Schema Version

**Version**: 1.0.0
**Last Updated**: 2025-11-28
**Breaking Changes**: None (initial version)
