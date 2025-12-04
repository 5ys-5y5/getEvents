# Financial Event API - Quick Start Guide

## Prerequisites

- Node.js 18.x+
- FMP API key (environment variable)
- Git

## Installation

```bash
npm install
cp .env.example .env  # Add FMP_API_KEY
```

## Running Locally

```bash
npm run dev
```

## API Usage Examples

### A. Get events for next 7-14 days

```bash
curl "http://localhost:3000/getEvent?startDate=3&endDate=7"
```

### B. Get cached events

```bash
curl "http://localhost:3000/getEventLatest"
```

### C. Get valuation for specific tickers

```bash
curl "http://localhost:3000/getValuation?tickers=AAPL,MSFT&cache=false"
```

**Response includes:**
- `price`: Current price (pre-post-market API during extended hours, quote API during regular hours)
- `quantitative`: PBR, PSR, PER, ROE, etc.
- `peerQuantitative`: Average metrics from peer tickers with peerCount and peerList
- `qualitative.ConsensusTargetPrice`: Object with targetConsensus, targetHigh, targetLow, targetMedian
- `qualitative.PriceTargetSummary`: Summary statistics (lastMonth/Quarter/Year/AllTime)

### D. Get valuation using event cache

```bash
curl "http://localhost:3000/getValuation?cache=true"
```

### E. Refresh analyst log cache (manual trigger)

```bash
# Run all steps (default: priceTarget + frame + quote)
curl "http://localhost:3000/refreshAnalystLog"

# Step 1: Refresh price target data only &Initialize priceTrend frames only & Fill null quote values only
curl "http://localhost:3000/refreshAnalystLog?priceTarget=true&frame=true&quote=true"

# Combine specific steps
curl "http://localhost:3000/refreshAnalystLog?priceTarget=true&frame=true"

# Process specific tickers
curl "http://localhost:3000/refreshAnalystLog?tickers=AAPL,MSFT&quote=true"

# Test mode: top 10 tickers only
curl "http://localhost:3000/refreshAnalystLog?test=true&priceTarget=true"
```

**Three-Step Process:**
1. **priceTarget=true**: Fetch analyst price targets from API, merge with existing data (preserves old records)
2. **frame=true**: Add priceTrend structure (D1-D365 all null) to records missing it
3. **quote=true**: Fill null priceTrend values with historical prices via API

**Note:**
- If no step parameters given, runs all three steps sequentially
- Rating generation enabled by default (use `generateRating=false` to skip)
- Use `tickers` parameter to process specific tickers (comma-separated)
- Use `test=true` for quick validation with top 10 tickers only
- Each step preserves existing data and only updates what's needed

### F. Generate analyst rating (without API calls)

```bash
# Generate analystRating.json from existing analystLog.json
curl "http://localhost:3000/generateRating"
```

**Use case:**
- Fast rating regeneration without API calls
- Useful after refreshAnalystLog completes
- No rate limiting concerns since it only reads cached data

## Running Tests

```bash
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:contract       # Contract tests only
npm run test:coverage       # With coverage report
```

## Deployment to Render.com

1. Connect GitHub repo
2. Set `FMP_API_KEY` environment variable
3. Deploy automatically on push to main

## Troubleshooting

- Check cache files exist in `docs/`
- Verify FMP API key is valid
- Review logs for `collectionErrorChecklist`
