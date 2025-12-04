# Data Model: Database Schema for Financial Event API

**Feature**: 003-database-migration
**Date**: 2025-11-30
**Purpose**: Define PostgreSQL database schema, entities, and relationships

---

## Overview

This data model migrates the existing file-based JSON cache system to Supabase PostgreSQL. The design uses JSONB columns for complex nested objects while extracting frequently-queried fields to indexed columns for optimal performance. All entities support CRUD operations through Supabase's auto-generated REST API and the @supabase/supabase-js client library.

---

## Database Tables

### 1. symbol_cache

**Purpose**: Store eligible ticker symbols with sector/industry metadata

**Storage**: Mixed approach (indexed columns + JSONB)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticker | VARCHAR(10) | UNIQUE NOT NULL | Stock ticker symbol (e.g., "AAPL") |
| sector | VARCHAR(100) | NULL | Company sector (e.g., "Technology") |
| industry | VARCHAR(100) | NULL | Company industry (e.g., "Consumer Electronics") |
| data | JSONB | NOT NULL | Full symbol metadata (original structure) |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
```sql
CREATE INDEX idx_symbol_ticker ON symbol_cache (ticker);  -- Primary lookup
CREATE INDEX idx_symbol_sector ON symbol_cache (sector);   -- Sector filtering
CREATE INDEX idx_symbol_data_gin ON symbol_cache USING GIN (data);  -- JSONB queries
```

**Sample Row**:
```json
{
  "id": 1,
  "ticker": "AAPL",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "type": "stock",
    "exchangeShortName": "NASDAQ",
    "sector": "Technology",
    "industry": "Consumer Electronics"
  },
  "updated_at": "2025-11-30T10:00:00Z"
}
```

**Validation Rules**:
- **VR-001**: ticker must be uppercase, 1-10 characters
- **VR-002**: data JSONB must contain at minimum: {symbol, name}
- **VR-003**: updated_at automatically set on INSERT/UPDATE

**Query Patterns**:
```sql
-- Exact ticker lookup (< 5ms)
SELECT * FROM symbol_cache WHERE ticker = 'AAPL';

-- Sector filtering (< 50ms)
SELECT ticker, industry FROM symbol_cache WHERE sector = 'Technology';

-- JSONB property search (< 100ms)
SELECT ticker FROM symbol_cache WHERE data->>'exchangeShortName' = 'NASDAQ';
```

---

### 2. event_cache

**Purpose**: Cache getEvent API results for fast retrieval

**Storage**: JSONB for events array + indexed metadata columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| start_date | INTEGER | NOT NULL | Request startDate parameter (days offset) |
| end_date | INTEGER | NOT NULL | Request endDate parameter (days offset) |
| from_date | DATE | NOT NULL | Computed start date (YYYY-MM-DD) |
| to_date | DATE | NOT NULL | Computed end date (YYYY-MM-DD) |
| events | JSONB | NOT NULL | Array of EventRecord objects |
| meta | JSONB | NOT NULL | MetaRecord with request/response info |
| created_at | TIMESTAMP | DEFAULT NOW() | Cache creation timestamp |

**Constraints**:
```sql
CONSTRAINT unique_date_range UNIQUE (start_date, end_date)
```

**Indexes**:
```sql
CREATE INDEX idx_event_date_range ON event_cache (start_date, end_date);
```

**Sample Row**:
```json
{
  "id": 1,
  "start_date": 3,
  "end_date": 7,
  "from_date": "2025-12-03",
  "to_date": "2025-12-07",
  "events": [
    {
      "ticker": "AAPL",
      "date": "2025-12-05",
      "event": "Earnings Release",
      "serviceId": "service-FMP-earnings-calendar"
    }
  ],
  "meta": {
    "type": "meta",
    "getEvent_generated_at": "2025-11-30T14:30:00Z",
    "request": {
      "startDate": 3,
      "endDate": 7,
      "fromDate": "2025-12-03",
      "toDate": "2025-12-07"
    },
    "collectionErrorChecklist": {
      "function": "getEvent",
      "status": []
    }
  },
  "created_at": "2025-11-30T14:30:00Z"
}
```

