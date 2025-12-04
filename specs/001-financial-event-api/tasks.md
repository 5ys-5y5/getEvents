# Implementation Tasks: Financial Event and Valuation API

**Feature Branch**: `001-financial-event-api`
**Generated**: 2025-11-25
**Source Files**: spec.md, plan.md, data-model.md, contracts/, research.md

---

## Task Format Legend

```
- [ ] T### [P] [US#] Description with file path
```

- `- [ ]`: Task checkbox (unchecked = pending)
- `T###`: Sequential task ID (T001, T002, etc.)
- `[P]`: Parallel execution marker (tasks can run simultaneously with other [P] tasks)
- `[US#]`: User Story label (US1-US5, omitted for Setup/Foundational/Polish phases)
- Description: Clear action with absolute file path

---

## Phase 1: Project Setup & Initialization

**Goal**: Initialize project structure, install dependencies, create directory tree

- [x] T001 Initialize Node.js project with package.json at C:/dev/getEvents/getEvents/package.json
- [x] T002 Install core dependencies: express, axios, axios-retry, date-fns-tz at C:/dev/getEvents/getEvents/
- [x] T003 Install dev dependencies: jest, nock at C:/dev/getEvents/getEvents/
- [x] T004 Create src/ directory structure: api/endpoints/, api/middleware/, services/, models/, lib/ at C:/dev/getEvents/getEvents/src/
- [x] T005 Create tests/ directory structure: contract/, integration/, unit/, contract/fixtures/ at C:/dev/getEvents/getEvents/tests/
- [x] T006 Create docs/ directory structure: config/ subdirectory at C:/dev/getEvents/getEvents/docs/
- [x] T007 Configure Jest test runner in package.json with test scripts and coverage settings at C:/dev/getEvents/getEvents/package.json
- [x] T008 Create .gitignore file with node_modules/, docs/*.json (except config/), .env at C:/dev/getEvents/getEvents/.gitignore
- [x] T009 Create .env.example file with FMP_API_KEY placeholder at C:/dev/getEvents/getEvents/.env.example
- [x] T010 Create README.md with project overview and setup instructions at C:/dev/getEvents/getEvents/README.md

**Checkpoint**: Project structure ready, dependencies installed, configuration files in place

---

## Phase 2: Foundational Infrastructure (No User Story Labels)

**Goal**: Build core services that ALL user stories depend on

### Configuration & Utilities

- [ ] T011 [P] Implement configLoader.js to load and validate ApiList.json at C:/dev/getEvents/getEvents/src/lib/configLoader.js
- [ ] T012 [P] Implement configLoader.js to load and validate evMethod.json at C:/dev/getEvents/getEvents/src/lib/configLoader.js
- [ ] T013 [P] Implement dateUtils.js for UTC date calculations, ISO 8601 formatting, and date offset logic at C:/dev/getEvents/getEvents/src/lib/dateUtils.js
- [ ] T014 [P] Implement schemas.js with JSON Schema definitions for EventRecord, MetaRecord, ValuationRecord at C:/dev/getEvents/getEvents/src/models/schemas.js
- [ ] T015 [P] Implement types.js with JSDoc type definitions for all entities at C:/dev/getEvents/getEvents/src/models/types.js

### HTTP Client & Error Handling

- [ ] T016 Implement fmpClient.js with axios instance, retry logic (exponential backoff), timeout configuration, and FMP_API_KEY injection at C:/dev/getEvents/getEvents/src/services/fmpClient.js
- [ ] T017 [P] Implement errorHandler.js middleware with HTTP status code mapping and structured error responses at C:/dev/getEvents/getEvents/src/api/middleware/errorHandler.js
- [ ] T018 [P] Implement logger.js middleware with structured JSON logging for requests, responses, and errors at C:/dev/getEvents/getEvents/src/api/middleware/logger.js

### Express Application Setup

- [ ] T019 Create Express app entry point index.js with middleware registration, route mounting, and error handling at C:/dev/getEvents/getEvents/src/index.js
- [ ] T020 Configure Express to handle NDJSON streaming and JSON responses in index.js at C:/dev/getEvents/getEvents/src/index.js

**Checkpoint**: Core infrastructure ready (config loading, date utilities, HTTP client, error handling, logging)

---

## Phase 3: User Story 1 [US1] - Event Data Retrieval (P1)

**Goal**: Implement GET /getEvent endpoint with NDJSON streaming

**User Story**: User retrieves financial events for a date range (e.g., today+3 to today+7)

### SymbolCache Management

- [ ] T021 [US1] Implement symbolCache refresh logic in cacheManager.js: check age (7 days), call filter.target API, retry up to 3 times at C:/dev/getEvents/getEvents/src/services/cacheManager.js
- [ ] T022 [US1] Implement symbolCache file I/O operations: read, write, validate structure in cacheManager.js at C:/dev/getEvents/getEvents/src/services/cacheManager.js
- [ ] T023 [US1] Implement symbolCache filtering: check if ticker exists in cache before including in results at C:/dev/getEvents/getEvents/src/services/cacheManager.js

### Event Data Collection

- [ ] T024 [US1] Implement eventNormalizer.js to transform API responses using fieldMap from ApiList.json (generalized loop, no hardcoded keys) at C:/dev/getEvents/getEvents/src/services/eventNormalizer.js
- [ ] T025 [US1] Implement event deduplication logic in eventNormalizer.js: remove duplicates by (ticker, date, source) key at C:/dev/getEvents/getEvents/src/services/eventNormalizer.js
- [ ] T026 [US1] Implement MetaRecord generation in eventNormalizer.js: collectionErrorChecklist with per-service status tracking at C:/dev/getEvents/getEvents/src/services/eventNormalizer.js

### NDJSON Streaming

- [ ] T027 [US1] Implement ndJsonStreamer.js for streaming NDJSON output: write EventRecords line-by-line, append MetaRecord at end at C:/dev/getEvents/getEvents/src/lib/ndJsonStreamer.js

### getEvent Endpoint

- [ ] T028 [US1] Implement getEvent endpoint: validate query params (startDate, endDate), return HTTP 400 for invalid ranges at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T029 [US1] Implement getEvent endpoint: convert startDate/endDate to ISO 8601 dates using dateUtils at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T030 [US1] Implement getEvent endpoint: trigger symbolCache refresh if stale (>= 7 days) at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T031 [US1] Implement getEvent endpoint: call all getEvent services from ApiList.json, handle parallel API calls (max 4 req/s) at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T032 [US1] Implement getEvent endpoint: normalize and filter events using eventNormalizer and symbolCache at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T033 [US1] Implement getEvent endpoint: stream NDJSON response using ndJsonStreamer at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T034 [US1] Implement getEvent endpoint: write successful results to docs/getEventCache.json with meta.request fields at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T035 [US1] Implement getEvent endpoint: return HTTP 5xx if all critical services fail (before streaming starts) at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js

### Configuration Files

- [ ] T036 [US1] [P] Create ApiList.json config file with getEvent services (fmp-earnings-calendar, etc.) and fieldMap definitions at C:/dev/getEvents/getEvents/docs/config/ApiList.json
- [ ] T037 [US1] [P] Create getEventOutputSchema.jsonl with EventRecord and MetaRecord schema definitions at C:/dev/getEvents/getEvents/docs/getEventOutputSchema.jsonl

**Checkpoint**: GET /getEvent endpoint functional with NDJSON streaming, symbolCache refresh, and event filtering

---

## Phase 4: User Story 2 [US2] - Cached Event Access (P2)

**Goal**: Implement GET /getEventLatest endpoint to return cached event data

**User Story**: User retrieves most recent cached event data without triggering new API calls

### getEventLatest Endpoint

- [ ] T038 [US2] Implement getEventLatest endpoint: read docs/getEventCache.json file at C:/dev/getEvents/getEvents/src/api/endpoints/getEventLatest.js
- [ ] T039 [US2] Implement getEventLatest endpoint: return HTTP 404 with "GET_EVENT_CACHE_NOT_AVAILABLE" if file does not exist at C:/dev/getEvents/getEvents/src/api/endpoints/getEventLatest.js
- [ ] T040 [US2] Implement getEventLatest endpoint: return HTTP 503 if file exists but JSON parsing fails (corrupted) at C:/dev/getEvents/getEvents/src/api/endpoints/getEventLatest.js
- [ ] T041 [US2] Implement getEventLatest endpoint: return HTTP 200 with JSON structure { "meta": {...}, "events": [...] } at C:/dev/getEvents/getEvents/src/api/endpoints/getEventLatest.js
- [ ] T042 [US2] Register getEventLatest route in Express app (index.js) at C:/dev/getEvents/getEvents/src/index.js

**Checkpoint**: GET /getEventLatest endpoint functional, returning cached data or appropriate error codes

---

## Phase 5: User Story 3 [US3] - Quantitative Valuation (P3)

**Goal**: Implement quantitative valuation calculations (PBR, PSR, PER, ROE, etc.)

**User Story**: User provides ticker list manually and receives financial ratio-based valuation metrics

### Quantitative Calculation Logic

- [ ] T043 [US3] Implement ttmFromQuarterSumOrScaled aggregation in quantitativeValuation.js: sum if 4 quarters, else (avg * 4) at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T044 [US3] [P] Implement avgFromQuarter aggregation in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T045 [US3] [P] Implement lastFromQuarter aggregation in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T046 [US3] [P] Implement yoyFromQuarter aggregation in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T047 [US3] [P] Implement qoqFromQuarter aggregation in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js

### Quantitative Metrics

- [ ] T048 [US3] Implement PBR calculation (marketCap / totalStockholdersEquity) in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T049 [US3] Implement PSR calculation (marketCap / revenueTTM) in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T050 [US3] Implement PER calculation (marketCap / netIncomeTTM) in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T051 [US3] Implement ROE calculation (netIncomeTTM / equityAvg) in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T052 [US3] Implement EV_EBITDA calculation ((marketCap + totalDebt - cash) / ebitdaTTM) in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T053 [US3] Implement RunwayYears calculation (cash / abs(operatingIncomeTTM)) for negative operating income at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T054 [US3] [P] Implement CurrentRatio calculation (totalCurrentAssets / totalCurrentLiabilities) in quantitativeValuation.js at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T055 [US3] [P] Implement CashToRevenueTTM, RevenueYoY, RevenueQoQ, GrossMarginLastQuarter, GrossMarginTTM calculations at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T056 [US3] [P] Implement RNDIntensityTTM, OperatingMarginTTM, SharesDilutionYoY, DebtToEquityAvg calculations at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T057 [US3] [P] Implement OtherNonCurrentLiabilitiesToEquityAvg, NetDebtToEquityAvg, APICYoY calculations at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js

### API Integration for Quantitative Data

- [ ] T058 [US3] Implement FMP API calls in quantitativeValuation.js: getIncomeStatement, getBalanceSheetStatement, getCompanyProfile at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js
- [ ] T059 [US3] Handle null/missing data gracefully: return null for metrics when API data insufficient at C:/dev/getEvents/getEvents/src/services/quantitativeValuation.js

### getValuation Endpoint (Quantitative Only)

- [ ] T060 [US3] Create getValuation endpoint: validate query params (tickers required if cache=false) at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T061 [US3] Implement getValuation endpoint: parse comma-separated tickers parameter at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T062 [US3] Implement getValuation endpoint: call quantitativeValuation.js for each ticker at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T063 [US3] Implement getValuation endpoint: return HTTP 200 with JSON structure { "meta": {...}, "valuations": [...] } at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T064 [US3] Register getValuation route in Express app (index.js) at C:/dev/getEvents/getEvents/src/index.js

### Configuration Files

- [ ] T065 [US3] [P] Add getQuantitiveValuation services to ApiList.json (income-statement, balance-sheet-statement, company-profile) at C:/dev/getEvents/getEvents/docs/config/ApiList.json
- [ ] T066 [US3] [P] Create evMethod.json with quantitative metric definitions and aggregation formulas at C:/dev/getEvents/getEvents/docs/config/evMethod.json

**Checkpoint**: GET /getValuation?tickers=AAPL,MSFT&cache=false returns quantitative metrics

---

## Phase 6: User Story 4 [US4] - Qualitative Valuation (P3)

**Goal**: Implement qualitative valuation with analyst ratings and D+N gap analysis

**User Story**: User retrieves analyst consensus target prices and D+N gap rate profiles for tickers

### Qualitative Calculation Logic

- [ ] T067 [US4] Implement ConsensusTargetPrice calculation in qualitativeValuation.js: average of adjPriceTarget values at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T068 [US4] Implement PriceTargetSummary pass-through in qualitativeValuation.js: return first element from fmp-price-target-summary API or null at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js

### Analyst Rating & D+N Gap Analysis

- [ ] T069 [US4] Implement ratingAnalyst calculation logic in qualitativeValuation.js: extract unique analystName list from price targets at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T070 [US4] Implement D+N gap rate calculation in qualitativeValuation.js: for each of 14 horizons (0,1,2,3,4,5,6,7,14,21,30,60,180,365) at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T071 [US4] Implement EOD price fetching in qualitativeValuation.js: call fmp-historical-price-eod API for each D+N date at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T072 [US4] Implement non-trading day handling in qualitativeValuation.js: use nearest prior trading day EOD price at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T073 [US4] Implement gap rate statistics calculation in qualitativeValuation.js: avgGapRate (mean), deviation (std dev), sampleCount at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T074 [US4] Implement sample count filtering in qualitativeValuation.js: omit D+N fields where sampleCount < 3 at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js

### EachPriceTargetConsensusWithRating

- [ ] T075 [US4] Implement consensusWithAnalystRating merge logic in qualitativeValuation.js: merge analyst D+N profiles into price target records at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js

### API Integration for Qualitative Data

- [ ] T076 [US4] Implement FMP API calls in qualitativeValuation.js: getEachPriceTargetConsensus (1 call per ticker) at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T077 [US4] Implement FMP API calls in qualitativeValuation.js: getEachGradingConsensus (1 call per ticker) at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T078 [US4] Implement FMP API calls in qualitativeValuation.js: getEachPriceTargetConsensusSummary (1 call per ticker) at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js
- [ ] T079 [US4] Implement FMP API calls in qualitativeValuation.js: fmp-price-target-analyst-name (1 call per unique analystName) at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js

### getValuation Endpoint (Add Qualitative)

- [ ] T080 [US4] Update getValuation endpoint: call qualitativeValuation.js for each ticker at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T081 [US4] Update getValuation endpoint: merge quantitative and qualitative results into ValuationRecord at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js

### Configuration Files

- [ ] T082 [US4] [P] Add getQualativeValuation services to ApiList.json (fmp-price-target, fmp-price-target-summary, fmp-price-target-analyst-name, fmp-historical-price-eod) at C:/dev/getEvents/getEvents/docs/config/ApiList.json
- [ ] T083 [US4] [P] Add qualitative metric definitions to evMethod.json (ConsensusTargetPrice, analystRating, D+N horizons) at C:/dev/getEvents/getEvents/docs/config/evMethod.json

**Checkpoint**: GET /getValuation returns both quantitative and qualitative metrics with D+N gap analysis

---

## Phase 7: User Story 5 [US5] - Event-Driven Valuation with Cache (P2)

**Goal**: Implement cache=true mode for getValuation to auto-trigger getEvent

**User Story**: User calls getValuation with cache=true, system auto-refreshes events and evaluates tickers with upcoming events

### Cache Integration

- [ ] T084 [US5] Implement cache=true logic in getValuation endpoint: read docs/getEventCache.json at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T085 [US5] Implement cache=true logic in getValuation endpoint: extract meta.request.startDate and meta.request.endDate at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T086 [US5] Implement cache=true logic in getValuation endpoint: call internal getEvent function with cached date range at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T087 [US5] Implement cache=true logic in getValuation endpoint: extract ticker list from events[*].ticker in refreshed cache at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T088 [US5] Implement cache=true logic in getValuation endpoint: fallback to stale cache if internal getEvent call fails, log error in collectionErrorChecklist at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T089 [US5] Implement cache=true logic in getValuation endpoint: return HTTP 400 if docs/getEventCache.json missing or lacks meta.request at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T090 [US5] Update getValuation endpoint: include date and source context in valuations[*] objects when cache=true at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js

**Checkpoint**: GET /getValuation?cache=true auto-refreshes events and evaluates event-driven tickers

---

## Phase 8: Integration & Polish

**Goal**: Testing, optimization, documentation, deployment preparation

### Integration Testing

- [ ] T091 Create contract test fixtures in tests/contract/fixtures/fmpResponses.json with recorded FMP API responses at C:/dev/getEvents/getEvents/tests/contract/fixtures/fmpResponses.json
- [ ] T092 Implement contract tests in fmpClient.contract.test.js using Nock: verify fieldMap matches API responses at C:/dev/getEvents/getEvents/tests/contract/fmpClient.contract.test.js
- [ ] T093 Implement integration test for getEvent endpoint: valid date range returns NDJSON at C:/dev/getEvents/getEvents/tests/integration/getEvent.integration.test.js
- [ ] T094 Implement integration test for getEvent endpoint: invalid date range returns HTTP 400 at C:/dev/getEvents/getEvents/tests/integration/getEvent.integration.test.js
- [ ] T095 Implement integration test for getEvent endpoint: symbolCache refresh when stale at C:/dev/getEvents/getEvents/tests/integration/getEvent.integration.test.js
- [ ] T096 Implement integration test for getEventLatest endpoint: returns cached data or HTTP 404/503 at C:/dev/getEvents/getEvents/tests/integration/getEventLatest.integration.test.js
- [ ] T097 Implement integration test for getValuation endpoint: cache=false with tickers returns quantitative + qualitative at C:/dev/getEvents/getEvents/tests/integration/getValuation.integration.test.js
- [ ] T098 Implement integration test for getValuation endpoint: cache=true triggers getEvent internally at C:/dev/getEvents/getEvents/tests/integration/getValuation.integration.test.js

### Performance Optimization

- [ ] T099 Verify getEvent NDJSON stream starts in < 2 seconds (SC-001) at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T100 Verify symbolCache refresh completes in < 5 seconds for 30k tickers (SC-002) at C:/dev/getEvents/getEvents/src/services/cacheManager.js
- [ ] T101 Verify getEventLatest responds in < 100ms for 1MB cache (SC-003) at C:/dev/getEvents/getEvents/src/api/endpoints/getEventLatest.js
- [ ] T102 Verify getValuation completes in 15-20 seconds per ticker (SC-004) at C:/dev/getEvents/getEvents/src/api/endpoints/getValuation.js
- [ ] T103 Optimize ratingAnalyst calculation to complete in < 15 seconds for 100 analysts (SC-005) at C:/dev/getEvents/getEvents/src/services/qualitativeValuation.js

### Documentation

- [ ] T104 [P] Update README.md with API endpoint documentation, example requests, and response formats at C:/dev/getEvents/getEvents/README.md
- [ ] T105 [P] Create DEPLOYMENT.md with Render.com deployment instructions and environment variable setup at C:/dev/getEvents/getEvents/DEPLOYMENT.md
- [ ] T106 [P] Create TESTING.md with instructions for running unit, integration, and contract tests at C:/dev/getEvents/getEvents/TESTING.md

### Deployment Preparation

- [ ] T107 Verify relative path handling for docs/ directory works on Render.com (SC-009) at C:/dev/getEvents/getEvents/src/index.js
- [ ] T108 Configure Render.com build command and start command in package.json at C:/dev/getEvents/getEvents/package.json
- [ ] T109 Test concurrent user load: 10 simultaneous getEvent requests with < 1% error rate (SC-010) at C:/dev/getEvents/getEvents/src/api/endpoints/getEvent.js
- [ ] T110 Verify code coverage: 70% overall (SC-007), 90% for critical paths (SC-008) at C:/dev/getEvents/getEvents/

**Checkpoint**: All tests passing, performance targets met, documentation complete, ready for deployment

---

## Dependency Graph

### Story Completion Order (Sequential Dependencies)

```
Setup (Phase 1)
  ↓
Foundational (Phase 2) ← BLOCKING: Required by ALL user stories
  ↓
├─→ US1 (Phase 3) ← BLOCKING: Required by US2, US5
│     ↓
│   ├─→ US2 (Phase 4) ← Fast, no dependencies beyond US1
│   │
│   └─→ US5 (Phase 7) ← Depends on US1 (getEvent), US3+US4 (valuation logic)
│
├─→ US3 (Phase 5) ← Can start after Foundational, independent of US1
│     ↓
│   US4 (Phase 6) ← Can start after US3 (extends valuation)
│
└─→ Polish (Phase 8) ← Depends on ALL user stories
```

### Critical Path (Must Complete in Order)

1. **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (US1)** → **Phase 7 (US5)** → **Phase 8 (Polish)**

### Parallel Opportunities

- **After Phase 2**: US3 (Quantitative) can be developed in parallel with US1 (Event Data)
- **After US1**: US2 (Cache Read) is quick and can be done in parallel with US3/US4 work
- **After US3**: US4 (Qualitative) extends US3 but doesn't block US1/US2/US5
- **Within Phases**: Many tasks marked [P] can run in parallel (different files, no blocking dependencies)

---

## Parallel Execution Examples

### Phase 2 (Foundational) - Parallel Tasks
```
T011 [P] configLoader.js (ApiList)    ┐
T012 [P] configLoader.js (evMethod)   ├─ Can all run in parallel
T013 [P] dateUtils.js                 │  (different responsibilities)
T014 [P] schemas.js                   │
T015 [P] types.js                     ┘
```

### Phase 3 (US1) - Parallel Configuration Tasks
```
T036 [P] ApiList.json creation        ┐
T037 [P] getEventOutputSchema.jsonl   ┘─ Can run in parallel (separate config files)
```

### Phase 5 (US3) - Parallel Aggregation Functions
```
T044 [P] avgFromQuarter    ┐
T045 [P] lastFromQuarter   ├─ Can all run in parallel
T046 [P] yoyFromQuarter    │  (separate aggregation functions)
T047 [P] qoqFromQuarter    ┘
```

### Phase 5 (US3) - Parallel Metric Calculations
```
T054 [P] CurrentRatio                      ┐
T055 [P] CashToRevenueTTM, RevenueYoY...   ├─ Can run in parallel
T056 [P] RNDIntensityTTM, OperatingMargin  │  (independent metric calculations)
T057 [P] OtherNonCurrentLiabilities...     ┘
```

### Phase 8 (Polish) - Parallel Documentation
```
T104 [P] README.md update    ┐
T105 [P] DEPLOYMENT.md       ├─ Can run in parallel (separate doc files)
T106 [P] TESTING.md          ┘
```

---

## Task Summary

### Total Task Count: 110 tasks

### Tasks by User Story

| User Story | Priority | Task Count | Task Range |
|------------|----------|------------|------------|
| **Setup** | - | 10 | T001-T010 |
| **Foundational** | - | 10 | T011-T020 |
| **US1: Event Data Retrieval** | P1 | 17 | T021-T037 |
| **US2: Cached Event Access** | P2 | 5 | T038-T042 |
| **US3: Quantitative Valuation** | P3 | 24 | T043-T066 |
| **US4: Qualitative Valuation** | P3 | 17 | T067-T083 |
| **US5: Event-Driven Valuation** | P2 | 7 | T084-T090 |
| **Polish** | - | 20 | T091-T110 |

### Tasks by Phase

| Phase | Description | Task Count | Parallel Tasks |
|-------|-------------|------------|----------------|
| 1 | Setup | 10 | 0 |
| 2 | Foundational | 10 | 6 (60%) |
| 3 | US1 (P1) | 17 | 2 (12%) |
| 4 | US2 (P2) | 5 | 0 |
| 5 | US3 (P3) | 24 | 11 (46%) |
| 6 | US4 (P3) | 17 | 2 (12%) |
| 7 | US5 (P2) | 7 | 0 |
| 8 | Polish | 20 | 3 (15%) |

### Parallel Execution Opportunities

- **Total Parallelizable Tasks**: 24 tasks (22% of total)
- **Best Parallel Phases**: Phase 2 (Foundational), Phase 5 (US3 Quantitative)
- **Sequential Phases**: Phase 1 (Setup), Phase 7 (US5 Cache Integration)

---

## MVP Recommendation

### MVP Scope (Fastest Path to Functional API)

**Goal**: Minimal viable implementation with core functionality

**Include**:
1. **Phase 1**: Setup (T001-T010) - Required
2. **Phase 2**: Foundational (T011-T020) - Required
3. **Phase 3**: US1 Event Data Retrieval (T021-T037) - Core feature
4. **Phase 4**: US2 Cached Event Access (T038-T042) - Quick win
5. **Phase 5**: US3 Quantitative Valuation (T043-T066) - Simplified metrics only (PBR, PSR, PER, ROE)
6. **Minimal Testing**: T093-T098 (integration tests only, skip contract tests)
7. **Skip**: US4 (Qualitative), US5 (Cache Integration), Full Polish

**MVP Task Count**: ~70 tasks (64% of full scope)

**MVP Timeline Estimate**:
- Setup + Foundational: 2-3 days
- US1 (Event Data): 3-4 days
- US2 (Cache Read): 0.5 day
- US3 (Quantitative, simplified): 2-3 days
- Basic Testing: 1-2 days
- **Total**: 9-13 days (single developer)

### Full Feature Scope

**Goal**: Complete implementation with all user stories

**Timeline Estimate**:
- MVP (above): 9-13 days
- US4 (Qualitative with D+N): 4-5 days (complex analyst rating logic)
- US5 (Cache Integration): 1-2 days
- Full Testing + Polish: 3-4 days
- **Total**: 17-24 days (single developer)

---

## Success Metrics

### Performance Targets (from spec.md Success Criteria)

| Metric | Target | Test Task |
|--------|--------|-----------|
| getEvent NDJSON stream start | < 2s | T099 |
| symbolCache refresh (30k tickers) | < 5s | T100 |
| getEventLatest (1MB cache) | < 100ms | T101 |
| getValuation per ticker | 15-20s | T102 |
| ratingAnalyst (100 analysts) | < 15s | T103 |
| Concurrent users (10) error rate | < 1% | T109 |

### Code Coverage Targets

| Scope | Target | Test Task |
|-------|--------|-----------|
| Overall coverage | 70% | T110 |
| Critical paths (date conversion, aggregation, D+N) | 90% | T110 |

### Configuration-Driven Architecture

| Requirement | Validation | Task |
|-------------|------------|------|
| fieldMap auto-mapping (no hardcoded keys) | 100% generalized loops | T024 |
| API service additions require zero code changes | Config-only updates | T036, T065, T082 |

---

## Notes

- **No Test Tasks in Early Phases**: Per user request, spec doesn't require extensive testing, so test tasks are concentrated in Phase 8
- **Parallel Tasks**: 24 tasks marked [P] can run simultaneously (different files, no dependencies)
- **Critical Path**: Phase 1 → Phase 2 → Phase 3 (US1) → Phase 7 (US5) → Phase 8 (Polish)
- **Quick Wins**: US2 (5 tasks) can be completed quickly after US1, provides immediate value
- **Complex Areas**: US4 (Qualitative) is most complex due to 14 D+N horizon calculations and analyst rating profiles

---

## File Path Reference

All file paths are absolute and reference `C:/dev/getEvents/getEvents/` as the project root.

### Source Files
- `src/index.js` - Express app entry point
- `src/api/endpoints/*.js` - API endpoint handlers (getEvent, getEventLatest, getValuation)
- `src/api/middleware/*.js` - Middleware (errorHandler, logger)
- `src/services/*.js` - Business logic (cacheManager, eventNormalizer, fmpClient, quantitativeValuation, qualitativeValuation)
- `src/models/*.js` - Data schemas and types
- `src/lib/*.js` - Utilities (configLoader, dateUtils, ndJsonStreamer)

### Configuration Files
- `docs/config/ApiList.json` - API service definitions and field mappings
- `docs/config/evMethod.json` - Valuation calculation formulas

### Cache Files (Runtime Generated)
- `docs/symbolCache.json` - Eligible ticker list (refreshed if > 7 days old)
- `docs/getEventCache.json` - Cached getEvent results

### Test Files
- `tests/contract/*.test.js` - Contract tests with Nock
- `tests/integration/*.test.js` - End-to-end API tests
- `tests/contract/fixtures/*.json` - Recorded API responses

---

**END OF TASKS.MD**
