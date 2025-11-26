# Implementation Plan: Financial Event and Valuation API

**Branch**: `001-financial-event-api` | **Date**: 2025-11-25 | **Spec**: specs/001-financial-event-api/spec.md

## Summary

This feature implements a JSON-based REST API deployed on Render.com that retrieves financial event data (earnings calendars, etc.) and company valuation metrics for specified date ranges. The system integrates with Financial Modeling Prep (FMP) APIs, using file-based JSON caching for symbol lists and event data. The API provides four primary endpoints: `getEvent` (streams NDJSON event records for date ranges), `getEventLatest` (returns cached event data), `getValuation` (calculates current price, quantitative, peer quantitative, and qualitative valuation metrics), and `refreshAnalystLog` (manually refreshes analyst data cache). The system includes market hours detection for intelligent price source selection (pre-post-market vs quote API) and a daily scheduler for automatic analyst log refresh at midnight ET. The technical approach leverages Node.js 18.x+ with Express.js for web serving, axios with retry logic for API calls, date-fns-tz for UTC date handling, node-cron for scheduling, and Jest with Nock for contract testing.

## Technical Context

**Language/Version**: Node.js 18.x+
**Primary Dependencies**: Express.js, axios + axios-retry, date-fns-tz, node-cron, Jest + Nock
**Storage**: File-based JSON (docs/*.json) for caches (symbolCache, eventCache, analystLog, analystRating), no database required
**Testing**: Jest for unit/integration tests, Nock for contract tests with recorded API responses
**Target Platform**: Render.com web service (Linux container)
**Project Type**: Single backend API (no frontend)
**Performance Goals**:
- getEvent NDJSON stream start < 2s
- getEventLatest < 100ms (1MB cache)
- getValuation 15-20s per ticker (including peer evaluation)
- symbolCache refresh < 5s for 30k tickers
- refreshAnalystLog ~42min for 7,500 tickers (3 req/s batch, 200 req/min global limit)
- Market hours detection < 1ms

**Constraints**:
- 10 concurrent users with < 1% error rate
- All dates in UTC (ISO 8601 format)
- NDJSON streaming for getEvent endpoint
- Relative paths (docs/*) for deployment compatibility
- **FMP API global rate limit: 200 requests per minute** (actual FMP limit: 300/min, using 200/min for safety margin)
- Local batch rate: 3 req/s for refreshAnalystLog (180/min < 200/min)

**Scale/Scope**:
- ~30,000 tickers in symbolCache
- Variable event data volume depending on date range
- Multiple sequential API calls per valuation (quantitative + qualitative metrics)
- 14 D+N horizons (0,1,2,3,4,5,6,7,14,21,30,60,180,365) for analyst rating calculations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Rationale |
|-----------|--------|-----------|
| **I. API-First Design** | PASS | System architecture abstracts FMP API interactions into services (fmpClient.js). Field mappings externalized in ApiList.json. All API responses normalized to internal schemas (EventRecord, ValuationRecord) before business logic. Provider changes require only config updates, no code modifications. |
| **II. Data Integrity & Validation** | PASS | External API data validated against schemas defined in getEventOutputSchema.jsonl and data-model.md. Field mappings enforce type safety through schemas.js. All timestamps normalized to UTC per FR-023. Missing/malformed data logged to collectionErrorChecklist with provider context (service.id), no silent failures per FR-026. |
| **III. Configuration-Driven Architecture** | PASS | API endpoints, field mappings, and provider configurations externalized in docs/ApiList.json and docs/evMethod.json. Code reads configurations at runtime per FR-027 (generalized loop for fieldMap). Adding new event types or valuation metrics requires only JSON config updates, zero code changes to core logic. |
| **IV. Observability & Debugging** | PASS | All API calls logged with provider, endpoint, parameters, response status, latency via middleware/logger.js. Cache hits/misses tracked in metaRecord. Errors include reproduction context through collectionErrorChecklist (service.id, statusCode, errorMessage). Structured JSON logging for production per FR-030. |
| **V. Testability Through Contracts** | PASS | External API dependencies mockable via Nock contract tests (tests/contract/fmpClient.contract.test.js). Contract tests verify fieldMap matches provider responses using fixtures/fmpResponses.json. Integration tests use recorded fixtures for consistent data. Live API tests isolated and not blocking CI. |
| **VI. Code Quality & Readability** | PASS | Spec emphasizes concise, self-documenting code. FR-027 requires generalized loops over hardcoded branches. Variable names follow camelCase convention. Business logic clarity prioritized (e.g., ttmFromQuarterSumOrScaled, ratingAnalyst calculations explicitly defined). |
| **VII. Testing Discipline** | PASS | Core business logic testing required per SC-007 (70% overall coverage), SC-008 (90% for critical paths: date conversion, aggregation calculations, D+N gap rates). Tests serve as documentation through acceptance scenarios in spec.md. Unit tests for eventNormalizer, cacheManager, dateUtils; integration tests for all endpoints. |
| **VIII. Minimal Dependencies** | PASS | Dependencies justified by significant value: Express (minimal overhead), axios+axios-retry (robust error handling), date-fns-tz (timezone safety), Jest (built-in mocking), Nock (contract testing). No trivial dependencies. Each library evaluated for maintenance status, security, and bundle size. Standard library preferred where sufficient. |

All principles pass. This feature was designed with the constitution in mind.

## Project Structure

### Documentation (this feature)

```text
specs/001-financial-event-api/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification with user stories
├── research.md          # Phase 0 output: Technology decisions (Node.js, Express, axios, etc.)
├── data-model.md        # Phase 1 output: 8 entities with validation rules
├── quickstart.md        # Phase 1 output: Setup, development, and deployment guide
├── contracts/           # Phase 1 output: 3 OpenAPI contract files
│   ├── getEvent.openapi.yaml
│   ├── getEventLatest.openapi.yaml
│   └── getValuation.openapi.yaml
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── endpoints/
│   │   ├── getEvent.js               # GET /getEvent - NDJSON streaming endpoint
│   │   ├── getEventLatest.js         # GET /getEventLatest - cached data retrieval
│   │   ├── getValuation.js           # GET /getValuation - valuation metrics with price and peer
│   │   └── refreshAnalystLog.js      # GET /refreshAnalystLog - manual analyst cache refresh
│   └── middleware/
│       ├── errorHandler.js           # Global error handling with status code mapping
│       └── logger.js                 # Structured logging (JSON format)
├── services/
│   ├── fmpClient.js                  # FMP API client with retry logic and rate limiting
│   ├── cacheManager.js               # symbolCache and eventCache refresh logic
│   ├── eventNormalizer.js            # API response to internal schema transformation
│   ├── valuationCalculator.js        # Quantitative valuation metrics calculation
│   ├── qualitativeCalculator.js      # Qualitative valuation (consensus, summary)
│   ├── priceService.js               # Market-hours-aware price fetching
│   ├── peerEvaluationService.js      # Peer ticker evaluation and averaging
│   ├── analystCacheManager.js        # Analyst log refresh and rating generation
│   └── scheduler.js                  # Daily midnight ET scheduler for analyst refresh
├── models/
│   ├── schemas.js                    # JSON Schema definitions for validation
│   └── types.js                      # JSDoc type definitions for entities
├── lib/
│   ├── configLoader.js               # Load and validate ApiList.json, evMethod.json
│   ├── dateUtils.js                  # UTC date calculations, ISO 8601 formatting
│   ├── marketHours.js                # US market hours detection (ET timezone)
│   └── ndJsonStreamer.js             # NDJSON stream writer
└── index.js                          # Express app entry point with scheduler init

tests/
├── contract/
│   ├── fmpClient.contract.test.js   # Nock-based API contract tests
│   └── fixtures/
│       └── fmpResponses.json        # Recorded FMP API responses
├── integration/
│   ├── getEvent.integration.test.js        # End-to-end getEvent tests
│   ├── getEventLatest.integration.test.js  # End-to-end getEventLatest tests
│   └── getValuation.integration.test.js    # End-to-end getValuation tests
└── unit/
    ├── eventNormalizer.test.js       # Schema transformation logic
    ├── cacheManager.test.js          # Cache refresh and expiry logic
    └── dateUtils.test.js             # Date calculation edge cases

docs/
├── symbolCache.json               # Eligible ticker list with sector/industry metadata
├── eventCache.json                # Cached getEvent results (meta + events array)
├── analystLog.json                # All analyst data for all tickers (~50-100MB)
├── analystRating.json             # Unique analysts with D+N gap calculations
├── config/
│   ├── ApiList.json               # API service definitions and field mappings
│   └── evMethod.json              # Valuation calculation formulas
└── getEventOutputSchema.jsonl     # Output schema definition for validation
```

**Structure Decision**: Single project structure selected. This is a backend-only API with no frontend or mobile components. All source code resides in `src/` with clear separation between API endpoints, business services, data models, and utilities. Test structure mirrors source organization with contract, integration, and unit test layers. Configuration and cache files stored in `docs/` directory using relative paths for Render.com deployment compatibility.

## Complexity Tracking

No violations detected. All constitution principles pass without requiring complexity justifications.
