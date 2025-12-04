# Feature Specification: Price Tracker with Model Performance Analysis

**Feature Branch**: `002-price-tracker`
**Created**: 2025-11-28
**Status**: Draft
**Input**: User description: "지금까지의 기능을 유지하고 priceTracker라는 엔드포인트를 구현하고자 합니다. 1. 4가지 인풋(modelName, position(long/short), ticker, purchaseDate)을 넣으면 아래의 값을 출력합니다. 2. 출력 - 현재가: 매수일 기준 현재가 (purchaseDate에 시간이 포함되어 있지 않다면, 해당일 시작가) - 가격 추이: D+1일부터 D+14일까지의 가격 변동 추이를 나열하며, 휴장일은 배제하고 날짜별 가격(시작가, 최저가, 최고가, 종가)을 나열 - 수익률: position이 long으로 기록된 경우 (D+N가격-현재가/1-1)을 그대로 수익률로 기록하고, short로 기록된 경우 (D+N가격-현재가/1-1)*-1을 수익률로 기록 - 최종 요약: 위 내용들을 바탕으로 modelName별로 몇 일간 보유하고, maxCap과 lowCap을 얼마로 설정해야 최대한의 수익을 낼 수 있는지 요약하여 출력"

## Clarifications

### Session 2025-11-28
- Q: API Authentication & Authorization approach for priceTracker endpoints? → A: API key in request header (X-API-Key). System supports multiple API keys but initially configured to use same value as FMP API KEY.
- Q: FMP API rate limiting strategy for priceTracker endpoints? → A: No additional rate limiting required (FMP paid version has sufficient quota). Existing rate control code in codebase must be preserved but not extended for this feature.
- Q: Concurrent request handling for duplicate trade keys in trackedPriceCache? → A: File-based locking with retry mechanism to prevent race conditions when multiple requests update the same trade record.
- Q: trackedPriceCache backup strategy? → A: Create backup (trackedPriceCache.backup.json) before each write operation to ensure most recent valid state is always recoverable.
- Q: Batch request partial failure response format? → A: HTTP 207 Multi-Status with per-trade status codes and results. Each trade in the batch gets individual status code and result/error for clear success/failure identification.
## User Scenarios & Testing

### User Story 0 - Pre-validation Check (Priority: P0)

**[IMPLEMENTED]** 사용자가 대량의 거래를 등록하기 전에, 각 거래가 신규인지 / 부분 업데이트가 필요한지 / 이미 완료되었는지를 빠르게 확인하여 불필요한 API 호출을 방지한다.

**Why this priority**: 대량 거래 등록 시 API 비용과 시간을 절약하기 위해, 실제 API 호출 없이 데이터베이스만 조회하여 필요한 작업을 파악한다.

**Endpoint**: `POST /priceTracker/check`

**Request Format**:
- Content-Type: `text/plain` (TSV format) 또는 `application/json`
- TSV format: `position\tmodelName\tticker\tpurchaseDate` (tab-delimited)
- JSON format: Array of `{position, modelName, ticker, purchaseDate}` objects

**Response**: HTTP 200 with results array
```json
{
  "results": [
    {
      "index": 0,
      "trade": {"position": "long", "modelName": "MODEL-1", "ticker": "AAPL", "purchaseDate": "2025-11-01"},
      "status": "skip",
      "nullCount": 0,
      "futureCount": 5,
      "reason": "Data complete for past dates - 5 future dates pending"
    },
    {
      "index": 1,
      "trade": {"position": "long", "modelName": "MODEL-1", "ticker": "MSFT", "purchaseDate": "2025-10-15"},
      "status": "partial",
      "nullCount": 3,
      "futureCount": 0,
      "reason": "Needs 3 past D+N updates (0 future dates skipped)"
    },
    {
      "index": 2,
      "trade": {"position": "short", "modelName": "MODEL-2", "ticker": "GOOGL", "purchaseDate": "2025-09-01"},
      "status": "new",
      "nullCount": 14,
      "futureCount": 0,
      "reason": "New trade - will fetch 14 past D+N prices (0 future dates skipped)"
    }
  ],
  "summary": {
    "total": 3,
    "skip": 1,
    "partial": 1,
    "new": 1,
    "invalid": 0,
    "estimatedApiCalls": 17
  },
  "performance": {
    "totalMs": 245,
    "processMs": 12,
    "tradesPerSecond": 250
  }
}
```

