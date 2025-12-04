# Implementation Plan: Database Migration from File-Based Cache to Supabase PostgreSQL

**Branch**: `003-database-migration` | **Date**: 2025-11-30 | **Spec**: specs/003-database-migration/spec.md

## Summary

This feature migrates the existing file-based JSON cache system (`docs/*.json`) to Supabase PostgreSQL database to eliminate concurrency issues, improve query performance, and ensure data integrity. The migration covers four primary cache files: `symbolCache.json`, `getEventCache.json`, `trackedPriceCache.json`, and `analystLog.json`. The technical approach uses Supabase's managed PostgreSQL with JSONB columns for seamless data structure preservation, @supabase/supabase-js client for database operations, and a feature flag strategy for gradual rollout.

## Technical Context

**Language/Version**: Node.js 18.x+ (matches existing project)  
**Primary Dependencies**: @supabase/supabase-js ^2.39.0, Express.js 5.1.0 (existing), dotenv ^16.3.1  
**Storage**: Supabase PostgreSQL 14+ (500MB free tier), JSONB columns for JSON data  
**Testing**: Jest 30.2.0 + Nock 14.0.10 (existing), Supertest for integration tests  
**Target Platform**: Render.com web service with Supabase cloud database  
**Project Type**: Single backend API  
**Performance Goals**: symbolCache < 10ms, getEventLatest < 50ms, priceTracker batch 100 < 5s  
**Constraints**: Supabase 500MB free tier, 15 connections max, zero API breaking changes  
**Scale/Scope**: ~30k symbols, ~42MB analyst data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Rationale |
|-----------|--------|-----------|
| **I. API-First Design** | PASS | Database operations abstracted into dbManager.js service layer. |
| **II. Data Integrity & Validation** | PASS | PostgreSQL JSONB validation and CHECK constraints enforce rules. |
| **III. Configuration-Driven Architecture** | PASS | Supabase credentials in env vars, feature flag for rollout. |
| **IV. Observability & Debugging** | PASS | Database queries logged with parameters and execution time. |
| **V. Testability Through Contracts** | PASS | Database layer mockable, integration tests use test database. |
| **VI. Code Quality & Readability** | PASS | dbManager mirrors cacheManager naming, uses Supabase fluent API. |
| **VII. Testing Discipline** | PASS | Unit tests (80% target), integration tests, performance benchmarks. |
| **VIII. Minimal Dependencies** | PASS | Only @supabase/supabase-js added, proper-lockfile removed. |

**Result**: ✅ PASS

## Project Structure

See research.md, data-model.md, and quickstart.md for detailed implementation guidance.

## Complexity Tracking

No violations detected.
