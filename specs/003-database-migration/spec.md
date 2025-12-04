# Feature Specification: Database Migration from File-Based Cache to Supabase PostgreSQL

**Feature ID**: 003-database-migration
**Status**: ✅ **COMPLETED AND DEPLOYED**
**Created**: 2025-11-30
**Last Updated**: 2025-12-02
**Completion Date**: 2025-12-02

**Migration Summary**:
- ✅ All 4 cache files migrated to Supabase PostgreSQL
- ✅ Pagination implemented for 1000+ row queries
- ✅ API endpoints updated to use DB instead of file system
- ✅ File-based locking removed (replaced with ACID transactions)
- ✅ Production deployment confirmed on Render.com

---

## Overview

### Problem Statement

현재 시스템은 파일 기반 JSON 캐시(`docs/*.json`)를 사용하여 데이터를 저장하고 관리합니다. 이 접근 방식은 다음과 같은 문제점이 있습니다:

1. **동시성 문제**: 여러 요청이 동시에 캐시를 수정할 때 proper-lockfile을 사용한 파일 잠금이 필요하며, 이는 성능 병목과 복잡성을 야기합니다.
2. **쿼리 성능**: 특정 ticker, modelName, date 등으로 데이터를 조회할 때 전체 JSON 파일을 읽고 파싱해야 합니다.
3. **데이터 무결성**: 파일 시스템 오류 시 백업 메커니즘에 의존해야 하며, 트랜잭션 지원이 없습니다.
4. **확장성**: 데이터 증가 시 파일 크기가 커지며, 메모리 사용량과 처리 시간이 선형적으로 증가합니다.
5. **백업 및 복구**: 수동 백업에 의존하며, 자동화된 백업 및 Point-in-Time Recovery가 없습니다.

### Solution

Supabase PostgreSQL 데이터베이스로 마이그레이션하여 위 문제를 해결합니다:

- **동시성**: PostgreSQL의 ACID 트랜잭션으로 파일 잠금 불필요
- **쿼리 성능**: 인덱스를 통한 빠른 조회 (O(1) vs O(n))
- **데이터 무결성**: 트랜잭션 보장 및 제약 조건
- **확장성**: 테이블 파티셔닝 및 쿼리 최적화
- **백업**: Supabase 자동 백업 및 PITR

---

## Goals and Non-Goals

### Goals

1. **데이터베이스 마이그레이션**: 4개 주요 캐시 파일을 Supabase PostgreSQL 테이블로 변환
   - `symbolCache.json` → `symbol_cache` 테이블
   - `getEventCache.json` → `event_cache` 테이블
   - `trackedPriceCache.json` → `tracked_price_cache` 테이블
   - `analystLog.json` → `analyst_log` 테이블

2. **API 호환성 유지**: 기존 엔드포인트 응답 형식 변경 없음
   - GET /getEvent
   - GET /getEventLatest
   - GET /getValuation
   - POST /priceTracker
   - GET /trackedPrice
   - GET /refreshAnalystLog
   - GET /generateRating

3. **성능 개선**: 쿼리 기반 조회로 응답 시간 단축
   - ticker/modelName/date 기준 조회 시 전체 파일 읽기 불필요
   - 인덱스를 통한 빠른 검색

4. **동시성 향상**: 파일 잠금 제거 및 트랜잭션 기반 처리

5. **배포 호환성**: Render.com 환경에서 Supabase 연동

### Non-Goals (Updated)

