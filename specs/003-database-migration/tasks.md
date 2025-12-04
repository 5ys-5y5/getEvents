# Implementation Tasks: Database Migration

**Feature**: 003-database-migration
**Branch**: `003-database-migration`
**Total Estimated Tasks**: 45

---

## Task Summary

| Phase | User Story | Task Count | Can Run in Parallel |
|-------|------------|------------|---------------------|
| Setup | N/A | 5 | Yes (T002-T005) |
| Foundational | N/A | 3 | Yes (T007-T008) |
| US5 | Data Migration Script | 8 | Partial |
| US1 | Symbol Cache DB | 6 | Partial |
| US2 | Event Cache DB | 5 | Partial |
| US3 | Trade Data DB | 7 | Partial |
| US4 | Analyst Log DB | 6 | Partial |
| Polish | Cross-cutting | 5 | Yes |

---

## Phase 1: Setup

**Goal**: Initialize Supabase project and install dependencies

### Tasks

- [ ] T001 Create Supabase project at https://supabase.com and save credentials to .env file
- [ ] T002 [P] Install @supabase/supabase-js dependency: npm install @supabase/supabase-js
- [ ] T003 [P] Create src/config/supabase.js with Supabase client initialization
- [ ] T004 [P] Create migrations/ directory and migrations/001_create_tables.sql from contracts/database-schema.sql
- [ ] T005 [P] Add migration npm scripts to package.json (migrate:create-tables, migrate:files-to-db, migrate:verify)

---

## Phase 2: Foundational

**Goal**: Set up database schema and core infrastructure (MUST complete before user stories)

### Tasks

- [ ] T006 Run migration script to create all database tables in Supabase (npm run migrate:create-tables)
- [ ] T007 [P] Create src/services/dbManager.js with exports for all cache operations (loadSymbolCache, saveSymbolCache, loadEventCache, saveEventCache, loadTrackedPriceCache, saveTrackedPriceCache, loadAnalystLog, saveAnalystLog, mergeTradeRecord)
- [ ] T008 [P] Refactor src/services/cacheManager.js to src/services/fileManager.js (rename current file-based logic)

---

## Phase 3: US5 - Data Migration Script

**User Story**: As a developer, I want to migrate existing JSON files to DB so that I can transition without downtime

**Test Criteria**: Migration script successfully transfers all 4 cache files to database with data integrity verification

### Tasks

