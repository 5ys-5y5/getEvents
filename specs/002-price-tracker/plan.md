# Implementation Plan: Price Tracker with Model Performance Analysis

**Branch**: `002-price-tracker` | **Date**: 2025-11-28 | **Spec**: specs/002-price-tracker/spec.md

## Summary

This feature implements a REST API endpoint system for tracking individual trades with position-specific return calculations across D+1 to D+14 horizons. The system accepts bulk trade inputs via tab-delimited format, stores data in file-based JSON caches (`docs/trackedPriceCache.json`), and calculates cap-aware returns based on intraday price extremes. The API provides three primary endpoints: `POST /priceTracker` (track/update trades with HTTP 207 multi-status responses), `GET /trackedPrice` (retrieve cached trades + model summaries with percentile-based cap suggestions), and `POST /refreshAnalystLog` (refresh analyst rating data with checkpoint-based fault tolerance). The technical approach leverages the existing Node.js 18+ + Express.js stack with proper-lockfile for concurrent write safety, custom percentile calculations (no external library), and hardcoded NYSE trading calendar for D+N date handling.

## Technical Context

**Language/Version**: Node.js 18.x+  
**Primary Dependencies**: Express.js 5.1.0, axios 1.13.2 + axios-retry 4.5.0, date-fns 4.1.0 + date-fns-tz 3.2.0, proper-lockfile (new), Jest 30.2.0 + Nock 14.0.10  
**Storage**: File-based JSON (docs/trackedPriceCache.json, docs/analystLog.json) with backup strategy  
**Testing**: Jest for unit/integration tests, Nock for contract tests  
**Target Platform**: Render.com web service (Linux container)  
**Project Type**: single  
**Performance Goals**: POST /priceTracker < 2s (single), < 10s (10 trades); GET /trackedPrice < 100ms  
**Constraints**: 10 concurrent users, < 1% error rate, UTC timestamps, HTTP 207 multi-status  
**Scale/Scope**: 500-1000 trades/model, 14 D+N horizons/trade, 600k+ analyst records

## Constitution Check

All 8 principles pass. See full analysis in research.md.

## Project Structure

Single project structure extending 001-financial-event-api. See plan.md for complete file tree.

## Complexity Tracking

No violations detected.