**Status Values**:
- `skip`: 이미 완료된 거래, API 호출 불필요 (nullCount=0)
- `partial`: 일부 D+N 데이터 누락, 부분 업데이트 필요 (nullCount>0, 과거 날짜만)
- `new`: 신규 거래, 전체 데이터 수집 필요
- `invalid`: 유효성 검증 실패 (잘못된 ticker, position 등)

**Implementation Details**:
1. **In-memory optimization**: 전체 symbol cache와 trades를 메모리에 로드하여 O(1) 조회
2. **Lookup maps**: Set/Map 자료구조로 빠른 중복 검사
3. **Future date detection**: 오늘 이후 날짜는 API 호출 불필요로 판단
4. **NULL count logic**: priceHistory의 null 또는 incomplete OHLC 항목 계산
5. **Performance target**: 1000+ trades 처리 시 < 500ms

**Acceptance Scenarios**:
1. **Given** 100개의 거래를 check 요청할 때, **When** POST /priceTracker/check 호출, **Then** 500ms 이내에 각 거래의 status와 예상 API 호출 수 반환
2. **Given** 이미 완료된 거래를 check할 때, **When** 요청, **Then** status="skip", nullCount=0, reason에 완료 안내 메시지
3. **Given** 부분 완료된 거래 (D+1~D+7만 있음)를 check할 때, **When** 요청, **Then** status="partial", nullCount=남은 과거 날짜 수
4. **Given** 미래 날짜 거래 (purchaseDate가 1주일 전)를 check할 때, **When** 요청, **Then** nullCount에는 과거 거래일만 계산, futureCount에는 미래 날짜 수 표시

**Integration with POST /priceTracker**:
- check 단계 후 `skipValidation=true` 쿼리 파라미터로 POST /priceTracker 호출 시, ticker validation을 건너뛰어 성능 향상

---

### User Story 1 - Individual Trade Performance Tracking (Priority: P1)

사용자가 특정 모델의 매매 추천(long 또는 short)에 따라 특정 티커를 특정 날짜에 매수/매도했을 때, 해당 거래의 성과를 14일간 추적하여 수익률을 확인한다.

**Why this priority**: 개별 거래의 성과 추적은 모델 평가의 기초가 되며, 단일 거래의 수익률 분석 없이는 모델 성과 요약이 불가능하다.

**Independent Test**: POST /priceTracker 에 단일 거래 정보를 전송하여 현재가, D+1~D+14 가격 추이, 각 날짜별 수익률이 반환되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** purchaseDate가 2025-11-01이고 position이 long일 때, **When** GET /priceTracker 요청, **Then** HTTP 200과 함께 currentPrice(해당일 시작가), priceHistory(D+1~D+14의 시작가/최저가/최고가/종가), returns(각 날짜별 수익률 = (종가-현재가)/현재가) 반환
2. **Given** purchaseDate가 2025-11-01이고 position이 short일 때, **When** GET /priceTracker 요청, **Then** returns 필드의 수익률이 (종가-현재가)/현재가 * -1로 계산되어 반환
3. **Given** purchaseDate에 시간이 포함되어 있을 때 (예: 2025-11-01T14:30:00), **When** 요청, **Then** currentPrice는 해당 시간 시점의 가격 또는 가장 가까운 거래 시간대 가격 사용
4. **Given** purchaseDate가 휴장일일 때, **When** 요청, **Then** HTTP 400 에러와 "Purchase date is a non-trading day" 메시지 반환
5. **Given** D+1~D+14 기간 중 휴장일이 포함될 때, **When** 요청, **Then** 휴장일은 priceHistory에서 제외하고 실제 거래일만 포함
6. **Given** ticker가 symbolCache.json에 없을 때, **When** 요청, **Then** HTTP 404 에러와 "Ticker not found" 메시지 반환

