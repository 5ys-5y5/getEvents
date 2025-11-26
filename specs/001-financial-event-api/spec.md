# Feature Specification: Financial Event and Valuation API

**Feature Branch**: `001-financial-event-api`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Render.com에 배포된 JSON 전용 웹 API로, 사용자가 지정한 날짜 범위 안에서 ApiList.json에 기록된 API를 참고하여 티커, 이벤트 분류 정보 번들을 반환합니다."

## Clarifications

### Session 2025-11-25

- Q: When cache=true is used with getValuation and the internal getEvent call is invoked, which date range parameters should be used for the getEvent call? → A: Use the date range from the previous successful getEvent call stored in docs/getEventCache.json meta.request
- Q: When getEventLatest returns HTTP 404 or 503 for a missing/invalid cache file, which specific status code should be used? → A: Use different codes based on reason - HTTP 404 if file missing (user should run getEvent first to create cache), HTTP 503 if parse error (file exists but corrupted)
- Q: For the ratingAnalyst D+N gap calculation that needs historical EOD prices, should the system fetch all historical data once per ticker or make individual API calls for each (ticker, publishedDate+N) combination? → A: getLastPrice (fmp-historical-price-eod) must be called separately for each of the 14 D+N horizons. getEachPriceTargetConsensus, getEachGradingConsensus, getEachPriceTargetConsensusSummary are called once per ticker. analystRating (fmp-price-target-analyst-name) must be called once per unique analystName found in getEachPriceTargetConsensus results
- Q: What is the expected maximum response time threshold for getValuation when calculating valuation for a single ticker, considering it needs to make multiple sequential API calls for both quantitative and qualitative metrics? → A: 15-20 seconds per ticker
- Q: What should happen when symbolCache.json exists but is older than 7 days AND the cache refresh attempt fails 3 times? Should the system proceed with the stale cache or return an error? → A: Proceed with stale cache and include failure details in metaRecord. User should manually re-run getEvent endpoint to regenerate cache with fresh data

## User Scenarios & Testing

### User Story 1 - Event Data Retrieval with Date Range (Priority: P1)

사용자가 특정 날짜 범위(예: 오늘부터 3일 후 ~ 7일 후) 내에 발생하는 기업 이벤트(earnings calendar 등)를 조회하여, 해당 기간 동안 어떤 티커들이 이벤트를 가지는지 확인한다.

**Why this priority**: 이벤트 데이터 수집은 시스템의 핵심 기능이며, 모든 후속 기능(캐시 조회, 가치 평가)의 기반이 된다.

**Independent Test**: GET /getEvent?startDate=3&endDate=7 을 호출하여 NDJSON 스트림(eventRecord* + metaRecord)을 받고, symbolCache.json에 등록된 티커만 포함되었는지 검증한다.

**Acceptance Scenarios**:

1. **Given** symbolCache.json에 AAPL, MSFT가 등록되어 있고, 오늘부터 3~7일 후 사이에 AAPL earnings event가 있을 때, **When** GET /getEvent?startDate=3&endDate=7 요청, **Then** HTTP 200 응답과 함께 NDJSON 스트림으로 AAPL의 eventRecord 1줄 + 마지막 metaRecord 1줄 반환
2. **Given** startDate=7, endDate=3 (잘못된 범위), **When** GET /getEvent 요청, **Then** HTTP 400 에러와 JSON 에러 객체 반환 (NDJSON 스트림 없음)
3. **Given** FMP API 키가 환경 변수에 없을 때, **When** GET /getEvent 요청, **Then** HTTP 200이지만 metaRecord.collectionErrorChecklist.status에 해당 service.id의 실패 기록
4. **Given** symbolCache.json이 7일 이상 지난 경우, **When** GET /getEvent 요청, **Then** 내부적으로 filter.target API를 호출하여 symbolCache.json 갱신 시도 후 이벤트 수집

---

### User Story 2 - Cached Event Data Access (Priority: P2)