**Validation Rules**:
- **VR-004**: start_date ≤ end_date
- **VR-005**: events must be a valid JSON array
- **VR-006**: Upsert on conflict (replace existing cache for same date range)

**Query Patterns**:
```sql
-- Get latest cached event (< 50ms)
SELECT * FROM event_cache
ORDER BY created_at DESC
LIMIT 1;

-- Get specific date range (< 10ms)
SELECT * FROM event_cache
WHERE start_date = 3 AND end_date = 7;
```

---

### 3. trades

**Purpose**: Individual trade records with price tracking

**Storage**: Normalized columns + JSONB for complex objects

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| position | VARCHAR(5) | NOT NULL CHECK (position IN ('long', 'short')) | Trading direction |
| model_name | VARCHAR(50) | NOT NULL | Model identifier (e.g., "MODEL-1") |
| ticker | VARCHAR(10) | NOT NULL | Stock ticker symbol |
| purchase_date | DATE | NOT NULL | Trade entry date (YYYY-MM-DD) |
| current_price | NUMERIC(10, 4) | NOT NULL CHECK (current_price > 0) | Purchase date open price |
| price_history | JSONB | NOT NULL | Array of PriceHistory objects (D+1 to D+14) |
| returns | JSONB | NOT NULL | Array of ReturnRecord objects (D+1 to D+14) |
| meta | JSONB | NOT NULL | Metadata (createdAt, updatedAt, errors) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Constraints**:
```sql
CONSTRAINT unique_trade UNIQUE (position, model_name, ticker, purchase_date)
```

**Indexes**:
```sql
CREATE INDEX idx_trade_composite ON trades (model_name, purchase_date DESC);  -- Primary query
CREATE INDEX idx_trade_ticker ON trades (ticker);         -- Filter by ticker
CREATE INDEX idx_trade_position ON trades (position);     -- Filter by position
```

**Sample Row**:
```json
{
  "id": 1,
  "position": "long",
  "model_name": "MODEL-1",
  "ticker": "AAPL",
  "purchase_date": "2025-11-20",
  "current_price": 185.32,
  "price_history": [
    {
      "targetDate": "2025-11-21",
      "actualDate": "2025-11-21",
      "open": 186.00,
      "high": 188.50,
      "low": 185.00,
      "close": 187.20
    },
    null,
    ...
  ],
  "returns": [
    {
      "date": "2025-11-21",
      "returnRate": 0.0101,
      "returnSource": "close_normal",
      "cumulativeReturn": 0.0101
    },
    null,
    ...
  ],
  "meta": {
    "createdAt": "2025-11-20T09:30:00Z",
    "updatedAt": "2025-11-21T16:00:00Z",
    "missingDates": [],
    "errors": []
  },
  "created_at": "2025-11-20T09:30:00Z",
  "updated_at": "2025-11-21T16:00:00Z"
}
```

**Validation Rules**:
- **VR-007**: position must be "long" or "short"
- **VR-008**: model_name must match pattern `^MODEL-\d+$`
- **VR-009**: ticker must exist in symbol_cache table
- **VR-010**: purchase_date must be past or present, not future
- **VR-011**: price_history and returns arrays must have exactly 14 elements
- **VR-012**: current_price must be > 0 with up to 4 decimal places

**Query Patterns**:
```sql
-- Get all trades for a model (< 100ms)
SELECT * FROM trades
WHERE model_name = 'MODEL-1'
ORDER BY purchase_date DESC
LIMIT 100;

-- Get trades for specific ticker (< 50ms)
SELECT * FROM trades
WHERE ticker = 'AAPL'
ORDER BY purchase_date DESC;

-- Extract D+1 return from JSONB (< 10ms)
SELECT
  ticker,
  purchase_date,
  returns->0->>'returnRate' AS d1_return
FROM trades
WHERE model_name = 'MODEL-1'
AND returns->0 IS NOT NULL;
```

---

### 4. model_summaries

**Purpose**: Aggregated performance statistics per trading model