---

### User Story 2 - Model Performance Summary Analysis (Priority: P2)

사용자가 특정 모델의 여러 거래 기록을 바탕으로 최적의 보유 기간과 손절/익절 기준(maxCap, lowCap)을 확인하여 모델의 최대 수익 전략을 파악한다.

**Why this priority**: 개별 거래 추적이 가능해진 후, 여러 거래를 종합하여 모델의 최적 전략을 도출하는 것이 투자 의사결정에 핵심적이다.

**Independent Test**: 동일 modelName으로 여러 거래를 기록한 후 GET /priceTracker/summary?modelName=model1 을 호출하여 최적 보유 기간, maxCap, lowCap 권장값이 반환되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** modelName이 "model1"인 거래가 10건 이상 존재할 때, **When** GET /priceTracker/summary?modelName=model1 요청, **Then** HTTP 200과 함께 optimalHoldingDays(평균 최고 수익률 달성일), suggestedMaxCap(long 포지션 익절 기준), suggestedLowCap(short 포지션 익절 기준), avgMaxReturn(평균 최대 수익률) 반환
2. **Given** modelName이 "model1"인 거래가 3건 미만일 때, **When** summary 요청, **Then** HTTP 400 에러와 "Insufficient data for summary (minimum 3 trades required)" 메시지 반환
3. **Given** modelName의 거래 중 50% 이상이 손실일 때, **When** summary 요청, **Then** suggestedMaxCap과 suggestedLowCap에 손절 기준도 포함하여 반환
4. **Given** 요청한 modelName이 존재하지 않을 때, **When** summary 요청, **Then** HTTP 404 에러와 "Model not found" 메시지 반환

---

### User Story 3 - Batch Trade Recording (Priority: P3)

사용자가 여러 개의 거래를 한 번에 등록하여 모델 성과 분석을 위한 데이터를 효율적으로 축적한다.

**Why this priority**: 개별 거래 추적과 요약 분석이 완성된 후, 대량 데이터 입력 편의성을 제공하는 것이 사용자 경험 향상에 도움이 된다.

**Independent Test**: POST /priceTracker/batch 에 여러 거래 정보를 배열로 전송하여 일괄 등록되고, 각 거래의 추적 결과가 반환되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** trades 배열에 5개의 거래 정보가 포함될 때, **When** POST /priceTracker/batch 요청, **Then** HTTP 200과 함께 각 거래의 추적 결과 배열 반환
2. **Given** trades 배열 중 일부 거래의 ticker가 유효하지 않을 때, **When** batch 요청, **Then** 유효한 거래는 처리하고, 실패한 거래는 errors 배열에 포함하여 반환
3. **Given** trades 배열이 비어있을 때, **When** batch 요청, **Then** HTTP 400 에러와 "Empty trades array" 메시지 반환

---

### User Story 4 - Dashboard Visualization (Priority: P2)

**[IMPLEMENTED]** 사용자가 웹 대시보드를 통해 모든 거래의 성과를 시각적으로 분석하고, maxCap/lowCap 설정을 실시간으로 조정하며 수익률 변화를 확인한다.

**Endpoint**: `GET /dashboard` (requires `api_key` query parameter)

**Features**:
1. **전체 현황 (Overview)**: 총 거래 수, 모델 수, 평균 수익률, 승률
2. **모델별 성과 (By Model)**: 각 모델의 승률, 평균 수익률, 최적 보유 기간
3. **포지션별 성과 (By Position)**: Long/Short 별 성과 비교
4. **거래일별 성과 (By Date)**: 거래 시작일에 따른 성과 분석
5. **보유일별 성과 (By Holding Day)**: D+1~D+14 각 보유일의 평균 수익률 및 승률
6. **히트맵 (Heatmap)**: 모델 × 보유일 조합의 성과 시각화
7. **거래 목록 (Trades)**: 전체 거래 내역 테이블

