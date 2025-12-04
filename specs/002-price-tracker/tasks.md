# Implementation Tasks: Price Tracker with Model Performance Analysis

**Feature**: 002-price-tracker
**Branch**: `002-price-tracker`
**Generated**: 2025-11-28
**Source**: Auto-generated from `/speckit.tasks` based on spec.md, plan.md, data-model.md, research.md

## Overview

This task breakdown organizes implementation by user story priority (P1 → P2 → P3) to enable incremental delivery. Each phase represents a complete, independently testable feature increment.

**Total Tasks**: 47
**Parallelizable Tasks**: 24 (marked with [P])
**Estimated MVP**: Phase 1-3 only (US1: Individual Trade Tracking)

---

## Task Format

```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

- **TaskID**: Sequential number (T001, T002, etc.)
- **[P]**: Parallelizable (can run simultaneously with other [P] tasks in same phase)
- **[Story]**: User story label (US1, US2, US3) - only for story-specific tasks
- **File paths**: Absolute when possible, relative to project root

---

## Phase 1: Setup & Dependencies

**Goal**: Install dependencies and initialize project infrastructure

**Duration**: ~30 minutes

### Tasks

- [ ] T001 Install proper-lockfile dependency: `npm install proper-lockfile --save`
- [ ] T002 [P] Create docs/backups/ directory for cache backups
- [ ] T003 [P] Initialize docs/trackedPriceCache.json with empty structure per data-model.md
- [ ] T004 [P] Verify docs/symbolCache.json exists (from 001-financial-event-api)
- [ ] T005 Update package.json scripts to include test:unit, test:integration, test:contract

**Validation**:
- `npm list proper-lockfile` shows installed version
- `docs/trackedPriceCache.json` exists with meta, trades[], modelSummaries[] structure
- `docs/backups/` directory exists

---

## Phase 2: Foundational Utilities (Blocking Prerequisites)

**Goal**: Implement shared utilities required by all user stories

**Duration**: ~3-4 hours

### Tasks

- [ ] T006 [P] Create src/lib/percentile.js with custom percentile calculation per research.md section 3
- [ ] T007 [P] Create src/lib/tradingCalendar.js with NYSE holidays 2025 and isNonTradingDay() per research.md section 4
- [ ] T008 [P] Add getNextTradingDay() function to src/lib/tradingCalendar.js with 7-day max search
- [ ] T009 [P] Extend src/lib/dateUtils.js with calculateDPlusN(purchaseDate, n) function for D+1 to D+14
- [ ] T010 [P] Create src/models/schemas.js additions: TradeRecord, PriceHistory, ReturnRecord, ModelSummary schemas per data-model.md
- [ ] T011 [P] Create src/models/types.js with JSDoc type definitions for all entities
- [ ] T012 Extend src/services/fmpClient.js with getHistoricalOHLC(ticker, date) function for FMP historical price API
- [ ] T013 Create src/services/cacheManager.js extension: loadTrackedPriceCache() and saveTrackedPriceCache() with proper-lockfile locking per research.md section 1
- [ ] T014 Add backupCache() function to src/services/cacheManager.js that creates timestamped backup before writes
- [ ] T015 Add mergeTradeRecord() function to src/services/cacheManager.js per data-model.md progressive update logic

**Validation**:
- Unit test percentile([10, 20, 30, 40, 50], 20) returns 18 (20th percentile)
- Unit test isNonTradingDay(new Date('2025-11-27')) returns true (Thanksgiving)
- Unit test getNextTradingDay(new Date('2025-11-27')) returns 2025-11-28
- Unit test calculateDPlusN('2025-11-01', 1) returns '2025-11-04' (skips weekend)
- Mock FMP API call returns OHLC data structure
- lockfile.lock() successfully acquires and releases lock on test file

**Dependencies**: None (foundational)

---

## Phase 3: User Story 1 - Individual Trade Performance Tracking (P1)

**Goal**: Track a single trade's performance over D+1 to D+14 horizons with cap-aware return calculation

**Story**: US1 - Individual Trade Performance Tracking
**Priority**: P1
**Duration**: ~6-8 hours

**Independent Test Criteria**:
✅ POST /priceTracker with single trade returns HTTP 207 with currentPrice, priceHistory[14], returns[14]
✅ Long position returns calculated as (close - currentPrice) / currentPrice
✅ Short position returns calculated as ((close - currentPrice) / currentPrice) * -1
✅ Cap-aware logic: returnSource shows "open_maxCap", "open_lowCap", or "close"
✅ Holiday dates use next trading day with actualDate tracking
✅ Invalid ticker returns HTTP 404 in per-trade status

### Tasks

- [ ] T016 [P] [US1] Create src/services/priceTrackerService.js with fetchCurrentPrice(ticker, purchaseDate) function
- [ ] T017 [P] [US1] Add fetchPriceHistoryForTrade(ticker, purchaseDate) to priceTrackerService.js: loops D+1 to D+14, calls getHistoricalOHLC(), handles holidays
- [ ] T018 [US1] Implement calculateCapAwareReturn(position, currentPrice, priceData, maxCapPct, lowCapPct) in priceTrackerService.js per research.md section 6
- [ ] T019 [US1] Add calculateReturnsArray(position, currentPrice, priceHistory, maxCap, lowCap) to priceTrackerService.js: maps priceHistory to ReturnRecord[] with returnSource
- [ ] T020 [US1] Implement createTradeRecord(position, modelName, ticker, purchaseDate) in priceTrackerService.js: orchestrates currentPrice, priceHistory, returns
- [ ] T021 [P] [US1] Create src/api/endpoints/priceTracker.js: POST /priceTracker endpoint handler
- [ ] T022 [US1] Add input parsing to priceTracker.js: parse tab-delimited text/plain request body per contracts/priceTracker.openapi.yaml
- [ ] T023 [US1] Add validation to priceTracker.js: check position enum, purchaseDate not future, ticker in symbolCache per FR-001 to FR-004, FR-017 to FR-019
- [ ] T024 [US1] Implement batch processing loop in priceTracker.js: iterate trades, call createTradeRecord(), collect per-trade status
- [ ] T025 [US1] Add cache update logic to priceTracker.js: call mergeTradeRecord() for duplicates, save to trackedPriceCache.json with lock
- [ ] T026 [US1] Implement HTTP 207 response formatting in priceTracker.js per research.md section 2: results[], summary{total, succeeded, failed}
- [ ] T027 [P] [US1] Add route to src/index.js: POST /priceTracker → priceTracker.js handler
- [ ] T028 [P] [US1] Extend src/api/middleware/errorHandler.js to support HTTP 207 multi-status responses

**Validation**:
- Integration test: POST /priceTracker with "long\tMODEL-0\tAAPL\t2025-11-01" returns HTTP 207 with status 200 for trade
- Integration test: POST /priceTracker with invalid ticker returns HTTP 207 with status 404 for that trade
- Integration test: Verify priceHistory[0].targetDate = '2025-11-04' (D+1, skips weekend)
- Integration test: Verify returns[0].returnSource = "close" when caps not hit
- Integration test: Long position with high hitting maxCap shows returnSource = "open_maxCap"
- Unit test: calculateCapAwareReturn('long', 100, {open:101, high:125, low:99, close:102}, 0.20, 0.05) returns returnSource="open_maxCap"

**Dependencies**: Phase 2 (Foundational Utilities)

---

## Phase 4: User Story 2 - Model Performance Summary Analysis (P2)

**Goal**: Aggregate trades per model and calculate optimal holding period + cap percentiles

**Story**: US2 - Model Performance Summary Analysis
**Priority**: P2
**Duration**: ~4-5 hours

**Independent Test Criteria**:
✅ GET /trackedPrice returns all trades + modelSummaries with suggestedMaxCap/lowCap per model
✅ suggestedMaxCap = 20th percentile of all completed returns for model
✅ suggestedLowCap = 5th percentile of all completed returns for model
✅ Models with < 3 trades show null for suggestedMaxCap/lowCap
✅ avgReturn and winRate calculated correctly from non-null returns

### Tasks

- [ ] T029 [P] [US2] Create src/services/modelSummaryService.js with aggregateModelReturns(modelName, trades) function
- [ ] T030 [P] [US2] Add calculateOptimalHoldingDays(returns) to modelSummaryService.js: find average day of max return
- [ ] T031 [US2] Add calculateSuggestedCaps(allReturns) to modelSummaryService.js: calls percentile(allReturns, 20) and percentile(allReturns, 5) per data-model.md VR-016 to VR-018
- [ ] T032 [US2] Add calculateAvgReturnAndWinRate(returns) to modelSummaryService.js per FR-011 to FR-013
- [ ] T033 [US2] Implement generateModelSummary(modelName, trades) in modelSummaryService.js: orchestrates aggregation, checks tradeCount >= 3 per FR-014
- [ ] T034 [P] [US2] Create src/api/endpoints/trackedPrice.js: GET /trackedPrice endpoint handler
- [ ] T035 [US2] Implement cache read in trackedPrice.js: call loadTrackedPriceCache(), return {meta, trades, modelSummaries}
- [ ] T036 [US2] Add model summary recalculation logic to priceTracker.js: after saving trade, call generateModelSummary() for affected modelName
- [ ] T037 [P] [US2] Add route to src/index.js: GET /trackedPrice → trackedPrice.js handler

**Validation**:
- Integration test: POST 5 trades for MODEL-0, then GET /trackedPrice shows modelSummaries[0].tradeCount = 5
- Integration test: MODEL-0 with 10+ trades shows suggestedMaxCap and suggestedLowCap as non-null decimals
- Integration test: MODEL-1 with 2 trades shows suggestedMaxCap = null, suggestedLowCap = null per FR-014
- Unit test: calculateSuggestedCaps([0.01, 0.02, 0.03, 0.04, 0.05]) returns {maxCap: 0.018, lowCap: 0.0105} (20th/5th percentiles)
- Unit test: calculateAvgReturnAndWinRate([0.01, -0.02, 0.03]) returns {avgReturn: 0.0067, winRate: 0.667}

**Dependencies**: Phase 3 (US1: priceTracker.js must save trades to cache)

---

## Phase 5: User Story 3 - Batch Trade Recording (P3)

**Goal**: Support bulk trade input via single endpoint call

**Story**: US3 - Batch Trade Recording
**Priority**: P3
**Duration**: ~2-3 hours

**Independent Test Criteria**:
✅ POST /priceTracker with 10 tab-delimited trades processes all trades
✅ Each trade gets individual status in HTTP 207 results array
✅ Valid and invalid trades mixed: valid ones succeed (200), invalid ones fail (404/400)
✅ Empty request body returns HTTP 400 error
✅ Batch summary shows correct total, succeeded, failed counts

### Tasks

- [ ] T038 [P] [US3] Extend priceTracker.js validation: check for empty request body per FR-015
- [ ] T039 [US3] Add multi-line parsing to priceTracker.js: split by newline, parse each line as tab-delimited
- [ ] T040 [US3] Extend batch processing loop in priceTracker.js: handle partial failures, collect all per-trade statuses
- [ ] T041 [US3] Add error aggregation to priceTracker.js: errors array for invalid trades with index, message, code per contracts/priceTracker.openapi.yaml

**Validation**:
- Integration test: POST /priceTracker with 5 valid + 2 invalid trades returns HTTP 207 with summary {total:7, succeeded:5, failed:2}
- Integration test: results[0].status = 200, results[5].status = 404 for invalid ticker
- Integration test: Empty body returns HTTP 400 with error code EMPTY_REQUEST
- Load test: POST 50 trades completes within 20 seconds per SC-004

**Dependencies**: Phase 3 (US1: priceTracker.js batch processing foundation)

---

## Phase 6: RefreshAnalystLog Endpoint (Extending Existing Feature)

**Goal**: Add checkpoint-based fault tolerance to analyst log refresh

**Story**: Extends 001-financial-event-api's refreshAnalystLog endpoint
**Priority**: P2 (parallel to US2, independent work)
**Duration**: ~3-4 hours

**Independent Test Criteria**:
✅ POST /refreshAnalystLog processes 100 records and checkpoints to analystLog.json
✅ Checkpoint metadata includes lastProcessedId, totalRecords, checkpointBatchSize
✅ Resume logic: if interrupted at record 250, next run starts from 251
✅ Lock acquisition prevents concurrent refreshes

### Tasks

- [ ] T042 [P] Create src/services/analystCacheManager.js with checkpointBatch(records) function per research.md section 5
- [ ] T043 [P] Add getResumePoint() to analystCacheManager.js: reads lastProcessedId from analystLog.json
- [ ] T044 [P] Add fetchAnalystBatch(startId, batchSize) to analystCacheManager.js: wraps FMP API call
- [ ] T045 Extend existing src/api/endpoints/refreshAnalystLog.js: add checkpoint loop with 100-record batches
- [ ] T046 Add resume support to refreshAnalystLog.js: call getResumePoint() before starting refresh
- [ ] T047 Update response format in refreshAnalystLog.js per contracts/refreshAnalystLog.openapi.yaml: include meta{resumedFrom, checkpointCount}

**Validation**:
- Integration test: Start refresh, kill process after 250 records, restart → resumes from 251
- Integration test: analystLog.json meta.lastProcessedId = "analyst_250000" after checkpoint
- Unit test: checkpointBatch([{id: 'analyst_100'}, {id: 'analyst_101'}]) updates meta.totalRecords by 2
- Contract test: refreshAnalystLog response matches OpenAPI schema with checkpointCount field

**Dependencies**: Phase 2 (cacheManager.js foundation), independent of US1/US2/US3

---

## Phase 7: Testing & Validation

**Goal**: Ensure code quality, coverage, and contract compliance

**Duration**: ~4-6 hours

### Unit Tests

- [ ] T048 [P] Create tests/unit/percentile.test.js: edge cases (empty, single, even/odd arrays)
- [ ] T049 [P] Create tests/unit/tradingCalendar.test.js: weekend, holidays, 7-day search limit
- [ ] T050 [P] Create tests/unit/priceTrackerService.test.js: cap-aware return calculation for all branches (close, maxCap, lowCap)
- [ ] T051 [P] Create tests/unit/modelSummaryService.test.js: percentile calculations, < 3 trades null handling
- [ ] T052 [P] Extend tests/unit/cacheManager.test.js: mergeTradeRecord() progressive null-filling logic
- [ ] T053 [P] Extend tests/unit/dateUtils.test.js: calculateDPlusN() holiday handling

### Integration Tests

- [ ] T054 [P] Create tests/integration/priceTracker.integration.test.js: POST /priceTracker happy path, validation errors, batch processing
- [ ] T055 [P] Create tests/integration/trackedPrice.integration.test.js: GET /trackedPrice with varying trade counts per model
- [ ] T056 [P] Create tests/integration/refreshAnalystLog.integration.test.js: checkpoint and resume scenarios

### Contract Tests

- [ ] T057 [P] Extend tests/contract/fmpClient.contract.test.js: add historical OHLC API response fixtures to fixtures/fmpResponses.json
- [ ] T058 [P] Add Nock mocks for FMP historical price API to fmpClient.contract.test.js
- [ ] T059 Validate all endpoints against OpenAPI contracts using jest-openapi matcher

**Validation**:
- `npm test` shows >= 70% overall coverage per SC-007
- Critical paths (cap-aware returns, percentiles, trading calendar) >= 90% coverage per SC-008
- All contract tests pass with recorded FMP API fixtures

**Dependencies**: Phases 3-6 (requires endpoints to be implemented)

---

## Phase 8: Polish & Documentation

**Goal**: Finalize error handling, logging, and user documentation

**Duration**: ~2-3 hours

### Tasks

- [ ] T060 [P] Add structured logging to priceTracker.js: log lock acquisition time, batch size, errors per FR-024 and Principle IV
- [ ] T061 [P] Add structured logging to trackedPrice.js: log cache size, model count
- [ ] T062 [P] Add structured logging to refreshAnalystLog.js: log checkpoint progress every 1000 records
- [ ] T063 [P] Update src/api/middleware/errorHandler.js: add error codes TICKER_NOT_FOUND, INVALID_DATE, EMPTY_REQUEST per OpenAPI contracts
- [ ] T064 [P] Add meta.missingDates tracking to priceTrackerService.js when getNextTradingDay() returns null per FR-021
- [ ] T065 [P] Add meta.dataAvailableUntil tracking to priceTrackerService.js when D+14 data incomplete per FR-020
- [ ] T066 Update README.md with priceTracker endpoint examples (curl commands for single and batch trades)
- [ ] T067 Update CLAUDE.md via update-agent-context.sh script (already completed in Phase 1 of /speckit.plan)

**Validation**:
- Logs include ISO 8601 timestamps, request IDs, and structured JSON format per Principle IV
- Error responses match OpenAPI contract error schemas
- README examples work as copy-paste commands

**Dependencies**: Phase 7 (testing complete)

---

## Implementation Strategy

### MVP Scope (Phases 1-3)

**Deliverable**: Individual trade tracking with cap-aware returns
**Duration**: ~10-13 hours
**User Stories**: US1 only
**Endpoints**: POST /priceTracker (single trades only)

**MVP Exit Criteria**:
✅ User can track a single trade's performance over 14 days
✅ Long and short positions calculate returns correctly
✅ Cap-aware logic (maxCap/lowCap) works per research.md section 6
✅ Holiday handling uses next trading day
✅ Integration tests pass for US1

### Full Feature Scope (All Phases)

**Deliverable**: Complete price tracker with model summaries and batch input
**Duration**: ~20-28 hours
**User Stories**: US1, US2, US3, + refreshAnalystLog extension
**Endpoints**: POST /priceTracker (batch), GET /trackedPrice, POST /refreshAnalystLog (checkpoints)

---

## Parallel Execution Opportunities

### Phase 2 (Foundational Utilities)
**Parallel Group A** (6 tasks can run simultaneously):
- T006 (percentile.js), T007 (tradingCalendar.js), T009 (dateUtils.js), T010 (schemas.js), T011 (types.js)

**Sequential**: T012 (fmpClient.js) → T013-T015 (cacheManager.js)

### Phase 3 (US1)
**Parallel Group A** (2 tasks):
- T016 (fetchCurrentPrice), T017 (fetchPriceHistoryForTrade)

**Sequential**: T018 (calculateCapAwareReturn) → T019 (calculateReturnsArray) → T020 (createTradeRecord)

**Parallel Group B** (3 tasks after T020):
- T021 (priceTracker.js endpoint), T027 (index.js route), T028 (errorHandler.js)

**Sequential**: T022-T026 (priceTracker.js logic - must be sequential)

### Phase 4 (US2)
**Parallel Group A** (2 tasks):
- T029 (aggregateModelReturns), T030 (calculateOptimalHoldingDays)

**Sequential**: T031-T033 (modelSummaryService.js calculations)

**Parallel Group B** (2 tasks after T035):
- T034 (trackedPrice.js), T037 (index.js route)

### Phase 6 (RefreshAnalystLog)
**All tasks parallelizable with US2** (T042-T047 can run while Phase 4 executes)

### Phase 7 (Testing)
**Parallel Group A** (all 12 test tasks can run simultaneously):
- T048-T059 (unit, integration, contract tests)

### Phase 8 (Polish)
**Parallel Group A** (all 6 logging/docs tasks can run simultaneously):
- T060-T065 (logging, error handling, docs)

**Total Parallelizable Tasks**: 24 out of 67 tasks (36%)

---

## Dependency Graph

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational Utilities)
       ├─→ Phase 3 (US1: Individual Trade Tracking) ──┐
       │    └─→ Phase 4 (US2: Model Summaries) ──┐    │
       │         └─→ Phase 5 (US3: Batch Input)   │    │
       │                                           │    │
       └─→ Phase 6 (RefreshAnalystLog) ───────────┤    │
                                                   │    │
                                                   ▼    ▼
                                            Phase 7 (Testing)
                                                   │
                                                   ▼
                                            Phase 8 (Polish)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 7 → Phase 8
**Parallelizable**: Phase 6 can run alongside Phase 4

---

## Risk Mitigation

### High-Risk Tasks

1. **T018: Cap-Aware Return Calculation**
   - **Risk**: Complex logic with position-specific branching
   - **Mitigation**: Start with unit tests covering all 6 branches (long: close/maxCap/lowCap, short: close/maxCap/lowCap)

2. **T013: File Locking Implementation**
   - **Risk**: Race conditions if lock not properly released
   - **Mitigation**: Use try-finally blocks per research.md section 1, test concurrent writes

3. **T024: Batch Processing Loop**
   - **Risk**: Memory issues with 50+ trades in single request
   - **Mitigation**: Process trades sequentially, not parallel; stream results

4. **T045: Checkpoint Loop for 600k Records**
   - **Risk**: Long-running process (2.5 hours) may time out on Render.com
   - **Mitigation**: Verify Render plan supports long processes; test resume logic thoroughly

### Testing Priorities (90% Coverage Required)

Per SC-008, these modules require 90% coverage:
1. src/services/priceTrackerService.js (T018-T020, T050)
2. src/lib/percentile.js (T006, T048)
3. src/lib/tradingCalendar.js (T007-T008, T049)
4. src/lib/dateUtils.js (T009, T053)

---

## Task Checklist Status

**Total**: 67 tasks
**Completed**: 0
**In Progress**: 0
**Blocked**: 0

---

## Notes

- **File Locking**: All cache writes must use proper-lockfile per research.md section 1
- **Trading Calendar**: Update NYSE holidays annually in lib/tradingCalendar.js per research.md section 4
- **HTTP 207**: Always return 207 for batch operations even if all trades fail per research.md section 2
- **Cap Percentiles**: maxCap=20th percentile, lowCap=5th percentile per data-model.md VR-017/VR-018
- **Progressive Filling**: mergeTradeRecord() preserves non-null values per data-model.md VR-023

---

**Generated by**: `/speckit.tasks` command
**Last Updated**: 2025-11-28
**Spec Version**: 1.0.0
