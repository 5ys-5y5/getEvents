# getEvents Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-25

## Active Technologies
- Node.js 18.x+ + Express.js, axios + axios-retry, date-fns-tz, Jest + Nock (001-financial-event-api)
- File-based JSON (docs/*.json) for caches (symbolCache, eventCache), no database required (001-financial-event-api)
- Node.js 18.x+ + Express.js 5.1.0, axios 1.13.2 + axios-retry 4.5.0, date-fns 4.1.0 + date-fns-tz 3.2.0, proper-lockfile (new), Jest 30.2.0 + Nock 14.0.10 (002-price-tracker)
- File-based JSON (docs/trackedPriceCache.json, docs/analystLog.json) with backup strategy (002-price-tracker)

- (001-financial-event-api)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 002-price-tracker: Added Node.js 18.x+ + Express.js 5.1.0, axios 1.13.2 + axios-retry 4.5.0, date-fns 4.1.0 + date-fns-tz 3.2.0, proper-lockfile (new), Jest 30.2.0 + Nock 14.0.10
- 001-financial-event-api: Added Node.js 18.x+ + Express.js, axios + axios-retry, date-fns-tz, Jest + Nock

- 001-financial-event-api: Added

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