**Dynamic Cap Settings (dashboard.js:703-721)**:
```html
<select id="returnTypeFilter" onchange="changeReturnType(this.value)">
  <option value="cap">Cap 적용</option>
  <option value="pure">순수 수익률 (Cap 미적용)</option>
</select>

<input type="number" id="maxCapInput" value="0.20" onchange="updateCapSettings()">
<input type="number" id="lowCapInput" value="0.05" onchange="updateCapSettings()">
```

**Implementation**: `src/api/endpoints/dashboard.js` (1655 lines)

**Acceptance Scenarios**:
1. **Given** 100개의 거래 데이터가 있을 때, **When** /dashboard 접속, **Then** 모든 차트와 테이블이 < 2초 내 렌더링
2. **Given** maxCap을 0.20에서 0.30으로 변경할 때, **When** 설정 업데이트, **Then** 모든 수익률 차트가 즉시 재계산되어 표시
3. **Given** returnType을 'pure'로 변경할 때, **When** 선택, **Then** cap 미적용 순수 수익률 표시, cap 설정 UI 숨김

---

### User Story 5 - Tracker UI (Priority: P3)

**[IMPLEMENTED]** 사용자가 TSV 형식으로 대량 거래를 복사-붙여넣기하여 빠르게 등록하고, check 단계에서 예상 API 호출 수를 확인한 후 실행한다.

**Endpoint**: `GET /tracker` (requires `api_key` query parameter)

**Features**:
1. **TSV Input**: Tab-delimited 텍스트 입력 (엑셀에서 복사-붙여넣기)
2. **Check Phase**: POST /priceTracker/check 호출하여 예상 작업량 표시
3. **Execution Phase**: 사용자 확인 후 POST /priceTracker 호출
4. **Real-time Progress**: 처리 진행률 및 결과 실시간 표시

**Implementation**: `src/api/endpoints/tracker.js`

**Integration with /proceeding**:
- Tracker UI에서 실행 버튼 클릭 → `/proceeding` 페이지로 이동
- proceeding 페이지에서 실제 API 호출 및 진행률 표시

---

### Edge Cases

- purchaseDate가 미래 날짜일 때 → HTTP 400 에러 반환
- purchaseDate가 14일 이내여서 D+14까지 데이터가 없을 때 → 현재까지 가능한 데이터만 반환, priceHistory 내 isFutureDate=true 플래그로 표시
- position이 "long" 또는 "short"가 아닐 때 → HTTP 400 에러 반환
- modelName이 MODEL-{number} 패턴이 아닐 때 → HTTP 400 에러 반환 (priceTracker.js:87-95)
- 동일한 (position, modelName, ticker, recommendationDate) 조합이 이미 존재할 때 → upsert (덮어쓰기), DB unique constraint 적용
- FMP API에서 특정 날짜의 가격 데이터를 가져올 수 없을 때 → 해당 날짜를 null로 표시하고 meta.missingDates 배열에 기록
- summary 계산 시 모든 거래가 손실일 때 → suggestedMaxCap과 suggestedLowCap을 손절 기준으로 설정하고 warning 메시지 추가
- purchaseDate가 주말/휴일일 때 → 자동으로 다음 거래일로 조정, meta.dateAdjusted=true로 표시

## Database Constraints (Supabase)

### ⚠️ CRITICAL: Supabase Row Limit

**Supabase의 기본 row 제한은 1000개입니다.** `.limit(100000)`을 설정해도 Supabase 서버 측에서 1000개만 반환합니다.

**문제 상황**:
- `supabase.from('trades').select('*').limit(100000)` 호출 시 최대 1000개만 반환
- 거래 기록이 1000개를 초과하면 일부 데이터 누락
- 중복 체크 시 기존 거래를 인식하지 못해 중복 삽입 발생