- [ ] T009 [US5] Create scripts/migrate-files-to-db.js with main migration function structure
- [ ] T010 [P] [US5] Implement migrateSymbolCache() function in scripts/migrate-files-to-db.js (batch upsert 1000 rows at a time)
- [ ] T011 [P] [US5] Implement migrateEventCache() function in scripts/migrate-files-to-db.js
- [ ] T012 [P] [US5] Implement migrateTrackedPriceCache() function in scripts/migrate-files-to-db.js (trades + model_summaries)
- [ ] T013 [P] [US5] Implement migrateAnalystLog() function in scripts/migrate-files-to-db.js (batch upsert)
- [ ] T014 [US5] Add progress logging and error handling with rollback capability to scripts/migrate-files-to-db.js
- [ ] T015 [US5] Create scripts/verify-migration.js to compare file data vs DB data counts and spot-check records
- [ ] T016 [US5] Create automatic backup script (copy docs/*.json to docs/*.json.backup) before migration

---

## Phase 4: US1 - Symbol Cache DB Integration

**User Story**: As an API user, I want symbolCache from DB so that ticker validation is fast (< 10ms)

**Test Criteria**: GET /getEvent and /getValuation endpoints work with DB-backed symbol cache, ticker lookups < 10ms

### Tasks

- [ ] T017 [P] [US1] Implement loadSymbolCache() in src/services/dbManager.js (SELECT from symbol_cache with array mapping)
- [ ] T018 [P] [US1] Implement saveSymbolCache() in src/services/dbManager.js (batch upsert to symbol_cache)
- [ ] T019 [US1] Update src/services/cacheManager.js to add feature flag adapter: if (USE_DATABASE) call dbManager else call fileManager
- [ ] T020 [US1] Add USE_DATABASE=false to .env file as default
- [ ] T021 [US1] Test symbol cache operations: set USE_DATABASE=true and verify /getEvent and /getValuation endpoints return same results
- [ ] T022 [US1] Create tests/unit/dbManager.test.js with tests for loadSymbolCache and saveSymbolCache functions

---

## Phase 5: US2 - Event Cache DB Integration

**User Story**: As an API user, I want getEvent results in DB so that cached events return without file I/O (< 50ms)

**Test Criteria**: GET /getEventLatest returns cached data from DB in < 50ms with identical JSON format

### Tasks

- [ ] T023 [P] [US2] Implement loadEventCache() in src/services/dbManager.js (SELECT latest by created_at DESC LIMIT 1)
- [ ] T024 [P] [US2] Implement saveEventCache() in src/services/dbManager.js (upsert with unique constraint on start_date, end_date)
- [ ] T025 [US2] Update src/api/endpoints/getEvent.js to call saveEventCache after fetching events (only if USE_DATABASE=true)
- [ ] T026 [US2] Update src/api/endpoints/getEventLatest.js to call loadEventCache from cacheManager adapter
- [ ] T027 [US2] Create tests/integration/db-endpoints.test.js with test for GET /getEventLatest with USE_DATABASE=true

---

## Phase 6: US3 - Trade Data DB Integration

**User Story**: As a trading model developer, I want trade data in DB so that concurrent writes do not conflict

**Test Criteria**: POST /priceTracker batch 100 trades completes in < 5s without file locking, GET /trackedPrice returns combined data

### Tasks

- [ ] T028 [P] [US3] Implement loadTrackedPriceCache() in src/services/dbManager.js (parallel SELECT from trades and model_summaries)
- [ ] T029 [P] [US3] Implement saveTrackedPriceCache() in src/services/dbManager.js (batch upsert for trades and model_summaries)
- [ ] T030 [P] [US3] Implement mergeTradeRecord() in src/services/dbManager.js (single trade upsert with conflict resolution)
- [ ] T031 [US3] Update src/api/endpoints/priceTracker.js to remove proper-lockfile usage and use cacheManager adapter
- [ ] T032 [US3] Update src/api/endpoints/trackedPrice.js to use cacheManager adapter for loading data
- [ ] T033 [US3] Remove proper-lockfile from package.json dependencies
- [ ] T034 [US3] Create tests/benchmark/db-performance.test.js to compare file vs DB performance for 100 trade batch

---

## Phase 7: US4 - Analyst Log DB Integration

**User Story**: As a system admin, I want analystLog in DB so that I can query specific tickers without loading 42MB file

**Test Criteria**: GET /generateRating with 10 tickers queries only those tickers from DB (< 100ms total)

### Tasks

- [ ] T035 [P] [US4] Implement loadAnalystLog(tickers) in src/services/dbManager.js (SELECT with IN clause for filtered query)
- [ ] T036 [P] [US4] Implement saveAnalystLog() in src/services/dbManager.js (batch upsert to analyst_log)
- [ ] T037 [US4] Update src/api/endpoints/refreshAnalystLog.js to use cacheManager adapter for saving
- [ ] T038 [US4] Update src/api/endpoints/generateRating.js to pass ticker list to loadAnalystLog for filtered query
- [ ] T039 [US4] Test filtered query performance: measure loadAnalystLog(['AAPL', 'MSFT', ...]) with 10 tickers (should be < 100ms)
- [ ] T040 [US4] Add tests to tests/unit/dbManager.test.js for loadAnalystLog with ticker filtering

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Production readiness, monitoring, and deployment

### Tasks

- [ ] T041 [P] Create scripts/check-db-usage.js to monitor Supabase storage usage and alert at 90%
- [ ] T042 [P] Add database query logging to src/services/dbManager.js (log query params, execution time, row counts)
- [ ] T043 [P] Create docs/*.json.backup files before first production migration
- [ ] T044 Add environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, USE_DATABASE) to Render.com dashboard
- [ ] T045 Update README.md with migration instructions and feature flag usage

---

## Dependencies

### Story Completion Order

```
Setup (Phase 1)
  ↓
Foundational (Phase 2)
  ↓
US5 (Migration Script) ← MUST complete before testing other stories
  ↓
US1 (Symbol Cache) ← Can run in parallel with US2, US3, US4
US2 (Event Cache)  ← Can run in parallel with US1, US3, US4
US3 (Trade Data)   ← Can run in parallel with US1, US2, US4
US4 (Analyst Log)  ← Can run in parallel with US1, US2, US3
  ↓
Polish (Phase 8)
```

### Critical Path

1. Setup → Foundational → US5 migration script (required for data)
2. After US5: All user stories (US1-US4) can be implemented independently
3. Polish phase can start as soon as any user story is complete

---

## Parallel Execution Examples

### Phase 1 (Setup)
- Run T002, T003, T004, T005 in parallel (independent files)

### Phase 2 (Foundational)
- Run T007 and T008 in parallel (different files)

### Phase 3 (US5)
- Run T010, T011, T012, T013 in parallel (different migration functions)

### Phase 4-7 (User Stories)
- After US5 completes: Implement US1, US2, US3, US4 in parallel (independent stories)
- Within each story: Run [P] marked tasks in parallel

### Phase 8 (Polish)
- Run T041, T042, T043 in parallel (independent scripts)

---

## Implementation Strategy

### MVP Scope (Week 1)
- **Phase 1-2**: Setup + Foundational
- **Phase 3**: US5 (Migration Script)
- **Phase 4**: US1 (Symbol Cache) - Validates E2E flow

### Incremental Delivery (Week 2-3)
- **Phase 5**: US2 (Event Cache)
- **Phase 6**: US3 (Trade Data)
- **Phase 7**: US4 (Analyst Log)

### Production Release (Week 4)
- **Phase 8**: Polish, monitoring, deployment
- Gradual rollout: USE_DATABASE=false → true after validation

---

## Validation Checklist

After each user story phase, verify:

- [ ] All endpoints return identical JSON response format (backward compatible)
- [ ] Performance targets met (symbolCache < 10ms, eventCache < 50ms, etc.)
- [ ] Feature flag (USE_DATABASE) works correctly (can switch between file and DB)
- [ ] Database queries logged with sufficient debugging context
- [ ] Unit tests pass for new dbManager functions
- [ ] Integration tests pass with USE_DATABASE=true

---

## Rollback Plan

If database migration fails:

1. Set USE_DATABASE=false in environment variables
2. Redeploy application (reverts to file-based cache)
3. Restore docs/*.json.backup files if corrupted
4. Investigate database connection/performance issues
5. Fix and retry migration

**Total Tasks**: 45
**Parallel Opportunities**: 18 tasks marked [P]
**Estimated Duration**: 3-4 weeks (including testing and deployment)