사용자가 마지막으로 성공한 getEvent 결과를 빠르게 조회하여, 새로운 데이터 수집 없이 가장 최근 캐시된 이벤트 목록을 확인한다.

**Why this priority**: 실시간 데이터 수집은 비용과 시간이 소요되므로, 캐시된 결과를 제공하는 읽기 전용 엔드포인트가 필요하다.

**Independent Test**: GET /getEventLatest 를 호출하여 docs/getEventCache.json 내용을 JSON으로 받고, meta.request 필드에 이전 요청 파라미터가 기록되어 있는지 확인한다.

**Acceptance Scenarios**:

1. **Given** getEvent가 이전에 성공적으로 완료되어 docs/getEventCache.json이 존재할 때, **When** GET /getEventLatest 요청, **Then** HTTP 200과 JSON 형태 { "meta": {...}, "events": [...] } 반환
2. **Given** docs/getEventCache.json이 존재하지 않을 때, **When** GET /getEventLatest 요청, **Then** HTTP 404 에러와 "GET_EVENT_CACHE_NOT_AVAILABLE" 메시지 반환 (사용자는 getEvent를 먼저 실행하여 캐시 생성 필요)
3. **Given** docs/getEventCache.json 파일이 존재하지만 JSON 파싱에 실패할 때, **When** GET /getEventLatest 요청, **Then** HTTP 503 에러 반환 (파일 손상)
4. **Given** getEventLatest 호출 시 추가 쿼리 파라미터가 전달되더라도, **When** 요청, **Then** 파라미터 무시하고 캐시 파일만 반환

---

### User Story 3 - Quantitative Valuation with Manual Ticker Input (Priority: P3)

사용자가 특정 티커 목록(예: AAPL,MSFT,GOOGL)을 직접 지정하여, 각 티커의 재무 지표 기반 정량 가치 평가(PBR, PSR, PER, ROE, EV/EBITDA 등)를 조회한다.

**Why this priority**: 가치 평가는 이벤트 데이터와 독립적으로 동작 가능하며, 재무 분석의 핵심 기능이다.

**Independent Test**: GET /getValuation?tickers=AAPL,MSFT&cache=false 를 호출하여 각 티커별 quantitative 필드에 PBR, PSR 등이 계산되어 있는지 검증한다.

**Acceptance Scenarios**:

1. **Given** ApiList.json의 getQuantitiveValuation 하위 서비스들이 정상 동작할 때, **When** GET /getValuation?tickers=AAPL&cache=false 요청, **Then** HTTP 200과 JSON { "meta": {...}, "valuations": [{ "ticker": "AAPL", "quantitive": {...} }] } 반환
2. **Given** tickers 파라미터가 없고 cache=false일 때, **When** GET /getValuation 요청, **Then** HTTP 400 에러 반환
3. **Given** income-statement API가 4개 미만의 분기 데이터만 반환할 때, **When** getValuation 요청, **Then** ttmFromQuarterSumOrScaled 로직에 따라 (평균 * 4) 계산 적용
4. **Given** cache 파라미터가 생략되고 tickers 파라미터도 없을 때, **When** GET /getValuation 요청, **Then** HTTP 400 에러 반환

---

### User Story 4 - Qualitative Valuation with Analyst Consensus and Peer Evaluation (Priority: P3)

사용자가 특정 티커에 대한 애널리스트 컨센서스 목표가와 동종 업계 티커들의 평균 지표를 조회하여, 목표가와 상대적 밸류에이션을 평가한다.

**Why this priority**: 정성 평가와 동종 업계 비교는 정량 평가와 함께 제공되어 투자 판단의 완전성을 높인다.

