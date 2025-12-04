# Quickstart Guide: Price Tracker with Model Performance Analysis

**Feature**: 002-price-tracker
**Date**: 2025-11-28
**Purpose**: Setup, development, and deployment guide (Phase 1)

## Overview

This guide walks you through setting up the Price Tracker feature locally, running development workflows, and deploying to Render.com. The system tracks individual trades with position-specific return calculations across D+1 to D+14 horizons, supporting bulk input and progressive data filling.

---

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: Any recent version
- **OS**: Windows, macOS, or Linux

### API Keys
- **FMP API Key**: Paid plan required for historical price data
  - Sign up at: https://financialmodelingprep.com/
  - Required tier: Professional or higher (for historical OHLC data)
  - Rate limits: 4 req/s parallel (already implemented in existing codebase)

### Knowledge Requirements
- Basic understanding of REST APIs
- Familiarity with JSON data formats
- Understanding of trading concepts (long/short positions, OHLC data)

---

## Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd getEvents
```

### 2. Install Dependencies

```bash
npm install
```

This installs existing dependencies plus new ones for this feature:
- `proper-lockfile`: File-based locking for concurrent writes
- All existing packages remain unchanged

### 3. Configure Environment

Create or update `.env` file in project root:

```bash
# FMP API Configuration
FMP_API_KEY=your_fmp_api_key_here

# Price Tracker API Configuration
API_KEY=your_fmp_api_key_here  # Currently uses same key as FMP
PORT=3000

# Cache Configuration
CACHE_DIR=./docs
BACKUP_DIR=./docs/backups

# Logging Configuration
LOG_LEVEL=info  # Options: debug, info, warn, error
LOG_FORMAT=json  # Options: json, pretty
```

**Important**:
- `API_KEY` currently must match `FMP_API_KEY` (authentication requirement)
- `CACHE_DIR` must use relative path for Render.com compatibility

### 4. Initialize Cache Files

Create required cache files:

```bash
# Create docs directory if not exists
mkdir -p docs/backups

# Initialize trackedPriceCache.json
cat > docs/trackedPriceCache.json << 'EOF'
{
  "meta": {
    "lastUpdatedAt": null,
    "totalTrades": 0,
    "totalModels": 0,
    "cacheVersion": "1.0.0"
  },
  "trades": [],
  "modelSummaries": []
}
EOF

# Verify symbolCache.json exists (from 001-financial-event-api)
test -f docs/symbolCache.json || echo "WARNING: symbolCache.json not found"
```

### 5. Verify Setup

Run health check:

```bash
npm run dev

# In another terminal:
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "caches": {
    "symbolCache": "loaded",
    "trackedPriceCache": "loaded"
  },
  "version": "1.0.0"
}
```

---

## Development Workflow

### Running Development Server

Start with auto-reload:

```bash
npm run dev
```

This starts Express server with nodemon watching for file changes.

### API Endpoints

#### 1. Track New Trades (POST /priceTracker)

**Single Trade**:
```bash
curl -X POST http://localhost:3000/priceTracker \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: text/plain" \
  -d "long	MODEL-0	AAPL	2025-11-01"
```

**Bulk Trades** (tab-delimited):
```bash
curl -X POST http://localhost:3000/priceTracker \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: text/plain" \
  -d "long	MODEL-0	AAPL	2025-11-01
short	MODEL-0	TSLA	2025-11-15
long	MODEL-1	MSFT	2025-11-20"
```

**Expected Response** (HTTP 207):
```json
{
  "results": [
    {
      "index": 0,
      "status": 200,
      "trade": {
        "position": "long",
        "modelName": "MODEL-0",
        "ticker": "AAPL",
        "purchaseDate": "2025-11-01"
      },
      "data": {
        "currentPrice": 150.25,
        "priceHistory": [ /* 14 elements */ ],
        "returns": [ /* 14 elements */ ]
      }
    }
  ],
  "summary": {
    "total": 3,
    "succeeded": 3,
    "failed": 0
  }
}
```

#### 2. View Cached Data (GET /trackedPrice)

```bash
curl http://localhost:3000/trackedPrice \
  -H "X-API-Key: $API_KEY"