**해결 방법 - 페이지네이션 필수**:
```javascript
// ❌ 잘못된 방법 (1000개 제한에 걸림)
const { data } = await supabase.from('trades').select('*').limit(100000);

// ✅ 올바른 방법 (페이지네이션)
const pageSize = 1000;
let allData = [];
let offset = 0;

while (true) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .range(offset, offset + pageSize - 1);
  
  if (error) throw error;
  if (!data || data.length === 0) break;
  
  allData = allData.concat(data);
  
  if (data.length < pageSize) break;
  offset += pageSize;
}
```

**priceTracker 관련 주의사항**:
- `loadTrackedPriceCache()` - 모든 거래 데이터 로드 시 페이지네이션 필수
- `priceTrackerCheckHandler()` - 중복 체크 시 전체 거래 목록 필요
- 거래 수가 1000개 초과 시 반드시 페이지네이션 적용

---

## Requirements

### Functional Requirements

- **FR-022**: 시스템은 모든 priceTracker 엔드포인트 요청에서 X-API-Key 헤더를 검증해야 하며, 유효하지 않은 경우 HTTP 401 에러를 반환해야 한다
- **FR-023**: 시스템은 여러 API 키를 지원해야 하며, 초기 설정에서는 FMP API KEY와 동일한 값을 사용해야 한다
- **FR-024**: 시스템은 trackedPriceCache.json 파일 업데이트 시 파일 기반 잠금(file-based locking)을 사용하여 동시 요청 간 경쟁 조건(race condition)을 방지해야 하며, 잠금 실패 시 재시도 로직을 적용해야 한다
- **FR-025**: 시스템은 trackedPriceCache.json 파일에 쓰기 작업을 수행하기 전에 현재 파일을 trackedPriceCache.backup.json으로 백업해야 하며, 파일 손상 시 백업에서 복구를 시도해야 한다
- **FR-001**: 시스템은 GET /priceTracker?modelName={모델명}&position={long|short}&ticker={티커}&purchaseDate={날짜} 요청을 처리해야 한다
- **FR-002**: 시스템은 purchaseDate에 시간이 포함되지 않은 경우 해당일의 시작가를 currentPrice로 사용해야 한다
- **FR-003**: 시스템은 purchaseDate에 시간이 포함된 경우 해당 시간대의 가격 또는 가장 가까운 거래 시간대 가격을 currentPrice로 사용해야 한다
- **FR-004**: 시스템은 purchaseDate가 휴장일인 경우 HTTP 400 에러를 반환해야 한다
- **FR-005**: 시스템은 D+1부터 D+14까지의 가격 추이를 priceHistory 배열로 반환해야 하며, 각 날짜별로 date, open, high, low, close 필드를 포함해야 한다
- **FR-006**: 시스템은 priceHistory에서 휴장일을 제외하고 실제 거래일만 포함해야 한다
- **FR-007**: 시스템은 position이 "long"인 경우 각 날짜별 수익률을 다음과 같이 계산해야 한다: (close - currentPrice) / currentPrice (순수 수익률, 상한/하한 미적용)
- **FR-008**: 시스템은 position이 "short"인 경우 각 날짜별 수익률을 다음과 같이 계산해야 한다: ((close - currentPrice) / currentPrice) * -1 (순수 수익률, 상한/하한 미적용)
- **FR-026**: 시스템은 dashboard 및 control 페이지에서 사용자가 설정한 maxCap(익절 상한)과 lowCap(손절 하한) 값을 기준으로 저장된 returns 데이터를 실시간 변환하여 표시해야 한다
- **FR-009**: 시스템은 각 거래 추적 결과를 저장하여 나중에 모델별 요약 분석에 사용할 수 있어야 한다
- **FR-010**: 시스템은 GET /priceTracker/summary?modelName={모델명} 요청을 처리하여 해당 모델의 모든 거래를 분석한 요약 정보를 반환해야 한다
- **FR-011**: 시스템은 summary 계산 시 최적 보유 기간(optimalHoldingDays)을 평균 최대 수익률 달성일로 산출해야 한다
- **FR-012**: 시스템은 summary 계산 시 수익 상한(suggestedMaxCap)을 20 백분위수 수익률로 제안해야 한다
- **FR-013**: 시스템은 summary 계산 시 손실 하한(suggestedLowCap)을 5 백분위수 수익률로 제안해야 한다
- **FR-014**: 시스템은 summary 계산에 최소 3건의 거래 데이터가 필요하며, 미달 시 HTTP 400 에러를 반환해야 한다
- **FR-015**: 시스템은 POST /priceTracker/batch 요청으로 여러 거래를 일괄 등록할 수 있어야 한다
- **FR-016**: 시스템은 batch 요청 시 각 거래를 개별적으로 검증하고, HTTP 207 Multi-Status 응답으로 각 거래별 상태 코드와 결과/에러를 반환해야 한다
- **FR-017**: 시스템은 ticker가 symbolCache.json에 없는 경우 HTTP 404 에러를 반환해야 한다
- **FR-018**: 시스템은 position 값이 "long" 또는 "short"가 아닌 경우 HTTP 400 에러를 반환해야 한다
- **FR-019**: 시스템은 purchaseDate가 미래 날짜인 경우 HTTP 400 에러를 반환해야 한다
- **FR-020**: 시스템은 purchaseDate가 14일 이내여서 전체 D+14 데이터가 없는 경우, 현재까지 가능한 데이터만 반환하고 meta.dataAvailableUntil 필드를 추가해야 한다
- **FR-021**: 시스템은 FMP API에서 특정 날짜의 가격 데이터를 가져올 수 없는 경우, 해당 날짜를 null로 표시하고 meta.missingDates 배열에 기록해야 한다