**Independent Test**: GET /getValuation?tickers=RGTI&cache=false 를 호출하여 price, qualitative.ConsensusTargetPrice (4개 필드), qualitative.PriceTargetSummary, peerQuantitative 필드들이 올바르게 반환되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** fmp-price-target-consensus API가 RGTI에 대해 컨센서스 데이터를 반환할 때, **When** getValuation 요청, **Then** qualitative.ConsensusTargetPrice에 targetConsensus, targetHigh, targetLow, targetMedian 4개 필드 포함
2. **Given** 미국 증시가 프리마켓/포스트마켓 시간일 때, **When** getValuation 요청, **Then** price.current는 pre-post-market API 값, price.source는 'pre-post-market', price.marketStatus는 'pre-market' 또는 'post-market'
3. **Given** stock_peers API가 RGTI에 대해 9개의 peer ticker를 반환할 때, **When** getValuation 요청, **Then** peerQuantitative에 9개 peer의 quantitative 평균값, peerCount=9, peerList 배열 포함
4. **Given** 정규 거래 시간일 때, **When** getValuation 요청, **Then** price.current는 quote API 값, price.source는 'quote', price.marketStatus는 'regular'

---

### User Story 5 - Event-Driven Valuation with Cache Integration (Priority: P2)

사용자가 cache=true 옵션으로 getValuation을 호출하여, 시스템이 자동으로 최신 이벤트를 수집한 후 해당 이벤트가 있는 티커들의 가치 평가를 일괄 수행한다.

**Why this priority**: 이벤트와 가치 평가를 통합하여 워크플로우를 단순화하고, 이벤트 기반 투자 전략을 지원한다.

**Independent Test**: GET /getValuation?cache=true (tickers 파라미터 없음) 를 호출하여, 내부적으로 getEvent가 실행되고 docs/getEventCache.json의 events[*].ticker 목록이 valuations 배열에 모두 포함되었는지 확인한다.

**Acceptance Scenarios**:

1. **Given** cache=true이고 tickers 파라미터가 없을 때, **When** GET /getValuation 요청, **Then** 내부적으로 getEvent 호출 → docs/getEventCache.json 갱신 → events[*].ticker로 가치 평가 수행
2. **Given** cache=true이고 getEvent 내부 호출이 실패할 때, **When** getValuation 요청, **Then** meta.collectionErrorChecklist.status에 실패 기록, 기존 캐시 사용 시도
3. **Given** cache=true이고 docs/getEventCache.json에 date, source 정보가 있을 때, **When** getValuation 응답, **Then** valuations[*] 객체에 date, source 컨텍스트 정보 포함 (로깅/메타데이터 용도)

---

### User Story 6 - Analyst Log Cache Management (Priority: P3)

사용자가 모든 티커의 애널리스트 데이터를 한 번에 수집하고 캐싱하여, 이후 분석 시 API 호출 없이 빠르게 애널리스트 정보를 활용한다.

**Why this priority**: 애널리스트 데이터는 변경 빈도가 낮고 용량이 크므로, 캐싱을 통해 API 호출 비용을 절감하고 응답 속도를 향상시킨다.

**Independent Test**: GET /refreshAnalystLog 를 호출하여 docs/analystLog.json과 docs/analystRating.json이 생성되고, meta.tickerCount와 meta.analystCount가 올바르게 기록되는지 확인한다. 또는 GET /generateRating 를 호출하여 기존 analystLog.json으로부터 analystRating.json만 생성한다.

**Acceptance Scenarios**:

1. **Given** symbolCache.json에 7,500개 티커가 등록되어 있을 때, **When** GET /refreshAnalystLog 요청 (기본값: generateRating 활성화), **Then** 3 req/s 속도로 배치 처리하여 analystLog.json 생성 후 자동으로 analystRating.json 생성 (약 42분 소요, 전역 200 req/min 제한 준수), meta에 tickerCount, totalAnalysts, duration 기록
2. **Given** refreshAnalystLog 요청 시 generateRating=false 파라미터가 있을 때, **When** 요청 완료, **Then** analystLog.json만 생성하고 analystRating.json 생성은 건너뜀
3. **Given** analystLog.json이 이미 존재할 때, **When** GET /generateRating 요청, **Then** API 호출 없이 analystLog.json에서 unique 애널리스트 추출 후 analystRating.json 생성 (< 1초 소요), meta.analystCount 기록
4. **Given** 매일 자정(ET) 스케줄러가 실행될 때, **When** 시간 도달, **Then** 자동으로 refreshAnalystLog() 및 generateAnalystRating() 순차 실행, 콘솔 로그에 [Scheduler] 태그로 결과 기록
5. **Given** analystLog.json이 존재하고 최신 상태일 때, **When** getValuation 호출, **Then** EachPriceTargetConsensusWithRating 필드 없이 ConsensusTargetPrice, PriceTargetSummary만 반환 (응답 크기 대폭 감소)