```

**Response Structure**:
```json
{
  "meta": {
    "lastUpdatedAt": "2025-11-28T10:30:00Z",
    "totalTrades": 487,
    "totalModels": 5,
    "cacheVersion": "1.0.0"
  },
  "trades": [ /* All TradeRecord objects */ ],
  "modelSummaries": [
    {
      "modelName": "MODEL-0",
      "tradeCount": 150,
      "suggestedMaxCap": 0.0215,  // 20th percentile
      "suggestedLowCap": -0.0187,  // 5th percentile
      "avgReturn": 0.0052,
      "winRate": 0.63
    }
  ]
}
```

#### 3. Refresh Analyst Log (POST /refreshAnalystLog)

```bash
curl -X POST http://localhost:3000/refreshAnalystLog \
  -H "X-API-Key: $API_KEY"
```

**Response**:
```json
{
  "status": "completed",
  "meta": {
    "startedAt": "2025-11-28T10:00:00Z",
    "completedAt": "2025-11-28T12:30:00Z",
    "totalRecords": 600000,
    "lastProcessedId": "analyst_600000",
    "checkpointCount": 6000,
    "resumedFrom": null
  },
  "stats": {
    "recordsProcessed": 600000,
    "errorsEncountered": 12,
    "apiCallsMade": 6000,
    "durationSeconds": 9000
  }
}
```

**Note**: This endpoint runs for ~2.5 hours for full refresh (600k records). Progress is checkpointed every 100 records.

---

## Testing

### Unit Tests

Run all unit tests:

```bash
npm test
```

Run specific test suites:

```bash
# Date utilities
npm test -- dateUtils.test.js

# Percentile calculations
npm test -- lib/percentile.test.js

# Event normalizer
npm test -- eventNormalizer.test.js

# Cache manager
npm test -- cacheManager.test.js
```

### Integration Tests

Run endpoint integration tests:

```bash
npm test -- tests/integration/
```

Individual endpoint tests:

```bash
# Price tracker endpoint
npm test -- tests/integration/priceTracker.integration.test.js

# Tracked price endpoint
npm test -- tests/integration/trackedPrice.integration.test.js

# Refresh analyst log endpoint
npm test -- tests/integration/refreshAnalystLog.integration.test.js
```

### Contract Tests

Validate FMP API responses against expected schemas:

```bash
npm test -- tests/contract/fmpClient.contract.test.js
```

Uses Nock fixtures to mock API responses. Update fixtures if FMP API changes:

```bash
# Record new fixtures (requires valid FMP API key)
npm run test:contract:record
```

### Coverage Report

Generate coverage report:

```bash
npm run test:coverage
```

**Minimum Thresholds**:
- Overall: 70%
- Critical paths (date conversion, return calculation, percentiles): 90%

---

## Deployment

### Render.com Deployment

#### 1. Create New Web Service

1. Log in to Render.com
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure build settings:

**Build Settings**:
```
Name: price-tracker-api
Environment: Node
Region: Oregon (US West)
Branch: main
Build Command: npm install
Start Command: npm start
```

#### 2. Environment Variables

Add in Render dashboard:

```
FMP_API_KEY=your_fmp_api_key_here
API_KEY=your_fmp_api_key_here
PORT=10000
NODE_ENV=production
LOG_LEVEL=info
LOG_FORMAT=json
```

**Important**:
- `PORT=10000` is Render's default internal port
- Use `LOG_FORMAT=json` for production (structured logging)

#### 3. Deploy

Click "Create Web Service". Render will:
1. Clone repository
2. Run `npm install`
3. Start service with `npm start`
4. Assign public URL: `https://price-tracker-api.onrender.com`