**Storage**: Normalized columns + JSONB for day-level metrics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| model_name | VARCHAR(50) | UNIQUE NOT NULL | Model identifier |
| total_trades | INTEGER | NOT NULL | Total number of trades for this model |
| optimal_holding_days | INTEGER[] | NOT NULL | Top 3 D+N days with highest returns |
| suggested_max_cap | NUMERIC(6, 4) | NULL | Recommended maxCap (20th percentile) |
| suggested_low_cap | NUMERIC(6, 4) | NULL | Recommended lowCap (5th percentile) |
| avg_return_by_day | JSONB | NOT NULL | {"D+1": 0.0032, "D+3": 0.0089, ...} |
| win_rate_by_day | JSONB | NOT NULL | {"D+1": 0.52, "D+3": 0.58, ...} |
| meta | JSONB | NOT NULL | Metadata (lastUpdated) |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last calculation timestamp |

**Constraints**:
```sql
CONSTRAINT unique_model UNIQUE (model_name)
```

**Indexes**:
```sql
CREATE INDEX idx_model_name ON model_summaries (model_name);
```

**Sample Row**:
```json
{
  "id": 1,
  "model_name": "MODEL-1",
  "total_trades": 45,
  "optimal_holding_days": [3, 5, 7],
  "suggested_max_cap": 0.0780,
  "suggested_low_cap": 0.0320,
  "avg_return_by_day": {
    "D+1": 0.0032,
    "D+3": 0.0089,
    "D+7": 0.0145,
    "D+14": 0.0201
  },
  "win_rate_by_day": {
    "D+1": 0.52,
    "D+3": 0.58,
    "D+7": 0.61,
    "D+14": 0.55
  },
  "meta": {
    "lastUpdated": "2025-11-30T10:30:00Z"
  },
  "updated_at": "2025-11-30T10:30:00Z"
}
```

**Validation Rules**:
- **VR-013**: total_trades must be ≥ 0
- **VR-014**: optimal_holding_days array must have exactly 3 elements (or empty if < 3 trades)
- **VR-015**: suggested_max_cap and suggested_low_cap are null if total_trades < 3
- **VR-016**: avg_return_by_day and win_rate_by_day must contain keys for D+1 through D+14

**Query Patterns**:
```sql
-- Get summary for specific model (< 5ms)
SELECT * FROM model_summaries WHERE model_name = 'MODEL-1';

-- Get all models sorted by avg D+7 return (< 50ms)
SELECT
  model_name,
  total_trades,
  avg_return_by_day->>'D+7' AS d7_return
FROM model_summaries
ORDER BY (avg_return_by_day->>'D+7')::NUMERIC DESC;
```

---

### 5. analyst_log

**Purpose**: Analyst price targets and price trend data

**Storage**: Indexed ticker + JSONB for priceTrend

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticker | VARCHAR(10) | UNIQUE NOT NULL | Stock ticker symbol |
| target_price | NUMERIC(10, 2) | NULL | Average analyst target price |
| number_of_analysts | INTEGER | NULL | Number of analysts covering this ticker |
| price_trend | JSONB | NOT NULL | {"D+0": 185.32, "D+1": 186.75, ..., "D+365": 202.15} |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Constraints**:
```sql
CONSTRAINT unique_analyst_ticker UNIQUE (ticker)
```

**Indexes**:
```sql
CREATE INDEX idx_analyst_ticker ON analyst_log (ticker);
CREATE INDEX idx_analyst_trend_gin ON analyst_log USING GIN (price_trend);
```

**Sample Row**:
```json
{
  "id": 1,
  "ticker": "AAPL",
  "target_price": 195.50,
  "number_of_analysts": 45,
  "price_trend": {
    "D+0": 185.32,
    "D+1": 186.75,
    "D+7": 189.40,
    "D+14": 192.10,
    "D+30": 194.80,
    "D+60": 197.20,
    "D+180": 200.50,
    "D+365": 202.15
  },
  "updated_at": "2025-11-30T00:00:00Z"
}
```