---

### Edge Cases

- startDate 또는 endDate가 자연수가 아니거나 음수일 때 → HTTP 400 에러
- symbolCache.json 갱신이 3회 재시도 후에도 실패할 때 → 기존 캐시 사용, metaRecord에 실패 기록. 사용자는 문제 해결 후 getEvent를 재실행하여 symbolCache 최신화 필요
- 동일한 (ticker, date, source) 조합의 eventRecord가 중복 수집될 때 → 최초 1개만 남기고 제거
- ApiList.json의 service.fieldMap에 새 필드 추가 시 → 런타임 매핑 로직 수정 없이 자동 반영
- 핵심 서비스(earnings-calendar 등)가 모두 실패할 때 → HTTP 5xx 에러, NDJSON 스트림 출력 중단
- docs 디렉토리 상대 경로 접근 시 서버 현재 작업 디렉토리 기준 사용 → 다양한 배포 환경(Render.com 등) 호환
- getValuation에서 income-statement API가 빈 배열 반환 시 → 해당 metric은 null로 처리
- ratingAnalyst 계산 시 표본 수 < 3인 N에 대해서는 D+N 필드 생략
- PriceTargetSummary API 응답이 빈 배열일 때 → qualitative.PriceTargetSummary = null
- cache=true로 getValuation 호출 시 docs/getEventCache.json이 존재하지 않거나 meta.request가 누락된 경우 → HTTP 400 에러 (초기 getEvent 호출 필요)

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 GET /getEvent?startDate={자연수}&endDate={자연수} 요청을 받아 HTTP 200 응답 시 NDJSON 스트림(eventRecord* + metaRecord 1줄)을 반환해야 한다
- **FR-002**: 시스템은 startDate, endDate가 자연수이고 startDate ≤ endDate 조건을 만족하지 않으면 HTTP 400 에러와 JSON 에러 객체를 반환해야 한다
- **FR-003**: 시스템은 docs/symbolCache.json의 meta.symbolCache_generated_at가 오늘 기준 7일 이상 지나면 filter.target API를 호출하여 캐시를 갱신해야 한다
- **FR-004**: 시스템은 symbolCache 갱신 실패 시 최대 3회까지 재시도하고, 모두 실패하면 기존 캐시를 사용하며 metaRecord에 실패 내역을 기록해야 한다
- **FR-005**: 시스템은 getEvent 엔드포인트에서 ApiList["getEvent"] 하위의 모든 service를 호출하여 이벤트 데이터를 수집해야 한다
- **FR-006**: 시스템은 수집된 이벤트 중 ticker가 docs/symbolCache.json에 없는 레코드는 응답 및 캐시에서 제외해야 한다
- **FR-007**: 시스템은 (ticker, date, source) 조합이 중복되는 eventRecord는 최초 1개만 남기고 나머지를 제거해야 한다
- **FR-008**: 시스템은 getEvent가 HTTP 200으로 완료되면 동일한 내용을 docs/getEventCache.json에 JSON 형태 { "meta": {...}, "events": [...] }로 저장해야 한다
- **FR-009**: 시스템은 GET /getEventLatest 요청 시 docs/getEventCache.json 내용을 JSON으로 반환해야 한다
- **FR-010**: 시스템은 docs/getEventCache.json이 존재하지 않으면 HTTP 404 에러를, 파일이 존재하지만 파싱 불가능하면 HTTP 503 에러를 반환해야 한다
- **FR-011**: 시스템은 GET /getValuation?tickers={쉼표구분티커}&cache={true|false} 요청을 처리해야 한다
- **FR-012**: 시스템은 cache=false이고 tickers 파라미터가 없으면 HTTP 400 에러를 반환해야 한다
- **FR-013**: 시스템은 cache=true인 경우 내부적으로 getEvent를 호출하여 docs/getEventCache.json을 갱신한 후 events[*].ticker를 가치 평가 대상으로 사용해야 한다. getEvent 호출 시 사용할 날짜 범위(startDate, endDate)는 docs/getEventCache.json의 meta.request.startDate 및 meta.request.endDate 값을 재사용한다
- **FR-014**: 시스템은 각 티커에 대해 docs/evMethod.json의 metrics.getQuantitiveValuation 정의에 따라 PBR, PSR, PER, ROE, EV/EBITDA 등을 계산해야 한다
- **FR-015**: 시스템은 ttmFromQuarterSumOrScaled aggregation에서 값이 4개면 합계, 4개 미만이면 (평균 * 4)를 적용해야 한다
- **FR-016**: 시스템은 각 티커에 대해 docs/evMethod.json의 metrics.getQualativeValuation 정의에 따라 ConsensusTargetPrice, analystRating을 계산해야 한다
- **FR-017**: 시스템은 analystRating 계산 시 각 애널리스트의 과거 priceTarget 히스토리에서 D+N 괴리율 평균과 표준편차를 산출해야 한다
- **FR-018**: 시스템은 D+N 괴리율 계산 시 (publishedDate+N) 날짜의 EOD 가격을 fmp-historical-price-eod API에서 조회해야 한다. 14개의 D+N horizon 지점(0,1,2,3,4,5,6,7,14,21,30,60,180,365)마다 개별 API 호출을 수행한다
- **FR-019**: 시스템은 D+N 날짜가 휴장일일 경우 이전의 가장 가까운 거래일 가격을 사용해야 한다
- **FR-020**: 시스템은 D+N 괴리율 표본 수가 3개 미만인 경우 해당 N의 통계 필드를 응답에서 생략해야 한다
- **FR-021**: 시스템은 EachPriceTargetConsensusWithRating 계산 시 각 priceTarget 레코드에 해당 analystName의 D+N 통계를 병합해야 한다
- **FR-022**: 시스템은 PriceTargetSummary를 fmp-price-target-summary API 응답의 첫 번째 요소(또는 null)로 패스-스루해야 한다
- **FR-023**: 시스템은 모든 날짜 계산을 UTC 기준으로 수행해야 한다
- **FR-024**: 시스템은 startDate, endDate를 ISO 8601 형식(YYYY-MM-DD)으로 변환하여 API URL의 {fromDate}, {toDate}에 바인딩해야 한다
- **FR-025**: 시스템은 ApiList.json의 service.API URL에 포함된 {fmpApiKey}를 환경 변수 FMP_API_KEY로 치환해야 한다
- **FR-026**: 시스템은 FMP_API_KEY 환경 변수가 없으면 해당 service 호출을 실패로 처리하고 collectionErrorChecklist에 기록해야 한다
- **FR-027**: 시스템은 ApiList.json의 service.fieldMap을 일반화된 루프로 순회하여 원격 응답 키를 로컬 필드로 매핑해야 한다 (개별 키 이름에 대한 if/switch 분기 금지)
- **FR-028**: 시스템은 getEvent 응답 필드 집합이 docs/getEventOutputSchema.jsonl의 eventRecord.properties와 정확히 일치하도록 보장해야 한다
- **FR-029**: 시스템은 핵심 서비스(earnings-calendar 등)가 모두 실패하면 HTTP 5xx 에러를 반환하고 NDJSON 스트림을 출력하지 않아야 한다
- **FR-030**: 시스템은 NDJSON 스트림 출력 시작 후 일부 API 실패가 발생해도 HTTP 200을 유지하고 metaRecord에 오류를 기록해야 한다
- **FR-031**: 시스템은 정성 평가 시 티커당 getEachPriceTargetConsensus, getEachGradingConsensus, getEachPriceTargetConsensusSummary를 각각 1회씩 호출해야 한다
- **FR-032**: 시스템은 getEachPriceTargetConsensus 결과에서 고유한 analystName 목록을 추출하고, 각 analystName마다 fmp-price-target-analyst-name API를 1회씩 호출하여 analystRating을 계산해야 한다
- **FR-033**: 시스템은 cache 파라미터가 생략되고 tickers 파라미터도 없으면 HTTP 400 에러를 반환해야 한다