### Key Entities

- **TradeRecord**: 특정 모델의 매매 기록
  - `position`: long/short
  - `modelName`: 모델명
  - `ticker`: 종목코드
  - `recommendationDate`: 사용자 입력 추천 날짜 (중복 검사용)
  - `purchaseDate`: 실제 거래일 (가격 계산용, 주말/휴일인 경우 다음 거래일로 조정됨)
  - `currentPrice`: 매수일(purchaseDate) 시작가
  - `priceHistory`: D+1~D+14 배열 (purchaseDate 기준)
  - `returns`: 각 날짜별 수익률 배열
  - `meta`: 메타정보
- **PriceHistory**: 날짜별 가격 정보 (targetDate: D+N 예정일, actualDate: 실제 사용된 거래일, open: 시작가, high: 최고가, low: 최저가, close: 종가) - 모든 필드 필수, null 허용은 미래 날짜만
- **ModelSummary**: 모델별 성과 요약 (modelName, tradeCount, optimalHoldingDays, suggestedMaxCap, suggestedLowCap, avgMaxReturn, winRate)
- **ReturnRecord**: 날짜별 수익률 정보 (date: 날짜, returnRate: 수익률, returnSource: "close"|"open_maxCap"|"open_lowCap", cumulativeReturn: 누적 수익률)

### Return Calculation Strategy

**[CRITICAL IMPLEMENTATION DETAIL]**

**Pure Returns Storage + Dynamic Cap Calculation**:

시스템은 **순수 수익률(Pure Returns)**만 데이터베이스에 저장하고, **Cap-aware returns**는 Dashboard/Control UI에서 동적으로 계산합니다.

**1. Stored in Database (returns field)**:
```json
{
  "returns": [
    {
      "date": "2025-11-02",
      "returnRate": 0.0234,        // Pure return: (close - entry) / entry
      "cumulativeReturn": 0.0234,  // Cumulative pure return
      "open": 150.00,
      "high": 152.50,
      "low": 149.80,
      "close": 151.50
    }
  ]
}
```
- `returnRate`: 종가 기준 순수 수익률 (cap 미적용)
- OHLC 데이터 포함: Cap 계산에 필요한 일중 최고/최저가 포함