**Validation Rules**:
- **VR-017**: ticker must exist in symbol_cache table
- **VR-018**: price_trend must contain keys for D+0, D+1, ..., D+365 (14 horizons)
- **VR-019**: All price_trend values must be numeric or null

**Query Patterns**:
```sql
-- Get analyst data for specific ticker (< 10ms)
SELECT * FROM analyst_log WHERE ticker = 'AAPL';

-- Get D+7 price for multiple tickers (< 100ms)
SELECT
  ticker,
  price_trend->>'D+7' AS d7_price
FROM analyst_log
WHERE ticker IN ('AAPL', 'MSFT', 'GOOGL');

-- Filter tickers with high target price (< 200ms)
SELECT ticker, target_price
FROM analyst_log
WHERE target_price > 100
ORDER BY target_price DESC;
```

---

## Entity Relationships

### Relationships Diagram

```
┌─────────────────────┐
│   symbol_cache      │
│   (ticker)          │
└──────────┬──────────┘
           │
           │ Referenced by
           │
           ▼
┌─────────────────────┐         Generates        ┌─────────────────────┐
│   trades            │────────────────────────────▶│  model_summaries    │
│   (trade records)   │                            │  (aggregated stats) │
└─────────────────────┘                            └─────────────────────┘
           │
           │ ticker lookup
           │
           ▼
┌─────────────────────┐
│   analyst_log       │
│   (price targets)   │
└─────────────────────┘

┌─────────────────────┐
│   event_cache       │
│   (cached events)   │
└─────────────────────┘
    (independent)
```

**Relationships**:

1. **symbol_cache → trades**: trades.ticker references symbol_cache.ticker (enforced in application layer)
2. **trades → model_summaries**: model_summaries.model_name groups trades by model_name
3. **symbol_cache → analyst_log**: analyst_log.ticker references symbol_cache.ticker
4. **event_cache**: Independent, no foreign key relationships

---

## JSONB Field Structures

### price_history (in trades table)

**Type**: Array of PriceHistory objects (14 elements, D+1 to D+14)

**Structure**:
```json
[
  {
    "targetDate": "2025-11-21",  // ISO 8601 date
    "actualDate": "2025-11-21",  // May differ if weekend/holiday
    "open": 186.00,              // NUMERIC(10, 4)
    "high": 188.50,
    "low": 185.00,
    "close": 187.20
  },
  null,  // Future dates not yet available
  ...
]
```

**Validation**:
- Array length must be exactly 14
- Each non-null element must have: targetDate, actualDate, open, high, low, close
- All price values must be > 0

### returns (in trades table)

**Type**: Array of ReturnRecord objects (14 elements, D+1 to D+14)

**Structure**:
```json
[
  {
    "date": "2025-11-21",
    "returnRate": 0.0101,           // Decimal (e.g., 0.0101 = 1.01%)
    "returnSource": "close_normal",  // Enum: "close_normal", "open_maxCap", "open_lowCap"
    "cumulativeReturn": 0.0101
  },
  null,  // Future dates
  ...
]
```

**Validation**:
- Array length must be exactly 14
- returnSource must be one of: "close_normal", "open_maxCap", "open_lowCap"
- returnRate and cumulativeReturn can be negative (losses)

### avg_return_by_day / win_rate_by_day (in model_summaries table)

**Type**: Object with D+N keys

**Structure**:
```json
{
  "D+1": 0.0032,
  "D+2": 0.0045,
  "D+3": 0.0089,
  ...
  "D+14": 0.0201
}
```

**Validation**:
- Must contain keys: "D+1", "D+2", ..., "D+14"
- All values must be numeric
- win_rate_by_day values must be in range [0, 1]

### price_trend (in analyst_log table)

**Type**: Object with D+N keys (14 horizons)

**Structure**:
```json
{
  "D+0": 185.32,
  "D+1": 186.75,
  "D+2": 187.10,
  ...
  "D+365": 202.15
}
```

**Validation**:
- Must contain keys for all 14 horizons: [0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30, 60, 180, 365]
- All values must be numeric > 0 or null