### Key Entities

- **EventRecord**: 특정 티커의 특정 날짜에 발생하는 이벤트 정보 (ticker, date, source 등)
- **MetaRecord**: getEvent 실행 메타데이터 (생성 시각, 요청 파라미터, 수집 오류 체크리스트)
- **SymbolCache**: 탐색 대상 기업 티커 목록 및 sector, industry 정보 (docs/symbolCache.json)
- **EventCache**: 마지막 성공한 getEvent 결과 (docs/getEventCache.json, { "meta": {...}, "events": [...] })
- **ValuationRecord**: 티커별 정량/정성 가치 평가 결과 (ticker, quantitive, qualitative)
- **QuantitativeMetrics**: 재무 지표 기반 정량 평가 (PBR, PSR, PER, ROE, EV/EBITDA, RunwayYears 등)
- **QualitativeMetrics**: 컨센서스/애널리스트 기반 정성 평가 (ConsensusTargetPrice, analystRating, PriceTargetSummary, EachPriceTargetConsensusWithRating)
- **AnalystRatingProfile**: 애널리스트별 D+N 괴리율 평균과 표준편차 프로파일 (D+0~D+365)
- **PriceTargetRecord**: 애널리스트가 특정 날짜에 제시한 목표가 정보 (ticker, publishedDate, analystName, priceTarget, adjPriceTarget 등)
- **ApiServiceDefinition**: ApiList.json의 각 service 노드 (id, API, fieldMap)

