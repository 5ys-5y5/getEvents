# Feature Specification: Price Tracker with Model Performance Analysis

**Feature Branch**: `002-price-tracker`
**Created**: 2025-11-28
**Updated**: 2025-11-28
**Status**: Draft

Updated specification includes:
- Bulk input support (tab-delimited format for POST /priceTracker)
- trackedPriceCache.json storage in docs folder
- trackedPrice endpoint (GET /trackedPrice) for viewing cached data and model summaries
- Progressive data update mechanism (null values filled as time passes)
- refreshAnalystLog incremental persistence (every 100 records)
- maxCap/lowCap terminology (20%/5% percentiles, unified across positions)
- Trading day logic: D+N holidays use next trading day price with actualDate field

## User Scenarios & Testing

### User Story 1 - Individual Trade Performance Tracking (Priority: P1)

Track individual trade performance over 14 days with accurate return calculations.

### User Story 2 - Bulk Trade Input and Progressive Data Update (Priority: P1)

Bulk tab-delimited input with smart merging (update null values, preserve existing data).

### User Story 3 - View Cached Price Tracking Data (Priority: P2)

Query all tracked trades and model summaries via GET /trackedPrice endpoint.

### User Story 4 - Model Performance Summary Analysis (Priority: P2)

Calculate optimal holding periods, maxCap (익절: 20 percentile), lowCap (손절: 5 percentile).

### User Story 5 - Resilient Analyst Log Refresh (Priority: P3)

Checkpoint-based persistence every 100 records for 600k+ API calls.

## Key Updates from User Feedback

1. **Cap Terminology Correction**:
   - maxCap (수익 상한): 20 백분위수 - 대부분 거래가 도달하는 수익률 (익절 기준)
   - lowCap (손실 하한): 5 백분위수 - 손실 제한 기준 (손절 기준)
   - Both apply across long/short positions (long +20%/-5%, short주가 -20%/+5%)

2. **Trading Day Logic**:
   - D+N holidays → use next trading day price
   - Track targetDate (D+N) and actualDate (거래일) separately
   - Max 7-day forward search for next trading day

3. **Progressive Update**:
   - Duplicate (position, modelName, ticker, purchaseDate) → merge null values only
   - Complete records → no overwrite
   - New combinations → append to cache

See full spec at: specs/002-price-tracker/spec.md
