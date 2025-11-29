# Price Tracker API 상세 문서

**Feature**: 002-price-tracker
**버전**: 1.0.0
**최종 업데이트**: 2025-11-28

이 문서는 `apiGuide.js`에 추가될 Price Tracker 엔드포인트의 상세 설명을 포함합니다.

---

## 엔드포인트 6: POST /priceTracker - 거래 추적 등록 (배치)

**URL**: `https://getevents.onrender.com/priceTracker`
**Method**: POST
**Content-Type**: text/plain
**Authentication**: X-API-Key header

### 기능 설명

모델의 매매 추천에 따른 개별 거래를 등록하고, 해당 거래의 D+1부터 D+14까지의 가격 변동 및 수익률을 자동 추적합니다.
Long/Short 포지션별로 차별화된 수익률 계산을 수행하며, 익절(maxCap) 및 손절(lowCap) 기준 도달 시
조기 청산 시나리오를 반영한 **Cap-Aware 수익률 계산**을 제공합니다.

### 핵심 특징

- **배치 처리**: 여러 거래를 한 번에 등록 가능 (tab-delimited 형식)
- **HTTP 207 Multi-Status**: 각 거래별 개별 성공/실패 상태 반환
- **Progressive Data Filling**: 미래 날짜(D+N)는 null로 저장 후 시간 경과에 따라 자동 업데이트
- **Cap-Aware Return**: 일중 고가/저가가 익절/손절 기준 도달 시 시가 기준 수익률 기록
- **거래일 자동 처리**: 휴장일(주말/공휴일)은 다음 거래일 가격으로 대체
- **파일 잠금**: 동시 요청 시 proper-lockfile로 경쟁 조건 방지

### 요청 형식

**Body Format (tab-delimited)**:
```
position	modelName	ticker	purchaseDate
long	MODEL-0	AAPL	2025-11-01
short	MODEL-0	TSLA	2025-11-15
long	MODEL-1	MSFT	2025-11-20
```

### 입력 필드

| 필드 | 타입 | 필수 | 설명 | 검증 규칙 |
|------|------|------|------|-----------|
| position | string | ✓ | 거래 방향 | "long" 또는 "short" |
| modelName | string | ✓ | 모델 식별자 | 패턴: MODEL-{숫자} |
| ticker | string | ✓ | 종목 코드 | 대문자, symbolCache 존재 |
| purchaseDate | string | ✓ | 매수일 | YYYY-MM-DD, 거래일 |

### 응답 구조 (HTTP 207)

```json
{
  "results": [
    {
      "index": 0,
      "status": 200,
      "trade": {
        "position": "long",
        "modelName": "MODEL-0",
        "ticker": "AAPL",
        "purchaseDate": "2025-11-01"
      },
      "data": {
        "currentPrice": 150.25,
        "priceHistory": [
          {
            "targetDate": "2025-11-04",
            "actualDate": "2025-11-04",
            "open": 151.00,
            "high": 153.50,
            "low": 150.75,
            "close": 152.25
          },
          null
        ],
        "returns": [
          {
            "date": "2025-11-04",
            "returnRate": 0.0133,
            "returnSource": "close",
            "cumulativeReturn": 0.0133
          },
          null
        ]
      }
    }
  ],
  "summary": {
    "total": 1,
    "succeeded": 1,
    "failed": 0
  }
}
```

### Cap-Aware 수익률 계산 로직

#### Long Position (매수):
- **익절 도달** (high ≥ maxCap): `returnRate = (open - currentPrice) / currentPrice`, `returnSource = "open_maxCap"`
- **손절 도달** (low ≤ -lowCap): `returnRate = (open - currentPrice) / currentPrice`, `returnSource = "open_lowCap"`
- **정상**: `returnRate = (close - currentPrice) / currentPrice`, `returnSource = "close"`

#### Short Position (공매도):
- **익절 도달** (low 하락): `returnRate = ((open - currentPrice) / currentPrice) * -1`, `returnSource = "open_maxCap"`
- **손절 도달** (high 상승): `returnRate = ((open - currentPrice) / currentPrice) * -1`, `returnSource = "open_lowCap"`
- **정상**: `returnRate = ((close - currentPrice) / currentPrice) * -1`, `returnSource = "close"`

### 오류 코드

| 상태 | 코드 | 설명 | 조치 |
|------|------|------|------|
| 400 | EMPTY_REQUEST | 요청 본문 비어있음 | 데이터 전송 |
| 400 | INVALID_FORMAT | 잘못된 형식 | 4개 필드 확인 |
| 400 | INVALID_DATE | 미래 날짜 또는 휴장일 | 과거 거래일 사용 |
| 401 | MISSING_API_KEY | 인증 누락 | X-API-Key 추가 |
| 404 | TICKER_NOT_FOUND | 종목 없음 | 유효한 종목 사용 |
| 500 | API_ERROR | FMP API 실패 | 재시도 |
| 500 | LOCK_ACQUISITION_ERROR | 파일 잠금 실패 | 재시도 |

### 사용 예시

```bash
# 단일 거래
curl -X POST https://getevents.onrender.com/priceTracker \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: text/plain" \
  -d "long	MODEL-0	AAPL	2025-11-01"

# 배치 거래
curl -X POST https://getevents.onrender.com/priceTracker \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @trades.txt
```

---

## 엔드포인트 7: GET /trackedPrice - 거래 조회 및 모델 성과 요약