## Success Criteria

### Measurable Outcomes

- **SC-001**: getEvent 엔드포인트는 유효한 날짜 범위 입력 시 2초 이내에 NDJSON 스트림을 반환 시작해야 한다
- **SC-002**: symbolCache.json 갱신은 filter.target API 응답이 30,000개 티커를 포함해도 5초 이내에 완료되어야 한다
- **SC-003**: getEventLatest 엔드포인트는 캐시 파일 크기가 1MB일 때 100ms 이내에 응답해야 한다
- **SC-004**: getValuation 엔드포인트는 단일 티커에 대해 정량+정성 평가를 15-20초 이내에 완료해야 한다 (다수의 순차 API 호출 포함)
- **SC-005**: ratingAnalyst 계산 시 한 애널리스트당 평균 14개 D+N 지점을 처리하며, 100개 애널리스트 기준 15초 이내 완료
- **SC-006**: ApiList.json에 새 fieldMap 항목 추가 시 런타임 매핑 코드 수정 없이 자동 반영되어야 한다 (100% 자동화)
- **SC-007**: 전체 시스템 코드 커버리지는 70% 이상을 달성해야 한다
- **SC-008**: 핵심 비즈니스 로직(날짜 변환, aggregation 계산, D+N 괴리율 계산)의 코드 커버리지는 90% 이상을 달성해야 한다
- **SC-009**: Render.com 배포 환경에서 docs 디렉토리 상대 경로 접근이 100% 성공해야 한다
- **SC-010**: 동시 10명의 사용자가 getEvent를 호출해도 서버가 안정적으로 응답해야 한다 (에러율 < 1%)