---

## Data Migration Mapping

### File → Database Mapping

| JSON File | Database Table | Mapping Notes |
|-----------|----------------|---------------|
| `docs/symbolCache.json` | `symbol_cache` | `ticker` object → rows with ticker as key |
| `docs/getEventCache.json` | `event_cache` | Single file → single row (latest only) |
| `docs/trackedPriceCache.json` | `trades` + `model_summaries` | `trades` array → trades rows, `modelSummaries` array → model_summaries rows |
| `docs/analystLog.json` | `analyst_log` | `data` array → rows |

### Field Name Conversions

| File Field (camelCase) | DB Column (snake_case) |
|------------------------|------------------------|
| `modelName` | `model_name` |
| `purchaseDate` | `purchase_date` |
| `currentPrice` | `current_price` |
| `priceHistory` | `price_history` |
| `totalTrades` | `total_trades` |
| `optimalHoldingDays` | `optimal_holding_days` |
| `suggestedMaxCap` | `suggested_max_cap` |
| `suggestedLowCap` | `suggested_low_cap` |
| `avgReturnByDay` | `avg_return_by_day` |
| `winRateByDay` | `win_rate_by_day` |
| `targetPrice` | `target_price` |
| `numberOfAnalysts` | `number_of_analysts` |
| `priceTrend` | `price_trend` |

---

## Performance Optimization

### Index Strategy

**B-tree Indexes** (exact match, range queries):
- `symbol_cache.ticker`
- `trades.model_name`
- `trades.ticker`
- `trades.purchase_date`
- `analyst_log.ticker`

**GIN Indexes** (JSONB queries):
- `symbol_cache.data`
- `analyst_log.price_trend`

**Composite Indexes** (multi-column queries):
- `trades (model_name, purchase_date DESC)` → Primary query pattern

### Query Optimization Patterns

**Use Indexes**:
```sql
-- ✅ GOOD: Uses idx_trade_composite
EXPLAIN ANALYZE
SELECT * FROM trades
WHERE model_name = 'MODEL-1'
ORDER BY purchase_date DESC
LIMIT 10;

-- Index Scan using idx_trade_composite on trades  (cost=0.15..8.17 rows=10)
```

**Avoid Full Scans**:
```sql
-- ❌ BAD: Full table scan
SELECT * FROM trades
WHERE returns->0->>'returnRate'::NUMERIC > 0.05;

-- Seq Scan on trades  (cost=0.00..1500.00 rows=5000)
```

**Batch Operations**:
```sql
-- ✅ GOOD: Single upsert with array
INSERT INTO trades (position, model_name, ticker, ...)
VALUES
  ('long', 'MODEL-1', 'AAPL', ...),
  ('long', 'MODEL-1', 'MSFT', ...),
  ...
ON CONFLICT (position, model_name, ticker, purchase_date)
DO UPDATE SET updated_at = NOW();

-- ❌ BAD: Multiple individual inserts
INSERT INTO trades (position, model_name, ticker, ...) VALUES ('long', 'MODEL-1', 'AAPL', ...);
INSERT INTO trades (position, model_name, ticker, ...) VALUES ('long', 'MODEL-1', 'MSFT', ...);
```

---

## Backup and Recovery

### Supabase Auto-Backup

**Free Tier**:
- Daily backups (retained 7 days)
- Point-in-Time Recovery (24 hours)

**Backup Schedule**:
- Automatic: Daily at 00:00 UTC
- Manual: Via Supabase Dashboard → Database → Backups

**Restore Procedure**:
```sql
-- Option 1: Dashboard restore
-- Supabase Dashboard → Database → Backups → Restore

-- Option 2: SQL dump export
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql

-- Option 3: PITR (Point-in-Time Recovery)
-- Supabase Dashboard → Database → Backups → PITR → Select timestamp
```

---

## References

- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [Supabase Database Schema](https://supabase.com/docs/guides/database/tables)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Feature 001: Data Model](../001-financial-event-api/data-model.md)
- [Feature 002: Data Model](../002-price-tracker/data-model.md)