**URL**: `https://getevents.onrender.com/trackedPrice`
**Method**: GET
**Authentication**: X-API-Key header

### 기능 설명

등록된 모든 거래의 현재 상태를 조회하고, 모델별 성과 요약(평균 수익률, 승률, 권장 익절/손절 기준)을 제공합니다.

### 핵심 기능

- **전체 거래 목록**: 모든 TradeRecord 반환
- **모델별 성과 요약**: tradeCount, avgReturn, winRate 집계
- **권장 Cap 산출**: 백분위수 계산 (suggestedMaxCap: 20%, suggestedLowCap: 5%)
- **빠른 응답**: 캐시 직접 반환 (< 100ms)

### 응답 구조

```json
{
  "meta": {
    "lastUpdatedAt": "2025-11-28T10:30:00Z",
    "totalTrades": 487,
    "totalModels": 5,
    "cacheVersion": "1.0.0"
  },
  "trades": [ /* TradeRecord 배열 */ ],
  "modelSummaries": [
    {
      "modelName": "MODEL-0",
      "tradeCount": 150,
      "suggestedMaxCap": 0.0215,
      "suggestedLowCap": -0.0187,
      "avgReturn": 0.0052,
      "winRate": 0.63
    }
  ]
}
```

### ModelSummary 필드

| 필드 | 타입 | 설명 | 계산 방법 |
|------|------|------|-----------|
| modelName | string | 모델 식별자 | - |
| tradeCount | number | 총 거래 수 | 개수 |
| suggestedMaxCap | number\|null | 익절 기준 (20%) | 20th percentile, < 3 trades면 null |
| suggestedLowCap | number\|null | 손절 기준 (5%) | 5th percentile, < 3 trades면 null |
| avgReturn | number\|null | 평균 수익률 | 산술 평균 |
| winRate | number\|null | 승률 (0.0~1.0) | 양수 비율 |

### 백분위수 계산

1. 모델의 완료된 returns 수집 (null 제외)
2. 3개 미만이면 null 반환
3. **suggestedMaxCap**: 20th percentile (보수적 익절)
4. **suggestedLowCap**: 5th percentile (공격적 손절)

### 활용 시나리오

- **성과 대시보드**: 주기적 모니터링
- **백테스팅**: 과거 데이터 분석
- **자동 Cap 설정**: suggestedCap을 다음 거래에 사용
- **모델 비교**: avgReturn, winRate로 최적 모델 선정

---

## 엔드포인트 8: POST /refreshAnalystLog - 체크포인트 강화

**URL**: `https://getevents.onrender.com/refreshAnalystLog`
**Method**: POST
**업데이트**: 체크포인트 기반 결함 허용 추가

### 신규 특징

- **100 레코드 단위 체크포인트**: 진행 상태 저장
- **자동 재개**: lastProcessedId부터 이어서 처리
- **원자적 쓰기**: proper-lockfile 사용
- **오류 로깅**: errors 배열에 실패 기록

### 응답 구조

```json
{
  "status": "completed",
  "meta": {
    "startedAt": "2025-11-28T10:00:00Z",
    "completedAt": "2025-11-28T12:30:00Z",
    "totalRecords": 600000,
    "lastProcessedId": "analyst_600000",
    "checkpointCount": 6000,
    "resumedFrom": null
  },
  "stats": {
    "recordsProcessed": 600000,
    "errorsEncountered": 12,
    "apiCallsMade": 6000,
    "durationSeconds": 9000
  }
}
```

### 신규 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| meta.checkpointCount | number | 생성된 체크포인트 수 |
| meta.resumedFrom | string\|null | 재개 시작점 |
| stats.errorsEncountered | number | 오류 개수 |
| stats.apiCallsMade | number | API 호출 수 |

### 체크포인트 메커니즘

1. analystLog.json의 lastProcessedId 읽기
2. 다음 ID부터 100개씩 처리
3. 100개 완료 시:
   - 파일 잠금
   - records append
   - meta 업데이트
   - 저장 후 잠금 해제
4. 반복

### 주의사항

- 600,000 레코드 처리 시 약 2.5시간 소요
- Render 무료 플랜 15분 타임아웃 → Paid 플랜 필요
- 중단 시 다음 실행에서 자동 재개
- 동시 실행 방지 (HTTP 409)

---

## 통합 가이드

이 문서의 내용을 `src/api/endpoints/apiGuide.js`의 1341번 라인 (기존 엔드포인트 5번 이후, "프로젝트 구조" 섹션 전)에 HTML 형식으로 변환하여 삽입하세요.

### 삽입 위치

```javascript
      </div> // 엔드포인트 5번 종료
    </section>

    // <<<< 여기에 Price Tracker 엔드포인트 6, 7, 8 삽입 >>>>

    <section class="section-block">
      <h2 id="project-structure">프로젝트 구조 및 설정 파일</h2>
```

### HTML 변환 시 주의사항

1. 모든 코드 블록은 `<pre><code>` 태그로 래핑
2. 표는 `<table class="metric-table">` 사용
3. 주의/경고는 `<div class="note">` 또는 `<div class="warning">` 사용
4. 엔드포인트 제목은 `<h3 class="endpoint-title">` 사용
5. URL은 `<code class="endpoint-url">` 사용

---

**문서 작성자**: Claude Code (Automated Documentation)
**검토 필요**: apiGuide.js 통합 후 브라우저에서 레이아웃 확인