#### 4. Verify Deployment

```bash
# Health check
curl https://price-tracker-api.onrender.com/health

# Track a test trade
curl -X POST https://price-tracker-api.onrender.com/priceTracker \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: text/plain" \
  -d "long	MODEL-0	AAPL	2025-11-01"
```

### Production Considerations

#### Cache Persistence

**Problem**: Render free tier ephemeral storage (files lost on restart)

**Solutions**:
1. **Render Disks** (Recommended):
   - Add persistent disk in Render dashboard
   - Mount at `/data`
   - Update `CACHE_DIR=/data/docs` in env vars

2. **External Storage**:
   - AWS S3, Google Cloud Storage, or similar
   - Modify `cacheManager.js` to read/write from cloud storage

3. **Database Migration** (Long-term):
   - Migrate from JSON files to PostgreSQL
   - Preserves data across deployments

#### Backup Strategy

Automated backups before cache writes:

```javascript
// Implemented in src/services/cacheManager.js
async function backupCache() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `docs/backups/trackedPriceCache-${timestamp}.json`;

  fs.copyFileSync('docs/trackedPriceCache.json', backupPath);

  // Keep only last 10 backups
  cleanOldBackups(10);
}
```

**Manual Backup**:
```bash
# Download cache from production
curl https://price-tracker-api.onrender.com/trackedPrice \
  -H "X-API-Key: $API_KEY" > backup-$(date +%Y%m%d).json
```

#### Monitoring

Enable Render's built-in monitoring:
1. Navigate to service dashboard
2. Click "Metrics" tab
3. Monitor:
   - Response times (target: <2s for POST /priceTracker)
   - Error rates (target: <1%)
   - Memory usage (target: <512MB)

**Custom Alerts**:
```bash
# Set up health check monitoring
curl -X POST https://uptimerobot.com/api/v2/newMonitor \
  -d "url=https://price-tracker-api.onrender.com/health" \
  -d "interval=300"
```

---

## Scheduled Jobs

### Progressive D+N Updates

Setup cron job to fill null price history as dates pass:

**Render Cron Jobs** (add in dashboard):
```
# Daily at 5 PM EST (after market close)
0 22 * * * curl -X POST https://price-tracker-api.onrender.com/internal/updateDailyPrices -H "X-Internal-Key: $INTERNAL_KEY"
```

**Implementation** (add to `src/api/endpoints/internal/`):

```javascript
// src/api/endpoints/internal/updateDailyPrices.js
export async function updateDailyPrices(req, res) {
  // Verify internal auth
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cache = await loadCache('trackedPriceCache.json');
  let updatedCount = 0;

  for (const trade of cache.trades) {
    for (let i = 0; i < 14; i++) {
      if (trade.priceHistory[i] === null) {
        const targetDate = addDays(new Date(trade.purchaseDate), i + 1);

        if (isPast(targetDate)) {
          // Fetch and fill price data
          const priceData = await fetchHistoricalPrice(trade.ticker, targetDate);
          trade.priceHistory[i] = priceData;
          trade.returns[i] = calculateReturn(trade, priceData, i);
          updatedCount++;
        }
      }
    }
  }

  await saveCache('trackedPriceCache.json', cache);

  res.json({
    status: 'completed',
    tradesUpdated: updatedCount,
    timestamp: new Date().toISOString()
  });
}
```

### Analyst Log Refresh

**Weekly Refresh** (Sundays at 2 AM):
```
0 2 * * 0 curl -X POST https://price-tracker-api.onrender.com/refreshAnalystLog -H "X-API-Key: $API_KEY"
```

**Note**: Full refresh takes ~2.5 hours. Ensure Render plan supports long-running processes.

---

## Troubleshooting

### Common Issues

#### 1. "Ticker not found" Error

**Symptom**: HTTP 207 response with individual trade status 404

**Cause**: Ticker not in `symbolCache.json`

