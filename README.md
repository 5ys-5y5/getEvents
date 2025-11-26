# Financial Event and Valuation API

JSON-based REST API for retrieving financial event data and company valuation metrics, deployed on Render.com.

## Overview

This API integrates with Financial Modeling Prep (FMP) to provide:
- **Event Data**: Earnings calendars and financial events within date ranges
- **Cached Access**: Fast retrieval of previously collected event data
- **Quantitative Valuation**: Financial ratios (PBR, PSR, PER, ROE, EV/EBITDA, etc.)
- **Qualitative Valuation**: Analyst consensus price targets with D+N gap analysis
- **Event-Driven Workflows**: Automatic valuation for tickers with upcoming events

## Features

- **NDJSON Streaming**: Efficient event data delivery with line-by-line processing
- **File-Based Caching**: No database required, uses JSON file storage
- **Configuration-Driven**: API services and field mappings via `docs/ApiList.json`
- **Retry Logic**: Exponential backoff for external API failures
- **UTC Timestamps**: All date calculations in UTC timezone

## Tech Stack

- **Runtime**: Node.js 18.x+
- **Framework**: Express.js
- **HTTP Client**: axios + axios-retry
- **Date Handling**: date-fns-tz
- **Testing**: Jest + Nock

## Prerequisites

- Node.js 18.x or higher
- FMP API key (get from [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/))

## Setup

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd getEvents
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your FMP_API_KEY
   ```

3. **Create configuration files**:
   - Add `docs/config/ApiList.json` (FMP API service definitions)
   - Add `docs/config/evMethod.json` (valuation calculation formulas)

4. **Start development server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### GET /getEvent

Retrieve financial events for a date range (NDJSON stream).

**Query Parameters**:
- `startDate`: Days from today (integer, e.g., 3 = 3 days from now)
- `endDate`: Days from today (integer, must be >= startDate)

**Example**:
```bash
curl "http://localhost:3000/getEvent?startDate=3&endDate=7"
```

**Response**: NDJSON stream (eventRecord* + metaRecord)

### GET /getEventLatest

Retrieve cached event data from the last successful getEvent call.

**Example**:
```bash
curl "http://localhost:3000/getEventLatest"
```

**Response**: JSON object with `{ "meta": {...}, "events": [...] }`

### GET /getValuation

Calculate quantitative and qualitative valuation metrics.

**Query Parameters**:
- `tickers`: Comma-separated ticker symbols (e.g., "AAPL,MSFT") - required if cache=false
- `cache`: Boolean (true = use cached event tickers, false = use explicit tickers)

**Examples**:
```bash
# Manual ticker input
curl "http://localhost:3000/getValuation?tickers=AAPL,MSFT&cache=false"

# Use cached event tickers
curl "http://localhost:3000/getValuation?cache=true"
```

**Response**: JSON object with quantitative and qualitative metrics per ticker

### GET /refreshAnalystLog

Refresh analyst log cache with three-step process (price targets, frames, quotes).

**Query Parameters**:
- `priceTarget`: Boolean (step 1 - fetch analyst price targets from API)
- `frame`: Boolean (step 2 - initialize priceTrend structure for records)
- `quote`: Boolean (step 3 - fill null priceTrend values with historical prices)
- `generateRating`: Boolean (default: true, set to false to skip rating generation)
- `test`: Boolean (default: false, set to true to process only top 10 tickers)
- `tickers`: String (comma-separated ticker symbols, e.g., "AAPL,MSFT,GOOGL")

**Examples**:
```bash
# Run all three steps (default if no step specified)
curl "http://localhost:3000/refreshAnalystLog"

# Step 1 only: Refresh price target data
curl "http://localhost:3000/refreshAnalystLog?priceTarget=true"

# Step 2 only: Initialize priceTrend frames
curl "http://localhost:3000/refreshAnalystLog?frame=true"

# Step 3 only: Fill null quotes
curl "http://localhost:3000/refreshAnalystLog?quote=true"

# Combine steps 1 and 2
curl "http://localhost:3000/refreshAnalystLog?priceTarget=true&frame=true"

# Step 3 for specific tickers
curl "http://localhost:3000/refreshAnalystLog?tickers=AAPL,MSFT&quote=true"
```

**Response**: JSON object with steps executed and metadata

**Three-Step Process**:
1. **priceTarget**: Fetches analyst price targets, merges with existing data (preserves old records)
2. **frame**: Adds priceTrend structure (D1-D365 all null) to records that don't have it
3. **quote**: Fills null priceTrend values with historical prices via API (only updates nulls)

**Note**: If no step parameters provided, runs all three steps sequentially. This modular approach allows you to run expensive API calls (step 1 & 3) separately from lightweight operations (step 2).

### GET /generateRating

Generate analyst rating from existing analyst log (no API calls).

**Example**:
```bash
curl "http://localhost:3000/generateRating"
```

**Response**: JSON object with analyst rating metadata

**Use Case**: Fast rating regeneration using cached analystLog.json data without making additional API requests. Useful for quickly updating ratings after analyst log collection completes.

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:contract
```

## Performance Targets

- `getEvent`: < 2s to start NDJSON stream
- `getEventLatest`: < 100ms (1MB cache)
- `getValuation`: 15-20s per ticker
- Symbol cache refresh: < 5s (30k tickers)

## Deployment

This API is designed for deployment on Render.com:

1. Connect repository to Render.com
2. Set environment variable `FMP_API_KEY`
3. Configure build command: `npm install`
4. Configure start command: `npm start`

## Project Structure

```
src/
├── api/
│   ├── endpoints/      # /getEvent, /getEventLatest, /getValuation,
│   │                   # /refreshAnalystLog, /generateRating
│   └── middleware/     # Error handling, logging
├── services/           # FMP client, cache manager, normalizers
├── models/             # Schemas and type definitions
└── lib/                # Utilities (config, dates, streaming)

tests/
├── contract/           # API contract tests with Nock
├── integration/        # Endpoint integration tests
└── unit/               # Core logic unit tests

docs/
├── config/             # ApiList.json, evMethod.json
├── symbolCache.json    # Auto-generated ticker list (7-day expiry)
├── eventCache.json     # Last successful getEvent result
├── analystLog.json     # All tickers' analyst data cache
└── analystRating.json  # Analyst performance ratings with D+N gap analysis
```

## License

MIT