**2. Calculated in UI (dashboard.js:1133-1226)**:
```javascript
function calculateCapAwareReturn(position, currentPrice, dayData, maxCap, lowCap) {
  const { open, high, low, close } = dayData;

  if (position === 'long') {
    const maxCapThreshold = currentPrice * (1 + maxCap);  // e.g., 120% threshold
    const lowCapThreshold = currentPrice * (1 - lowCap);  // e.g., 95% threshold

    if (high >= maxCapThreshold) {
      return (open - currentPrice) / currentPrice;  // Exit at open (익절)
    } else if (low <= lowCapThreshold) {
      return (open - currentPrice) / currentPrice;  // Exit at open (손절)
    } else {
      return (close - currentPrice) / currentPrice;  // Hold to close
    }
  } else {
    // Short position logic (reversed)
  }
}
```

**3. Why This Approach?**:
- **Flexibility**: 사용자가 UI에서 maxCap/lowCap 값을 실시간 조정 가능 (FR-026)
- **Storage Efficiency**: 동일 거래 데이터로 다양한 cap 전략 시뮬레이션
- **Accuracy**: 일중 최고가/최저가 기반 정확한 cap 도달 시점 계산

**4. UI Components**:
- `/dashboard`: Cap 설정 UI + 동적 수익률 계산 및 시각화
- `/control`: Global cap 설정 관리 (appConfig.js:RETURN_CAP)

**5. Implementation Locations**:
- Pure return calculation: `src/services/priceTrackerService.js:190-199`
- Cap-aware calculation: `src/api/endpoints/dashboard.js:1133-1226`
- Cap settings storage: `src/config/appConfig.js:107-111` (RETURN_CAP)

---

### Date Handling

**recommendation_date vs purchase_date 구분**:
- `recommendation_date`: 사용자가 입력한 추천 날짜 (중복 검사용, UNIQUE 제약조건에 사용)
- `purchase_date`: 실제 거래일 (가격 계산용)
  - recommendation_date가 주말/휴일인 경우 다음 거래일로 자동 조정
  - current_price, price_history, returns는 purchase_date 기준으로 계산

예시:
- 입력: `recommendationDate: "2025-10-04"` (토요일)
- 저장: `recommendation_date: "2025-10-04"`, `purchase_date: "2025-10-06"` (월요일)
- 중복 검사: `recommendation_date` 기준
- 가격 계산: `purchase_date` 기준

**Trading Day Calculation (priceTrackerService.js:96-247)**:
- D+N은 **거래일 기준** 계산 (달력일 아님)
- 주말/휴일 자동 제외
- FMP market holidays API 연동 (tradingDayService.js)
- 예시: 금요일 매수 → D+1은 다음주 월요일

**API Call Optimization (CRITICAL IMPLEMENTATION)**:

**⚡ Ticker-Grouped Batch Processing** (priceTrackerService.js:354-599):

The system uses **2-level optimization**:

**Level 1: Single API call per trade** (per-trade optimization)
```javascript
// ❌ OLD: 14 separate API calls per trade (D+1 to D+14)
for (let n = 1; n <= 14; n++) {
  const result = await getHistoricalOHLC(ticker, targetDate);  // 14 API calls!
}

// ✅ Level 1: 1 API call per trade (range query)
const result = await getHistoricalOHLCRange(ticker, firstPastDate, lastPastDate);
```

**Level 2: Ticker grouping across trades** (batch optimization)
```javascript
// ❌ OLD: 1 API call per trade (even if same ticker)
// 100 trades with 3 tickers (AAPL: 40, MSFT: 30, GOOGL: 30) → 100 API calls

// ✅ Level 2: 1 API call per unique ticker
// Group by ticker → Calculate date range per ticker → Single API call
// 100 trades with 3 tickers → 3 API calls!

// Example:
batchCreateTradeRecords([
  { ticker: 'AAPL', purchaseDate: '2025-11-01', ... },  // AAPL group
  { ticker: 'AAPL', purchaseDate: '2025-11-05', ... },  // AAPL group
  { ticker: 'MSFT', purchaseDate: '2025-11-03', ... },  // MSFT group
  { ticker: 'AAPL', purchaseDate: '2025-11-10', ... }   // AAPL group
]);

// Result:
// 1. AAPL?from=2025-11-01&to=2025-11-24  (covers all 3 AAPL trades)
// 2. MSFT?from=2025-11-03&to=2025-11-17  (covers 1 MSFT trade)
// Total: 2 API calls for 4 trades
```