1. **스키마 정규화**: ✅ JSONB 타입으로 구현 완료 (향후 최적화 가능)
2. ~~**프론트엔드 변경**: 백엔드 API만 변경, UI 없음~~ → **CHANGED**: Dashboard, Control Panel, Tracker UI 추가 구현됨
3. **실시간 기능**: ✅ Supabase Realtime 기능 사용하지 않음 (확인됨)
4. **인증 시스템**: ✅ Supabase Auth 미사용, API key 기반 인증 사용 (확인됨)
5. **기존 파일 삭제**: ✅ docs/*.json 파일 백업용 유지 (확인됨)

---

## User Stories

### US1: 심볼 캐시 DB 조회 ✅ COMPLETED

**As a** API 사용자
**I want** symbolCache 데이터를 DB에서 조회
**So that** 파일 읽기 없이 빠르게 ticker 유효성을 검증할 수 있다

**Acceptance Criteria**:
- ✅ AC1: `symbol_cache` 테이블에서 ticker 존재 여부 확인 (< 10ms) - **VERIFIED** in priceTracker.js:110
- ✅ AC2: sector, industry 메타데이터 조회 가능 - **IMPLEMENTED** in dbManager.js:17-46
- ✅ AC3: 기존 `/getEvent`, `/getValuation` 엔드포인트 정상 동작 - **VERIFIED**
- ✅ AC4: symbolCache 갱신 시 DB에 upsert - **IMPLEMENTED** in dbManager.js:147-165

**Implementation Location**: `src/services/dbManager.js:17-165`

### US2: 이벤트 캐시 DB 저장 및 조회 ✅ COMPLETED

**As a** API 사용자
**I want** getEvent 결과를 DB에 저장하고 조회
**So that** 파일 I/O 없이 캐시된 이벤트를 즉시 반환할 수 있다

**Acceptance Criteria**:
- ✅ AC1: `GET /getEvent` 호출 시 결과를 `event_cache` 테이블에 저장 - **IMPLEMENTED** in dbManager.js:193-211
- ✅ AC2: `GET /getEventLatest` 호출 시 DB에서 최신 캐시 조회 (< 100ms) - **IMPLEMENTED** in dbManager.js:168-191
- ✅ AC3: meta 정보 (startDate, endDate, timestamp) 함께 저장 - **VERIFIED**
- ✅ AC4: 기존 JSON 응답 형식 유지 - **VERIFIED**

**Implementation Location**: `src/services/dbManager.js:168-211`

### US3: 거래 추적 데이터 DB 관리 ✅ COMPLETED

**As a** 트레이딩 모델 개발자
**I want** 거래 추적 데이터를 DB에 저장
**So that** 동시에 여러 거래를 등록할 때 데이터 충돌이 발생하지 않는다

**Acceptance Criteria**:
- ✅ AC1: `POST /priceTracker` 호출 시 `trades` 테이블에 트랜잭션으로 삽입 - **IMPLEMENTED** in priceTracker.js:252
- ✅ AC2: 동일 (position, modelName, ticker, recommendationDate) 조합 시 업데이트 (upsert) - **IMPLEMENTED** in dbManager.js:439-462
- ✅ AC3: modelSummaries 자동 재계산 후 `model_summaries` 테이블에 저장 - **IMPLEMENTED** in priceTracker.js:288-313
- ✅ AC4: 파일 잠금(proper-lockfile) 제거 - **VERIFIED** (ACID 트랜잭션으로 대체)
- ✅ AC5: `GET /trackedPrice` 호출 시 trades + modelSummaries 조회 - **IMPLEMENTED** in trackedPrice.js:18-29

**Implementation Location**:
- `src/services/dbManager.js:213-319, 439-462`
- `src/api/endpoints/priceTracker.js:252, 288-313`
- `src/api/endpoints/trackedPrice.js:18-29`

### US4: 애널리스트 로그 DB 저장 ✅ COMPLETED

**As a** 시스템 관리자
**I want** analystLog 데이터를 DB에 저장
**So that** 42MB 파일을 매번 읽지 않고 필요한 ticker만 조회할 수 있다

**Acceptance Criteria**:
- ✅ AC1: `analyst_log` 테이블에 ticker별로 row 저장 - **IMPLEMENTED** in dbManager.js:422-435
- ✅ AC2: `GET /refreshAnalystLog` 호출 시 DB에 upsert - **VERIFIED**
- ✅ AC3: `GET /generateRating` 호출 시 필요한 ticker만 조회 (전체 로드 불필요) - **IMPLEMENTED** in dbManager.js:397-420
- ✅ AC4: targetPrice, numberOfAnalysts, priceTrend (JSONB) 저장 - **VERIFIED**

**Implementation Location**: `src/services/dbManager.js:397-435`

### US5: 데이터 마이그레이션 스크립트 ⚠️ PARTIALLY IMPLEMENTED

**As a** 개발자
**I want** 기존 JSON 파일을 DB로 일괄 마이그레이션하는 스크립트
**So that** 운영 중단 없이 DB로 전환할 수 있다

**Acceptance Criteria**:
- ⚠️ AC1: `npm run migrate:files-to-db` 명령어로 실행 - **NOT IMPLEMENTED** (manual migration performed)
- ✅ AC2: 4개 캐시 파일을 각각 대응하는 테이블로 마이그레이션 - **COMPLETED MANUALLY**
- ❌ AC3: 마이그레이션 진행률 표시 - **NOT IMPLEMENTED**
- ❌ AC4: 실패 시 롤백 가능 - **NOT IMPLEMENTED**
- ❌ AC5: 마이그레이션 전 백업 자동 생성 - **NOT IMPLEMENTED**

**Note**: 마이그레이션은 수동으로 완료됨. 향후 자동화 스크립트 추가 가능.

---

## Functional Requirements

### Database Schema

#### FR-001: symbol_cache 테이블

```sql
CREATE TABLE symbol_cache (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  data JSONB NOT NULL,  -- 전체 심볼 정보
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_ticker UNIQUE (ticker)
);

CREATE INDEX idx_symbol_ticker ON symbol_cache (ticker);
CREATE INDEX idx_symbol_sector ON symbol_cache (sector);
```

#### FR-002: event_cache 테이블

```sql
CREATE TABLE event_cache (
  id SERIAL PRIMARY KEY,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  events JSONB NOT NULL,  -- events 배열
  meta JSONB NOT NULL,    -- metaRecord
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_date_range UNIQUE (start_date, end_date)
);

CREATE INDEX idx_event_date_range ON event_cache (start_date, end_date);
```

#### FR-003: trades 테이블

```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  position VARCHAR(5) NOT NULL CHECK (position IN ('long', 'short')),
  model_name VARCHAR(50) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  recommendation_date DATE NOT NULL,  -- 사용자 입력 날짜 (중복 검사용)
  purchase_date DATE NOT NULL,        -- 실제 거래일 (가격 계산용, 주말/휴일 조정됨)
  current_price NUMERIC(10, 4) NOT NULL CHECK (current_price > 0),
  price_history JSONB NOT NULL,  -- PriceHistory[]
  returns JSONB NOT NULL,         -- ReturnRecord[]
  meta JSONB NOT NULL,            -- MetaRecord
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- 중복 검사는 recommendation_date 기준 (사용자 입력 날짜)
  CONSTRAINT unique_trade UNIQUE (position, model_name, ticker, recommendation_date)
);

CREATE INDEX idx_trade_ticker ON trades (ticker);
CREATE INDEX idx_trade_model ON trades (model_name);
CREATE INDEX idx_trade_recommendation_date ON trades (recommendation_date);
CREATE INDEX idx_trade_purchase_date ON trades (purchase_date);
CREATE INDEX idx_trade_position ON trades (position);
```

**recommendation_date vs purchase_date 구분**:
- `recommendation_date`: 사용자가 입력한 추천 날짜 (중복 검사용)
- `purchase_date`: 실제 거래일 (가격 계산용)
  - recommendation_date가 주말/휴일인 경우 다음 거래일로 자동 조정
  - current_price, price_history, returns는 purchase_date 기준으로 계산

#### FR-004: model_summaries 테이블

```sql
CREATE TABLE model_summaries (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(50) UNIQUE NOT NULL,
  total_trades INTEGER NOT NULL,
  optimal_holding_days INTEGER[] NOT NULL,
  suggested_max_cap NUMERIC(6, 4),
  suggested_low_cap NUMERIC(6, 4),
  avg_return_by_day JSONB NOT NULL,   -- {"D+1": 0.0032, ...}
  win_rate_by_day JSONB NOT NULL,     -- {"D+1": 0.52, ...}
  meta JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_model UNIQUE (model_name)
);

CREATE INDEX idx_model_name ON model_summaries (model_name);
```

#### FR-005: analyst_log 테이블

```sql
CREATE TABLE analyst_log (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  target_price NUMERIC(10, 2),
  number_of_analysts INTEGER,
  price_trend JSONB NOT NULL,  -- {"D+0": 185.32, "D+1": 186.75, ...}
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_analyst_ticker UNIQUE (ticker)
);

CREATE INDEX idx_analyst_ticker ON analyst_log (ticker);
```

### API Layer Changes

#### FR-006: cacheManager.js → dbManager.js 전환

기존 `src/services/cacheManager.js`의 모든 함수를 DB 쿼리로 변경:

**Before (File-based)**:
```javascript
export async function loadSymbolCache() {
  const content = await fs.readFile(SYMBOL_CACHE_PATH, 'utf8');
  return JSON.parse(content);
}
```

**After (DB-based)**:
```javascript
export async function loadSymbolCache() {
  const { data, error } = await supabase
    .from('symbol_cache')
    .select('ticker, sector, industry, data');

  if (error) throw error;
  return { symbols: data };
}
```

#### FR-007: Transaction 지원

`POST /priceTracker` 배치 처리 시 트랜잭션 사용:

```javascript
const { data, error } = await supabase.rpc('insert_trades_batch', {
  trades: tradesArray
});
```

#### FR-008: Upsert 패턴

중복 키 충돌 시 업데이트:

```javascript
const { data, error } = await supabase
  .from('trades')
  .upsert({
    position,
    model_name: modelName,
    ticker,
    purchase_date: purchaseDate,
    current_price: currentPrice,
    price_history: priceHistory,
    returns,
    meta
  }, { onConflict: 'position,model_name,ticker,purchase_date' });
```

#### FR-009: 조건부 조회 최적화

특정 ticker만 조회 (전체 로드 불필요):

```javascript
const { data, error } = await supabase
  .from('analyst_log')
  .select('*')
  .in('ticker', ['AAPL', 'MSFT', 'GOOGL']);
```

### Migration Strategy

#### FR-010: 단계별 마이그레이션

1. **Phase 1**: Supabase 프로젝트 생성 및 테이블 스키마 생성
2. **Phase 2**: 마이그레이션 스크립트 작성 (파일 → DB)
3. **Phase 3**: dbManager.js 구현 (cacheManager.js 대체)
4. **Phase 4**: 엔드포인트별 순차 전환 (feature flag 사용)
5. **Phase 5**: 통합 테스트 및 성능 벤치마크
6. **Phase 6**: 프로덕션 배포 (파일 시스템 백업 유지)

#### FR-011: Feature Flag

환경 변수로 DB/파일 시스템 전환:

```javascript
const USE_DATABASE = process.env.USE_DATABASE === 'true';

export async function loadSymbolCache() {
  if (USE_DATABASE) {
    return loadSymbolCacheFromDB();
  } else {
    return loadSymbolCacheFromFile();
  }
}
```

#### FR-012: 백업 및 롤백

- 마이그레이션 전 `docs/*.json.backup` 생성
- 실패 시 `npm run rollback:db-to-files` 명령으로 복구
- Supabase 자동 백업 (Point-in-Time Recovery 24시간)

---

## Success Criteria

### Performance

- **SC-001**: symbolCache 조회 < 10ms (기존 파일 읽기 대비 90% 단축)
- **SC-002**: getEventLatest 조회 < 50ms (기존 100ms 대비 50% 단축)
- **SC-003**: POST /priceTracker 배치 100건 < 5초 (파일 잠금 제거로 40% 단축)
- **SC-004**: analyst_log 특정 ticker 조회 < 100ms (42MB 파일 로드 대비 99% 단축)

### Reliability

- **SC-005**: 동시 10개 POST /priceTracker 요청 시 모두 성공 (파일 잠금 타임아웃 없음)
- **SC-006**: 트랜잭션 실패 시 자동 롤백 (데이터 무결성 100%)
- **SC-007**: 데이터베이스 연결 실패 시 graceful degradation (에러 메시지 명확화)

### Compatibility

- **SC-008**: 기존 모든 엔드포인트 응답 형식 동일 (JSON 구조 변경 없음)
- **SC-009**: 기존 테스트 스위트 100% 통과
- **SC-010**: Render.com 배포 성공 (환경 변수만 추가)

---

## Technical Constraints

### Database

- **TC-001**: Supabase 무료 티어 사용 (500MB 제한)
- **TC-002**: PostgreSQL 14 이상
- **TC-003**: Connection pooling (최대 동시 연결 15개)
- **TC-004**: Query timeout 10초
- **TC-012**: ⚠️ **Supabase 기본 row 제한 1000개** - 페이지네이션 필수

### ⚠️ CRITICAL: Supabase Row Limit (TC-012)

**Supabase의 기본 row 제한은 1000개입니다.** `.limit(100000)`을 설정해도 Supabase 서버 측에서 1000개만 반환합니다.

**문제 상황**:
- `supabase.from('table').select('*').limit(100000)` 호출 시 최대 1000개만 반환
- 대량 데이터 조회 시 일부 데이터 누락 발생
- 중복 체크, 캐시 로드 등에서 불완전한 결과 반환

**해결 방법 - 페이지네이션 필수**:
```javascript
// ❌ 잘못된 방법 (1000개 제한에 걸림)
const { data } = await supabase.from('table').select('*').limit(100000);

// ✅ 올바른 방법 (페이지네이션)
const pageSize = 1000;
let allData = [];
let offset = 0;

while (true) {
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .range(offset, offset + pageSize - 1);
  
  if (error) throw error;
  if (!data || data.length === 0) break;
  
  allData = allData.concat(data);
  
  if (data.length < pageSize) break;
  offset += pageSize;
}
```

**적용 필수 함수**:
- `loadSymbolCache()` - 심볼 캐시 로드 (5000+ rows)
- `loadTrackedPriceCache()` - 거래 데이터 로드
- `loadAnalystLog()` - 애널리스트 로그 로드
- `loadEventCache()` - 이벤트 캐시 로드
- 모든 대량 데이터 조회 함수

**구현 시 체크리스트**:
- [ ] 1000개 이상의 row를 조회하는 모든 함수에 페이지네이션 적용
- [ ] `.range(offset, offset + pageSize - 1)` 사용
- [ ] 빈 결과 또는 pageSize 미만 결과 시 루프 종료
- [ ] 최대 조회 개수 제한 (DB_LIMITS) 적용

### Code

- **TC-005**: Node.js 18.x+ 호환
- **TC-006**: @supabase/supabase-js 라이브러리 사용
- **TC-007**: 기존 Express.js 라우팅 구조 유지
- **TC-008**: 환경 변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `USE_DATABASE`

### Deployment

- **TC-009**: Render.com 환경 변수 설정
- **TC-010**: 마이그레이션 다운타임 < 5분
- **TC-011**: 롤백 가능 배포 전략

---

## Dependencies

### External Services

- **Supabase**: PostgreSQL 데이터베이스 호스팅
- **Render.com**: 애플리케이션 배포 플랫폼
- **FMP API**: 기존 외부 API (변경 없음)

### NPM Packages

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

---

## Risks and Mitigations

### Risk 1: Supabase 무료 티어 용량 초과

**Probability**: Low
**Impact**: High
**Mitigation**:
- 현재 43MB → 500MB 여유 (11배)
- 사용량 모니터링 스크립트 추가
- 90% 도달 시 알림

### Risk 2: DB 연결 실패 시 서비스 중단

**Probability**: Medium
**Impact**: High
**Mitigation**:
- Connection retry 로직 (최대 3회)
- Circuit breaker 패턴
- Feature flag로 파일 시스템 폴백

### Risk 3: 마이그레이션 중 데이터 손실

**Probability**: Low
**Impact**: Critical
**Mitigation**:
- 마이그레이션 전 자동 백업
- 트랜잭션 기반 마이그레이션
- 검증 스크립트 (파일 vs DB 데이터 비교)

### Risk 4: 성능 저하

**Probability**: Low
**Impact**: Medium
**Mitigation**:
- 벤치마크 테스트 (마이그레이션 전후)
- 인덱스 최적화
- 쿼리 프로파일링

---

## Open Questions

1. **Q1**: analystRating.json (287KB)도 마이그레이션할 것인가?
   - **A1**: Phase 2에서 검토 (현재는 4개 주요 캐시만 마이그레이션)

2. **Q2**: 기존 파일 시스템 완전 제거 시점은?
   - **A2**: DB 운영 3개월 안정화 후 검토

3. **Q3**: JSONB vs 정규화된 테이블?
   - **A3**: Phase 1은 JSONB로 시작, Phase 2에서 성능 측정 후 정규화 고려

4. **Q4**: 실시간 동기화 필요한가?
   - **A4**: 현재는 불필요 (배치 처리 중심), 향후 Supabase Realtime 고려

---

## Timeline (Estimated)

- **Week 1**: Supabase 설정 및 스키마 생성 (research.md, data-model.md)
- **Week 2**: 마이그레이션 스크립트 작성 및 테스트
- **Week 3**: dbManager.js 구현 및 단위 테스트
- **Week 4**: 엔드포인트 전환 및 통합 테스트
- **Week 5**: 성능 벤치마크 및 최적화
- **Week 6**: 프로덕션 배포 및 모니터링

**Total**: 6주 (단계별 검증 포함)

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [Feature 001: Financial Event API](../001-financial-event-api/spec.md)
- [Feature 002: Price Tracker](../002-price-tracker/spec.md)

---

## Appendix

### A. Migration Script Pseudocode

```javascript
// scripts/migrate-to-db.js
async function migrateSymbolCache() {
  const fileData = await fs.readFile('docs/symbolCache.json', 'utf8');
  const parsed = JSON.parse(fileData);

  for (const [ticker, info] of Object.entries(parsed.ticker)) {
    await supabase.from('symbol_cache').upsert({
      ticker,
      sector: info.sector,
      industry: info.industry,
      data: info
    });
  }
}

async function migrateAll() {
  await migrateSymbolCache();
  await migrateEventCache();
  await migrateTrackedPriceCache();
  await migrateAnalystLog();
}
```

### B. Environment Variables

```bash
# .env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USE_DATABASE=true  # false for file system fallback
```

### C. Rollback Procedure

```bash
# 1. Stop application
render-cli stop

# 2. Set USE_DATABASE=false
render-cli env set USE_DATABASE false

# 3. Restore file backups
npm run restore:backups

# 4. Restart application
render-cli start
```