**Solution**:
```bash
# Refresh symbol cache (from 001-financial-event-api)
curl -X POST http://localhost:3000/refreshSymbolCache \
  -H "X-API-Key: $API_KEY"

# Verify ticker exists
grep "AAPL" docs/symbolCache.json
```

#### 2. Lock Acquisition Timeout

**Symptom**: "Failed to acquire lock on trackedPriceCache.json"

**Cause**: Concurrent write attempts or stale lock file

**Solution**:
```bash
# Remove stale lock
rm docs/trackedPriceCache.json.lock

# Restart server
npm run dev
```

#### 3. FMP API Rate Limit

**Symptom**: HTTP 500 with "FMP API timeout" in error details

**Cause**: Exceeded 4 req/s parallel limit

**Solution**:
- Verify FMP plan tier (Professional required)
- Check existing rate limiting in `src/services/fmpClient.js`
- Reduce batch size if needed

#### 4. Missing D+N Data

**Symptom**: `priceHistory[i]` remains null despite date being in past

**Cause**: Holiday or weekend without next trading day logic

**Solution**:
```bash
# Check trading calendar
node -e "
  const { getNextTradingDay } = require('./src/lib/tradingCalendar');
  console.log(getNextTradingDay(new Date('2025-11-27'))); // Thanksgiving
"
# Expected: 2025-11-28 (next trading day)
```

#### 5. Backup Directory Full

**Symptom**: "ENOSPC: no space left on device"

**Cause**: Backup directory exceeds disk quota

**Solution**:
```bash
# Clean old backups (keeps last 10)
npm run clean:backups

# Manual cleanup
rm docs/backups/*.json
```

---

## Performance Optimization

### Expected Latencies

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| POST /priceTracker (single) | <2s | <5s |
| POST /priceTracker (10 trades) | <10s | <20s |
| GET /trackedPrice | <100ms | <500ms |
| POST /refreshAnalystLog | ~2.5hr | <3hr |

### Optimization Tips

#### 1. Batch API Calls

```javascript
// Good: Batch symbol lookups
const prices = await Promise.all(
  tickers.map(t => fmpClient.getHistoricalPrice(t, date))
);

// Bad: Sequential lookups
for (const ticker of tickers) {
  const price = await fmpClient.getHistoricalPrice(ticker, date);
}
```

#### 2. Cache Symbol Lookups

```javascript
// Pre-load symbolCache at startup
const symbolCache = new Map();
const symbols = JSON.parse(fs.readFileSync('docs/symbolCache.json'));
symbols.forEach(s => symbolCache.set(s.symbol, s));

// O(1) lookup vs O(n) array.find
const isValid = symbolCache.has(ticker);
```

#### 3. Minimize Cache Writes

```javascript
// Good: Batch updates before write
const updates = trades.map(t => updateTrade(t));
await saveCache(updates);

// Bad: Write after each trade
for (const trade of trades) {
  updateTrade(trade);
  await saveCache(trade); // Multiple file writes
}
```

---

## API Reference

See OpenAPI contracts in `specs/002-price-tracker/contracts/`:
- `priceTracker.openapi.yaml` - POST /priceTracker
- `trackedPrice.openapi.yaml` - GET /trackedPrice
- `refreshAnalystLog.openapi.yaml` - POST /refreshAnalystLog

Import contracts into Postman or Swagger UI for interactive documentation.

---

## Next Steps

1. **Review Data Model**: See `data-model.md` for entity definitions
2. **Understand Research Decisions**: See `research.md` for technical choices
3. **Read Implementation Plan**: See `plan.md` for architecture overview
4. **Start Development**: Follow task breakdown in `tasks.md` (generated via `/speckit.tasks`)

---

## Support

- **Issues**: Create GitHub issue with "002-price-tracker" label
- **Documentation**: See `specs/002-price-tracker/spec.md`
- **Constitution**: See `.specify/memory/constitution.md` for project principles
