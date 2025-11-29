# Research: Price Tracker Technical Decisions

**Feature**: 002-price-tracker
**Date**: 2025-11-28
**Purpose**: Resolve technical unknowns before implementation (Phase 0)

## 1. File Locking Library Selection

### Decision: **proper-lockfile**

### Rationale:
- **Constitution Principle VIII Compliance**: External dependency justified by significant value
  - Robust cross-platform locking (Windows LOCKFILE + Unix flock)
  - Retry logic built-in with configurable intervals
  - ~50KB footprint (minimal)
  - Active maintenance (last update 2024, 2M+ weekly downloads)
- **Financial Data Integrity**: No silent lock failures - throws errors on timeout
- **Performance**: Non-blocking with promise-based API, suitable for <100ms p95 write latency target
- **Existing Pattern**: Similar to axios-retry pattern already in codebase

### Alternatives Considered:
- **lockfile** (npm): Older API, less actively maintained, similar features
- **fs-extra**: 500KB+ dependency for single feature (violates Principle VIII)
- **Custom fs.open exclusive**: ~30 lines but lacks retry logic, cross-platform issues on Windows

### Implementation Notes:
```javascript
import lockfile from 'proper-lockfile';

async function updateCache(data) {
  const release = await lockfile.lock('docs/trackedPriceCache.json', {
    retries: { retries: 3, minTimeout: 100, maxTimeout: 500 },
    stale: 10000 // 10s stale lock cleanup
  });
  try {
    // Read, modify, write cache
  } finally {
    await release();
  }
}
```

---

## 2. HTTP 207 Multi-Status Implementation

### Decision: **RFC 4918-compliant JSON array format**

### Rationale:
- **Express 5.1.0 Compatibility**: Native `res.status(207).json()` support
- **Client Simplicity**: Flat array structure easier to parse than nested XML-style multistatus
- **Batch Error Handling**: Each trade gets individual status + body for targeted retry

### Response Schema:
```json
{
  "results": [
    {
      "index": 0,
      "status": 200,
      "trade": { "position": "long", "modelName": "MODEL-0", "ticker": "AAPL", ... },
      "data": { "currentPrice": 150.25, "priceHistory": [...], "returns": [...] }
    },
    {
      "index": 1,
      "status": 404,
      "trade": { "position": "short", "modelName": "MODEL-0", "ticker": "INVALID", ... },
      "error": { "message": "Ticker not found", "code": "TICKER_NOT_FOUND" }
    }
  ],
  "summary": {
    "total": 10,
    "succeeded": 9,
    "failed": 1
  }
}
```

### Implementation Notes:
- Response status: Always 207 if request is valid (even if all trades fail individually)
- Response status: 400 only if request format invalid (empty array, malformed JSON)
- Response status: 401 if authentication fails (checked before processing)

---

## 3. Percentile Calculation Approach

### Decision: **Custom inline implementation** (no library)

### Rationale:
- **Constitution Principle VIII**: Trivial functionality (<30 lines)
- **Data Scale**: <1000 trades per model expected, O(n log n) sort acceptable
- **simple-statistics** library: 50KB for single percentile function (unjustified)
- **Accuracy**: Linear interpolation method matches financial industry standard

### Implementation (Quantile Function):
```javascript
function percentile(values, p) {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * (p / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Usage:
const maxCap = percentile(allReturns, 20); // 20th percentile
const lowCap = percentile(allReturns, 5);  // 5th percentile
```

### Edge Cases Handled:
- Empty array → null (minimum 3 trades enforced by FR-014)
- Single value → return that value
- Even/odd length arrays → linear interpolation

---

## 4. Trading Day Calendar

### Decision: **Hardcoded US market holiday list with annual update**

### Rationale:
- **Simplicity**: NYSE holidays well-defined, change annually
- **Performance**: No external API calls (FMP historical price API already returns trading days only)
- **Existing Pattern**: Similar to marketHours.js in codebase (trading hours logic)
- **API Alternative Rejected**: NYSE calendar APIs add latency + dependency (violates Principle VIII for predictable data)

### Holiday List Source:
- NYSE official calendar: https://www.nyse.com/markets/hours-calendars
- Update frequency: Annual (January)
- Weekends: Always non-trading (Saturday/Sunday)

### Implementation Strategy:
```javascript
// lib/tradingCalendar.js
const US_MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

export function isNonTradingDay(date) {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Weekend

  const dateStr = format(date, 'yyyy-MM-dd');
  return US_MARKET_HOLIDAYS_2025.includes(dateStr);
}

export function getNextTradingDay(date, maxDays = 7) {
  let current = addDays(date, 1);
  let attempts = 0;

  while (isNonTradingDay(current) && attempts < maxDays) {
    current = addDays(current, 1);
    attempts++;
  }

  return attempts >= maxDays ? null : current;
}
```