**Implementation Steps**:
1. **Group by ticker** (priceTrackerService.js:363-405): Collect all trades per ticker + calculate min/max date range
2. **Single API call per ticker** (priceTrackerService.js:410-438): Fetch price range from earliest to latest date
3. **Build lookup map** (priceTrackerService.js:421-433): O(1) access to price data by date
4. **Process all trades** (priceTrackerService.js:440-595): Fill all trades from cached price data

**Fallback Strategy** (priceTrackerService.js:529-553):
```javascript
// Search backwards up to 7 days for available data
if (!dayPriceData) {
  for (let offset = 1; offset <= 7; offset++) {
    const fallbackDate = new Date(tradingDayObj);
    fallbackDate.setDate(fallbackDate.getDate() - offset);
    const fallbackDateStr = format(fallbackDate, 'yyyy-MM-dd');
    dayPriceData = priceMap.get(fallbackDateStr);
    if (dayPriceData) break;
  }
}
```

**Performance Impact**:

| Scenario | Before | After | Speedup |
|----------|--------|-------|---------|
| **Per-trade optimization** | 14 calls/trade | 1 call/trade | 14x |
| **Batch: 100 trades, 1 ticker** | 100 calls | 1 call | 100x |
| **Batch: 100 trades, 10 tickers** | 100 calls | 10 calls | 10x |
| **Batch: 10,000 trades, 100 tickers** | 10,000 calls | 100 calls | 100x |

**Real-world Example**:
- **trades table**: 10,000 records
- **Unique tickers**: 100
- **API calls needed**: 100 (NOT 10,000!)

**Reliability**:
- Fallback logic handles missing data gracefully
- Failed ticker API call only affects trades for that ticker
- Transaction-safe DB updates

## Success Criteria

### Measurable Outcomes

- **SC-001**: 사용자가 단일 거래의 14일 성과를 3초 이내에 조회할 수 있다
- **SC-002**: 시스템이 동시에 10개의 거래 추적 요청을 처리할 수 있다
- **SC-003**: 모델별 요약 분석이 100건의 거래 기준 5초 이내에 완료된다
- **SC-004**: 배치 요청으로 한 번에 최대 50개의 거래를 등록할 수 있다
- **SC-005**: 휴장일 처리 정확도가 100%이다 (모든 휴장일이 자동으로 제외됨)
- **SC-006**: long/short 포지션별 수익률 계산 정확도가 100%이다
- **SC-007**: 사용자가 모델의 최적 전략(보유 기간, 익절 기준)을 요약 화면에서 즉시 확인할 수 있다

## Assumptions
- FMP API 유료 버전을 사용하며, 현재 기능 수준의 요청 속도로는 rate limit에 도달하지 않는다고 가정. 기존 코드베이스의 rate control 로직은 유지하되 이 기능에서 추가 제어는 불필요함

- FMP API의 historical price endpoint에서 시작가, 최저가, 최고가, 종가 데이터를 모두 제공한다고 가정
- 휴장일 정보는 FMP API 응답의 빈 배열 또는 날짜 누락으로 판단 가능하다고 가정
- purchaseDate가 시간을 포함하는 경우, 해당 시간대가 미국 동부시간(ET) 기준이라고 가정
- 모델별 요약 분석 시, 거래 데이터는 시스템 내부 저장소(예: docs/tradeLog.json)에 누적된다고 가정
- maxCap과 lowCap은 백분위수 기준으로 산출하며, 기본적으로 maxCap은 20 백분위수, lowCap은 5 백분위수를 사용한다고 가정
- 중복 거래(동일 modelName, ticker, purchaseDate, position)는 별도 레코드로 생성된다고 가정
