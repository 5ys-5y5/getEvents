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

### User Story 1 - Individual Trade Performance Tracking (Priority: P1)

사용자가 특정 모델의 매매 추천(long 또는 short)에 따라 특정 티커를 특정 날짜에 매수/매도했을 때, 해당 거래의 성과를 14일간 추적하여 수익률을 확인한다.

**Why this priority**: 개별 거래의 성과 추적은 모델 평가의 기초가 되며, 단일 거래의 수익률 분석 없이는 모델 성과 요약이 불가능하다.

**Independent Test**: GET /priceTracker?modelName=model1&position=long&ticker=AAPL&purchaseDate=2025-11-01 을 호출하여 현재가, D+1~D+14 가격 추이, 각 날짜별 수익률이 반환되는지 확인한다.

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

### Edge Cases

- purchaseDate가 미래 날짜일 때 → HTTP 400 에러 반환
- purchaseDate가 14일 이내여서 D+14까지 데이터가 없을 때 → 현재까지 가능한 데이터만 반환하고 meta에 dataAvailableUntil 필드 추가
- position이 "long" 또는 "short"가 아닐 때 → HTTP 400 에러 반환
- modelName이 빈 문자열일 때 → HTTP 400 에러 반환
- 동일한 (modelName, ticker, purchaseDate, position) 조합이 이미 존재할 때 → 별도 레코드로 생성 (모델이 동일 조건으로 여러 번 추천할 수 있으며, 각 거래는 독립적으로 추적)
- FMP API에서 특정 날짜의 가격 데이터를 가져올 수 없을 때 → 해당 날짜를 null로 표시하고 meta.missingDates 배열에 기록
- summary 계산 시 모든 거래가 손실일 때 → suggestedMaxCap과 suggestedLowCap을 손절 기준으로 설정하고 warning 메시지 추가

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
- **FR-007**: 시스템은 position이 "long"인 경우 각 날짜별 수익률을 다음과 같이 계산해야 한다: (1) high가 maxCap에 도달하면 (open - currentPrice) / currentPrice로 기록, (2) low가 lowCap에 도달하면 (open - currentPrice) / currentPrice로 기록, (3) 그 외의 경우 (close - currentPrice) / currentPrice로 기록
- **FR-008**: 시스템은 position이 "short"인 경우 각 날짜별 수익률을 다음과 같이 계산해야 한다: (1) low가 maxCap에 도달하면 ((open - currentPrice) / currentPrice) * -1로 기록, (2) high가 lowCap에 도달하면 ((open - currentPrice) / currentPrice) * -1로 기록, (3) 그 외의 경우 ((close - currentPrice) / currentPrice) * -1로 기록
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

- **TradeRecord**: 특정 모델의 매매 기록 (position: long/short, modelName: 모델명, ticker: 종목코드, purchaseDate: 매수일, currentPrice: 매수일 시작가, priceHistory: D+1~D+14 배열, returns: 각 날짜별 수익률 배열, meta: 메타정보)
- **PriceHistory**: 날짜별 가격 정보 (targetDate: D+N 예정일, actualDate: 실제 사용된 거래일, open: 시작가, high: 최고가, low: 최저가, close: 종가) - 모든 필드 필수, null 허용은 미래 날짜만
- **ModelSummary**: 모델별 성과 요약 (modelName, tradeCount, optimalHoldingDays, suggestedMaxCap, suggestedLowCap, avgMaxReturn, winRate)
- **ReturnRecord**: 날짜별 수익률 정보 (date: 날짜, returnRate: 수익률, returnSource: "close"|"open_maxCap"|"open_lowCap", cumulativeReturn: 누적 수익률)

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