### Max 7-Day Search Rationale:
- Longest possible holiday gap: ~4 days (Thanksgiving + weekend)
- 7-day limit prevents infinite loops
- null return triggers meta.missingDates logging (FR-033)

---

## 5. refreshAnalystLog Checkpoint Strategy

### Decision: **Append-only with atomic metadata update**

### Rationale:
- **Existing File Structure**: analystLog.json already used by generateRating.js endpoint
- **Atomic Writes**: Append 100-record batch + update metadata in single write operation
- **Resume Support**: lastProcessedId enables restart from checkpoint
- **Constitution Principle II**: No silent data loss - checkpoint every 100 records

### File Structure:
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

### Implementation Pattern:
```javascript
// services/analystCacheManager.js (extend existing)
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

// Main refresh loop
for (let i = lastProcessedId; i < totalAnalysts; i += 100) {
  const batch = await fetchAnalystBatch(i, 100);
  await checkpointBatch(batch); // Checkpoint every 100
}
```

### Resume Logic:
```javascript
function getResumePoint() {
  if (!fs.existsSync('docs/analystLog.json')) return 0;

  const cache = JSON.parse(fs.readFileSync('docs/analystLog.json', 'utf-8'));
  return parseInt(cache.meta.lastProcessedId.split('_')[1]) || 0;
}
```

---

## 6. Cap-Aware Return Calculation Logic

### Decision: **Conditional return based on intraday high/low vs cap thresholds**

### Rationale:
- **User Requirement**: "최고가 혹은 최저가가 cap에 닿으면 시작가 기준, 그 외에는 종가 기준"
- **Financial Realism**: Reflects take-profit/stop-loss execution at intraday extremes
- **Position-Specific**:
  - **Long**: maxCap check on high, lowCap check on low
  - **Short**: maxCap check on low (price drop = gain), lowCap check on high (price rise = loss)

### Implementation Logic:
```javascript
function calculateReturn(position, currentPrice, priceData, maxCapPct, lowCapPct) {
  const { open, high, low, close } = priceData;

  if (position === 'long') {
    const highReturn = (high - currentPrice) / currentPrice;
    const lowReturn = (low - currentPrice) / currentPrice;

    if (highReturn >= maxCapPct) {
      // Hit max cap - use open price (assume early exit)
      return { returnRate: (open - currentPrice) / currentPrice, returnSource: 'open_maxCap' };
    }
    if (lowReturn <= -lowCapPct) {
      // Hit low cap - use open price (assume stop-loss)
      return { returnRate: (open - currentPrice) / currentPrice, returnSource: 'open_lowCap' };
    }
    // Normal case - use close
    return { returnRate: (close - currentPrice) / currentPrice, returnSource: 'close' };
  }

  if (position === 'short') {
    const lowReturnShort = ((low - currentPrice) / currentPrice) * -1; // Price drop = gain
    const highReturnShort = ((high - currentPrice) / currentPrice) * -1; // Price rise = loss

    if (lowReturnShort >= maxCapPct) {
      // Hit max cap (price dropped enough)
      return { returnRate: ((open - currentPrice) / currentPrice) * -1, returnSource: 'open_maxCap' };
    }
    if (highReturnShort <= -lowCapPct) {
      // Hit low cap (price rose enough)
      return { returnRate: ((open - currentPrice) / currentPrice) * -1, returnSource: 'open_lowCap' };
    }
    // Normal case - use close
    return { returnRate: ((close - currentPrice) / currentPrice) * -1, returnSource: 'close' };
  }
}
```

### Key Fields:
- **returnSource**: `"close"` | `"open_maxCap"` | `"open_lowCap"` (added to ReturnRecord entity)
- **Rationale**: Transparency for model analysis - users see when caps triggered vs normal close

### Edge Case:
- Both maxCap and lowCap triggered same day (wide volatility): maxCap takes precedence (assume profit-taking over stop-loss)

---

## Summary

All 6 research areas resolved with concrete decisions:

1. ✅ **File Locking**: proper-lockfile (justified per Principle VIII)
2. ✅ **HTTP 207**: RFC-compliant flat JSON array with per-trade status
3. ✅ **Percentiles**: Custom 30-line implementation (no library needed)
4. ✅ **Trading Calendar**: Hardcoded NYSE holidays with annual update
5. ✅ **Checkpointing**: Append-only atomic writes every 100 records
6. ✅ **Cap-Aware Returns**: Conditional open vs close based on intraday extremes

**Ready for Phase 1**: Data model and contracts can now be generated with full technical clarity.
