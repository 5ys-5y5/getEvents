/**
 * API Guide endpoint - Serves HTML documentation for the API
 */

export default function apiGuide(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Financial Event API - 사용 가이드</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Malgun Gothic', sans-serif;
      line-height: 1.7;
      color: #111111;
      background: #999999;
      padding: 24px;
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
      background: #f3f3f3;
      padding: 32px 32px 40px;
      border-radius: 6px;
      border: 1px solid #dedede;
    }

    /* Typography */
    h1, h2, h3, h4 {
      font-weight: 600;
      color: #111111;
    }

    h1 {
      font-size: 1.8rem;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #dddddd;
    }

    h2 {
      font-size: 1.3rem;
      margin-bottom: 12px;
    }

    h3 {
      font-size: 1.05rem;
      margin-top: 36px;
      margin-bottom: 8px;
    }

    h4 {
      font-size: 0.96rem;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
    }

    .section-intro {
      font-size: 0.95rem;
      color: #444444;
      padding: 14px 16px;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e3e3e3;
      margin-bottom: 28px;
    }

    /* Top-level section block (h2 단위 박스) */
    .section-block {
      border: 1px solid #dddddd;
      border-radius: 6px;
      padding: 20px 20px 24px;
      background: #ffffff;
      margin-top: 100px;
    }

    .section-block:first-of-type {
      margin-top: 100px;
    }

    .section-block > h2 {
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e3e3e3;
    }

    /* Lists */
    ul {
      margin: 0 0 14px 20px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Code & Pre */
    pre {
      background: #111111;
      color: #f5f5f5;
      padding: 10px 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 10px 0 16px;
      font-size: 0.86rem;
    }

    code {
      font-family: 'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      background: #f5f5f5;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.88rem;
    }

    pre code {
      background: transparent;
      padding: 0;
    }

    /* Links */
    a {
      color: #111111;
      text-decoration: underline;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Endpoint sub-blocks (h3 이하) */
    .endpoint {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px 16px 18px;
      background: #ffffff;
      margin-top: 16px;
    }

    .endpoint-title {
      font-weight: 600;
      font-size: 2rem;
      margin-bottom: 8px;
    }

    .endpoint + .endpoint {
      margin-top: 16px;
    }

    .endpoint-url {
      background: #111111;
      color: #f5f5f5;
      padding: 6px 8px;
      border-radius: 3px;
      display: inline-block;
      margin: 6px 0 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.86rem;
      cursor: pointer;
      word-break: break-all;
    }

    .endpoint-url:hover {
      opacity: 0.9;
    }

    /* Callouts (note, response-info, step-process 모두 동일 스타일) */
    .note,
    .response-info,
    .step-process {
      padding: 10px 12px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      background: #fafafa;
      margin: 10px 0 16px;
      font-size: 0.94rem;
    }

    .note strong,
    .response-info strong,
    .step-process strong {
      display: inline-block;
      margin-bottom: 4px;
    }

    /* Tables */
    .metric-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px;
      border: 1px solid #e0e0e0;
      table-layout: fixed;
      font-size: 0.9rem;
    }

    .metric-table th,
    .metric-table td {
      border-bottom: 1px solid #e0e0e0;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }

    .metric-table th {
      background: #f7f7f7;
      font-weight: 600;
    }

    .metric-table tr:last-child td {
      border-bottom: none;
    }

    /* 마지막 요소 여백 정리 */
    .section-block > :last-child {
      margin-bottom: 0;
    }

    .container > :last-child {
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      body {
        padding: 12px;
      }

      .container {
        padding: 20px 18px 24px;
      }

      .section-block {
        padding: 16px 14px 20px;
      }

      h1 {
        font-size: 1.5rem;
      }

      h2 {
        font-size: 1.15rem;
      }
    }

    /* Resizable table (FAQ 전용) */
    .metric-table--resizable th {
      position: relative;
    }

    .metric-table--resizable .col-resizer {
      position: absolute;
      top: 0;
      right: 0;
      width: 6px;
      height: 100%;
      cursor: col-resize;
      user-select: none;
    }

    .metric-table--resizable .col-resizer::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 1px;
      transform: translateX(-50%);
      background: #cccccc;
    }


  </style>
</head>
<body>
  <div class="container">
    <h1>Financial Event API - 상세 사용 가이드</h1>

    <div class="section-intro">
      <strong>API 개요:</strong> 이 API는 Financial Modeling Prep (FMP) API를 활용하여 기업 재무 이벤트 정보와 밸류에이션 지표를 제공합니다.
      실시간 주가, 재무제표 기반 정량 지표, 애널리스트 목표가 등 포괄적인 투자 의사결정 정보를 JSON 형태로 제공합니다.
    </div>

    <section class="section-block">
      <h2>설치 및 실행</h2>

      <h3>필수 요구사항</h3>
      <ul>
        <li>Node.js 18.x 이상</li>
        <li>FMP API 키 (환경변수로 설정)</li>
        <li>Git</li>
      </ul>

      <h3>설치</h3>
      <pre><code>npm install
cp .env.example .env  # FMP_API_KEY 추가</code></pre>

      <h3>로컬 실행</h3>
      <pre><code>npm run dev</code></pre>
    </section>

    <section class="section-block">
      <h2>API 엔드포인트 상세 설명</h2>

      <div class="endpoint">
        <div class="endpoint-title">1. GET /getEvent - 재무 이벤트 조회</div>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/getEvent?startDate=3&endDate=7</code>

        <h3>기능 설명</h3>
        <p>지정된 날짜 범위 내에 발생하는 기업 재무 이벤트(실적발표, 배당일 등)를 수집하여 반환합니다.</p>

        <h3>데이터 수집 프로세스</h3>
        <ul>
          <li><strong>심볼 캐시 로드:</strong> 거래 가능한 주식 심볼 목록을 <code>docs/symbolCache.json</code>에서 로드 (자동 갱신)</li>
          <li><strong>API 호출:</strong> FMP API의 여러 이벤트 서비스(<code>earnings-calendar</code>, <code>dividend-calendar</code> 등)를 병렬 호출</li>
          <li><strong>데이터 정규화:</strong> 각 서비스의 응답을 공통 포맷으로 변환 (fieldMap 사용)</li>
          <li><strong>필터링:</strong> 심볼 캐시에 존재하는 종목만 필터링</li>
          <li><strong>중복 제거:</strong> 동일 ticker + date + event 조합 제거</li>
          <li><strong>캐싱:</strong> 결과를 <code>docs/getEventCache.json</code>에 저장</li>
        </ul>

        <h3>요청 파라미터</h3>
        <ul>
          <li><code>startDate</code> (필수): 오늘로부터 N일 후 (예: 3 = 오늘+3일)</li>
          <li><code>endDate</code> (필수): 오늘로부터 N일 후 (예: 7 = 오늘+7일)</li>
          <li><code>format</code> (선택): "ndjson" 지정 시 NDJSON 스트리밍, 미지정 시 일반 JSON</li>
        </ul>

        <h3>응답 구조</h3>
        <div class="response-info">
          <strong>JSON 응답 예시:</strong>
          <pre><code>{
  "meta": {
    "type": "meta",
    "request": { "startDate": 3, "endDate": 7, "fromDate": "2025-11-30", "toDate": "2025-12-04" },
    "response": { "eventCount": 145, "duration": "2341ms", "timestamp": "2025-11-27T10:30:00.000Z" },
    "collectionErrorChecklist": { "status": [] }
  },
  "events": [
    {
      "ticker": "AAPL",
      "date": "2025-12-01",
      "event": "Earnings Release",
      "serviceId": "service-FMP-earnings-calendar"
    }
  ]
}</code></pre>
        </div>

        <h3>출력 필드 설명</h3>
        <table class="metric-table">
          <thead>
            <tr>
              <th>필드</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>ticker</code></td>
              <td>주식 티커 심볼 (예: AAPL, MSFT)</td>
            </tr>
            <tr>
              <td><code>date</code></td>
              <td>이벤트 발생 날짜 (ISO 8601 형식)</td>
            </tr>
            <tr>
              <td><code>event</code></td>
              <td>이벤트 유형 (Earnings Release, Dividend, etc.)</td>
            </tr>
            <tr>
              <td><code>serviceId</code></td>
              <td>데이터 출처 서비스 ID</td>
            </tr>
            <tr>
              <td><code>meta.eventCount</code></td>
              <td>반환된 이벤트 총 개수</td>
            </tr>
            <tr>
              <td><code>meta.duration</code></td>
              <td>API 처리 시간</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="endpoint">
        <div class="endpoint-title">2. GET /getEventLatest - 캐시된 이벤트 조회</div>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/getEventLatest</code>

        <h3>기능 설명</h3>
        <p>가장 최근에 <code>/getEvent</code>로 수집된 이벤트 캐시를 즉시 반환합니다. API 호출 없이 빠른 응답이 필요할 때 사용합니다.</p>

        <h3>데이터 처리 프로세스</h3>
        <ul>
          <li><code>docs/getEventCache.json</code> 파일 읽기</li>
          <li>JSON 파싱 및 유효성 검증</li>
          <li>캐시 데이터 반환</li>
        </ul>

        <h3>주의사항</h3>
        <div class="note">
          <ul>
            <li>캐시 파일이 없으면 404 에러 반환 → 먼저 <code>/getEvent</code> 호출 필요</li>
            <li>캐시 데이터는 최근 <code>/getEvent</code> 호출 시점의 스냅샷</li>
            <li>실시간 데이터가 필요하면 <code>/getEvent</code> 사용</li>
          </ul>
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-title">3. GET /getValuation - 밸류에이션 지표 계산</div>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/getValuation?tickers=AAPL,MSFT&cache=false</code>

        <h3>기능 설명</h3>
        <p>지정된 종목의 현재가, 정량적 밸류에이션 지표, 동종업계 평균, 애널리스트 목표가를 종합적으로 계산하여 제공합니다.</p>

        <h3>데이터 수집 및 계산 프로세스</h3>
        <ul>
          <li><strong>현재가 조회:</strong> 장중에는 실시간 호가, 장외시간에는 Pre/Post Market API 사용</li>
          <li><strong>재무 데이터 수집:</strong> 최근 4분기 손익계산서 + 재무상태표 조회</li>
          <li><strong>정량 지표 계산:</strong> 수집된 재무 데이터로 PBR, PER, ROE 등 계산</li>
          <li><strong>Peer 분석:</strong> 동종업계 티커 조회 → 각 Peer의 정량 지표 계산 → 평균값 산출</li>
          <li><strong>정성 지표 수집:</strong> 애널리스트 컨센서스 목표가 및 통계 조회</li>
        </ul>

        <h3>요청 파라미터</h3>
        <ul>
          <li><code>cache=false</code> 모드:
            <ul>
              <li><code>tickers</code> (필수): 쉼표로 구분된 티커 목록 (예: "AAPL,MSFT,GOOGL")</li>
            </ul>
          </li>
          <li><code>cache=true</code> 모드:
            <ul>
              <li>이벤트 캐시에서 티커 목록 자동 추출</li>
              <li><code>tickers</code> 파라미터 무시</li>
            </ul>
          </li>
        </ul>

        <h3>정량적 지표 (Quantitative Metrics) - 계산 수식</h3>

        <h4>밸류에이션 배수</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 수식</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PBR</strong></td>
              <td><code>시가총액 / 자기자본(최근분기)</code></td>
              <td>주가순자산비율. 낮을수록 저평가 (1 미만 = 청산가치 이하)</td>
            </tr>
            <tr>
              <td><strong>PSR</strong></td>
              <td><code>시가총액 / 매출(TTM)</code></td>
              <td>주가매출비율. 적자기업 평가에 유용</td>
            </tr>
            <tr>
              <td><strong>PER</strong></td>
              <td><code>시가총액 / 순이익(TTM)</code></td>
              <td>주가수익비율. 업종별 평균과 비교 필수</td>
            </tr>
            <tr>
              <td><strong>EV/EBITDA</strong></td>
              <td><code>(시가총액 + 총부채 - 현금) / EBITDA(TTM)</code></td>
              <td>기업가치 대비 영업현금흐름. 자본구조 차이 보정</td>
            </tr>
          </tbody>
        </table>

        <h4>수익성 지표</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 수식</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ROE</strong></td>
              <td><code>순이익(TTM) / 평균자기자본</code></td>
              <td>자기자본이익률. 15% 이상이면 우량 (업종별 차이 존재)</td>
            </tr>
            <tr>
              <td><strong>GrossMarginTTM</strong></td>
              <td><code>매출총이익(TTM) / 매출(TTM)</code></td>
              <td>매출총이익률. 제품/서비스의 가격경쟁력</td>
            </tr>
            <tr>
              <td><strong>OperatingMarginTTM</strong></td>
              <td><code>영업이익(TTM) / 매출(TTM)</code></td>
              <td>영업이익률. 본업 수익성 평가</td>
            </tr>
            <tr>
              <td><strong>RNDIntensityTTM</strong></td>
              <td><code>연구개발비(TTM) / 매출(TTM)</code></td>
              <td>R&D 집약도. 기술기업은 높은 경향</td>
            </tr>
          </tbody>
        </table>

        <h4>성장성 지표</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 수식</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>RevenueGrowthYoY</strong></td>
              <td><code>(Q0 - Q4) / Q4</code></td>
              <td>매출 전년동기대비 성장률</td>
            </tr>
            <tr>
              <td><strong>RevenueGrowthQoQ</strong></td>
              <td><code>(Q0 - Q1) / Q1</code></td>
              <td>매출 전분기대비 성장률</td>
            </tr>
            <tr>
              <td><strong>NetIncomeGrowthYoY</strong></td>
              <td><code>(순이익Q0 - 순이익Q4) / 순이익Q4</code></td>
              <td>순이익 전년동기대비 성장률</td>
            </tr>
            <tr>
              <td><strong>EBITDAGrowthYoY</strong></td>
              <td><code>(EBITDAQ0 - EBITDAQ4) / EBITDAQ4</code></td>
              <td>EBITDA 전년동기대비 성장률</td>
            </tr>
          </tbody>
        </table>

        <h4>재무안정성 지표</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 수식</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>CurrentRatio</strong></td>
              <td><code>유동자산(최근) / 유동부채(최근)</code></td>
              <td>유동비율. 1.5 이상이면 단기지급능력 양호</td>
            </tr>
            <tr>
              <td><strong>DebtToEquityAvg</strong></td>
              <td><code>평균총부채 / 평균자기자본</code></td>
              <td>부채비율. 1 이하면 안정적 (업종별 차이 존재)</td>
            </tr>
            <tr>
              <td><strong>NetDebtToEquityAvg</strong></td>
              <td><code>평균순부채 / 평균자기자본</code></td>
              <td>순부채비율. 현금 보유를 반영한 실질 레버리지</td>
            </tr>
            <tr>
              <td><strong>CashToRevenueTTM</strong></td>
              <td><code>현금및단기투자(최근) / 매출(TTM)</code></td>
              <td>현금보유 수준. 높을수록 위기대응력 강함</td>
            </tr>
            <tr>
              <td><strong>RunwayYears</strong></td>
              <td><code>현금및단기투자 / |영업손실(TTM)|</code> (영업손실 시에만)</td>
              <td>적자 지속 가능 기간(년). 스타트업 평가에 중요</td>
            </tr>
          </tbody>
        </table>

        <div class="note">
          <strong>TTM (Trailing Twelve Months) 계산 방식:</strong>
          <ul>
            <li>4개 분기 데이터가 모두 있으면: <code>Q0 + Q1 + Q2 + Q3</code></li>
            <li>일부 분기 누락 시: <code>(사용 가능한 분기 평균) × 4</code></li>
            <li>예: 3개 분기만 있으면 → <code>(Q0 + Q1 + Q2) / 3 × 4</code></li>
          </ul>
        </div>

        <h3>Peer 정량 지표 (peerQuantitative)</h3>
        <div class="step-process">
          <strong>계산 프로세스:</strong>
          <ul>
            <li>FMP Peer API로 동종업계 티커 목록 조회 (예: AAPL → [MSFT, GOOGL, META])</li>
            <li>각 Peer 티커의 정량 지표 개별 계산</li>
            <li>각 지표별 평균값 산출 (null 값 제외)</li>
            <li><code>peerCount</code>: 계산에 사용된 Peer 수</li>
            <li><code>peerList</code>: Peer 티커 목록</li>
          </ul>
          <strong>활용 방법:</strong> 대상 종목의 정량 지표와 비교하여 업종 내 상대적 위치 파악
        </div>

        <h3>정성적 지표 (Qualitative Metrics)</h3>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>데이터 출처</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ConsensusTargetPrice</strong></td>
              <td>FMP Price Target Consensus API</td>
              <td>
                <code>targetConsensus</code>: 애널리스트 평균 목표가<br>
                <code>targetHigh</code>: 최고 목표가<br>
                <code>targetLow</code>: 최저 목표가<br>
                <code>targetMedian</code>: 중간값 목표가
              </td>
            </tr>
            <tr>
              <td><strong>PriceTargetSummary</strong></td>
              <td>FMP Price Target Summary API</td>
              <td>
                기간별 목표가 통계 (lastMonth, lastQuarter, lastYear, allTime)<br>
                각 기간별 평균, 중간값, 최고/최저 목표가 포함
              </td>
            </tr>
          </tbody>
        </table>

        <h3>Price (현재가)</h3>
        <div class="response-info">
          <strong>조회 로직:</strong>
          <ul>
            <li><strong>정규 장중 (9:30 AM - 4:00 PM ET):</strong> Quote API 사용 (실시간 호가)</li>
            <li><strong>장외 시간 (Pre/Post Market):</strong> Pre-Post Market API 사용</li>
            <li>타임존: 미국 동부시간(ET) 기준으로 판단</li>
          </ul>
        </div>

        <h3>응답 구조 예시</h3>
        <div class="response-info">
          <pre><code>{
  "meta": {
    "request": { "cache": false, "tickers": ["AAPL"], "tickerCount": 1 },
    "response": { "valuationCount": 1, "duration": "1523ms" }
  },
  "valuations": [
    {
      "ticker": "AAPL",
      "price": 189.25,
      "quantitative": {
        "PBR": 45.2, "PSR": 7.8, "PER": 29.3, "ROE": 1.47,
        "RevenueGrowthYoY": 0.06, "GrossMarginTTM": 0.46
      },
      "peerQuantitative": {
        "PBR": 38.5, "PSR": 6.2, "PER": 25.1,
        "peerCount": 3, "peerList": ["MSFT", "GOOGL", "META"]
      },
      "qualitative": {
        "ConsensusTargetPrice": {
          "targetConsensus": 195.50, "targetHigh": 220, "targetLow": 170
        }
      }
    }
  ]
}</code></pre>
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-title">4. GET /refreshAnalystLog - 애널리스트 로그 갱신</div>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/refreshAnalystLog</code>

        <h3>기능 설명</h3>
        <p>애널리스트 목표가 데이터를 수집하고, 과거 주가 추세(priceTrend)를 채워서 <code>docs/analystLog.json</code>을 생성/업데이트합니다.</p>

        <h3>3단계 처리 프로세스</h3>
        <div class="step-process">
          <strong>1단계: priceTarget=true (애널리스트 목표가 수집)</strong>
          <ul>
            <li>FMP Analyst Estimates API 호출</li>
            <li>기존 analystLog.json과 병합 (과거 데이터 보존)</li>
            <li>각 티커별 최신 목표가 데이터 추가</li>
          </ul>

          <strong>2단계: frame=true (priceTrend 구조 초기화)</strong>
          <ul>
            <li>priceTrend 필드가 없는 레코드에 D1~D365 null 값으로 초기화</li>
            <li>D1 = 목표가 발표일 주가, D7 = 7일 후, ..., D365 = 1년 후</li>
          </ul>

          <strong>3단계: quote=true (과거 주가 데이터 채우기)</strong>
          <ul>
            <li>FMP Historical Price API로 과거 주가 조회</li>
            <li>null인 priceTrend 값만 채우기 (기존 데이터 보존)</li>
            <li>D1, D7, D30, D90, D180, D365 등 주요 시점 주가 기록</li>
          </ul>
        </div>

        <h3>요청 파라미터</h3>
        <ul>
          <li><code>priceTarget=true</code>: 1단계만 실행</li>
          <li><code>frame=true</code>: 2단계만 실행</li>
          <li><code>quote=true</code>: 3단계만 실행</li>
          <li>파라미터 없음: 1+2+3 순차 실행 (기본값)</li>
          <li><code>tickers=AAPL,MSFT</code>: 특정 티커만 처리</li>
          <li><code>test=true</code>: 상위 10개 티커만 처리 (테스트용)</li>
          <li><code>generateRating=false</code>: 완료 후 Rating 생성 생략</li>
        </ul>

        <h3>출력 파일</h3>
        <ul>
          <li><code>docs/analystLog.json</code>: 애널리스트 목표가 + 과거 주가 추세 데이터</li>
          <li><code>docs/analystRating.json</code>: 생성된 등급 (generateRating=true 시)</li>
        </ul>

        <div class="note">
          <strong>API 호출량 주의:</strong> 티커가 많으면 수백~수천 건의 API 호출이 발생할 수 있습니다.
          처음 실행 시 <code>test=true</code>로 소량 테스트 후 전체 실행 권장.
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-title">5. GET /generateRating - 애널리스트 등급 생성</div>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/generateRating</code>

        <h3>기능 설명</h3>
        <p>기존 <code>analystLog.json</code>을 읽어서 애널리스트 등급 데이터(<code>analystRating.json</code>)를 생성합니다.
        추가 API 호출 없이 캐시 데이터만 사용하므로 빠르고 Rate Limit 걱정이 없습니다.</p>

        <h3>처리 프로세스</h3>
        <ul>
          <li><code>docs/analystLog.json</code> 읽기</li>
          <li>목표가와 실제 주가 변동 비교</li>
          <li>애널리스트 예측 정확도 평가</li>
          <li><code>docs/analystRating.json</code> 저장</li>
        </ul>

        <h3>사용 시나리오</h3>
        <ul>
          <li><code>/refreshAnalystLog</code> 완료 후 Rating만 재생성하고 싶을 때</li>
          <li>Rating 계산 로직 변경 후 재계산</li>
          <li>API 호출 없이 빠른 결과 확인</li>
        </ul>
      </div>
    </section>

    <section class="section-block">
      <h2>테스트 실행</h2>
      <pre><code>npm test                    # 전체 테스트
npm run test:unit           # 단위 테스트
npm run test:integration    # 통합 테스트
npm run test:contract       # 계약 테스트
npm run test:coverage       # 커버리지 리포트</code></pre>
    </section>

    <section class="section-block">
      <h2>문제 해결</h2>
      <ul>
        <li><strong>503 Service Unavailable:</strong> <code>docs/</code> 디렉토리에 캐시 파일 존재 확인</li>
        <li><strong>401 Unauthorized:</strong> <code>.env</code> 파일의 <code>FMP_API_KEY</code> 유효성 확인</li>
        <li><strong>빈 응답:</strong> 응답 내 <code>collectionErrorChecklist</code> 확인</li>
        <li><strong>Rate Limit 초과:</strong> <code>/getEventLatest</code>, <code>/generateRating</code> 등 캐시 기반 API 사용</li>
      </ul>
    </section>

    <section class="section-block">
      <h2>프로젝트 구조 및 설정 파일</h2>

      <h3>디렉토리 구조 개요</h3>
      <pre><code>getEvents/
├── src/                        # 소스 코드 루트
│   ├── api/                    # API 레이어
│   │   ├── endpoints/          # 엔드포인트 핸들러
│   │   └── middleware/         # Express 미들웨어
│   ├── services/               # 비즈니스 로직 서비스
│   ├── models/                 # 데이터 모델 및 스키마
│   ├── lib/                    # 공통 유틸리티
│   └── index.js                # Express 앱 진입점
├── tests/                      # 테스트 파일
│   ├── contract/               # 계약 테스트 (API 응답 검증)
│   ├── integration/            # 통합 테스트 (엔드포인트 테스트)
│   └── unit/                   # 단위 테스트 (함수 단위)
├── docs/                       # 데이터 및 설정 파일
│   ├── config/                 # 설정 파일 디렉토리
│   ├── symbolCache.json        # 티커 심볼 캐시
│   ├── getEventCache.json      # 이벤트 데이터 캐시
│   ├── analystLog.json         # 애널리스트 목표가 로그
│   └── analystRating.json      # 애널리스트 등급 데이터
└── .env                        # 환경 변수 (FMP_API_KEY)</code></pre>

      <h3>1. API 엔드포인트 (src/api/endpoints/)</h3>
      <table class="metric-table metric-table--resizable" id="api-endpoints-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>역할</th>
            <th>주요 기능</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>getEvent.js</code></td>
            <td>재무 이벤트 조회</td>
            <td>
              - FMP API 여러 서비스 병렬 호출<br>
              - 데이터 정규화 및 중복 제거<br>
              - NDJSON/JSON 형식 응답<br>
              - 결과 캐싱 (getEventCache.json)
            </td>
          </tr>
          <tr>
            <td><code>getEventLatest.js</code></td>
            <td>캐시된 이벤트 반환</td>
            <td>
              - getEventCache.json 직접 읽기<br>
              - API 호출 없이 즉시 응답<br>
              - 파일 존재 여부 검증
            </td>
          </tr>
          <tr>
            <td><code>getValuation.js</code></td>
            <td>밸류에이션 지표 계산</td>
            <td>
              - 현재가 조회 (Quote/Pre-Post API)<br>
              - 재무제표 데이터 수집<br>
              - 정량 지표 계산 (PBR, PER, ROE 등)<br>
              - Peer 분석 및 평균 계산<br>
              - 정성 지표 수집 (애널리스트 컨센서스)
            </td>
          </tr>
          <tr>
            <td><code>refreshAnalystLog.js</code></td>
            <td>애널리스트 로그 갱신</td>
            <td>
              - 애널리스트 목표가 수집 (priceTarget)<br>
              - priceTrend 구조 초기화 (frame)<br>
              - 과거 주가 데이터 채우기 (quote)<br>
              - 3단계 프로세스 개별/통합 실행
            </td>
          </tr>
          <tr>
            <td><code>generateRating.js</code></td>
            <td>애널리스트 등급 생성</td>
            <td>
              - analystLog.json 읽기<br>
              - 예측 정확도 평가<br>
              - analystRating.json 저장<br>
              - API 호출 없이 캐시 기반 처리
            </td>
          </tr>
          <tr>
            <td><code>apiGuide.js</code></td>
            <td>API 문서 제공</td>
            <td>
              - HTML 가이드 문서 서빙<br>
              - 엔드포인트 사용법 설명<br>
              - 예제 및 필드 설명
            </td>
          </tr>
        </tbody>
      </table>

      <h3>2. 서비스 레이어 (src/services/)</h3>
      <table class="metric-table metric-table--resizable" id="service-layer-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>역할</th>
            <th>주요 함수</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>fmpClient.js</code></td>
            <td>FMP API 클라이언트</td>
            <td>
              - <code>fetchFMP(endpoint, params)</code>: FMP API 호출<br>
              - axios 기반 HTTP 요청<br>
              - axios-retry로 재시도 로직<br>
              - Rate limiting 처리<br>
              - 에러 핸들링 및 로깅
            </td>
          </tr>
          <tr>
            <td><code>cacheManager.js</code></td>
            <td>캐시 관리</td>
            <td>
              - <code>refreshSymbolCache()</code>: 심볼 캐시 갱신<br>
              - <code>loadSymbolCache()</code>: 캐시 로드<br>
              - <code>saveEventCache(data)</code>: 이벤트 캐시 저장<br>
              - 캐시 만료 시간 검증<br>
              - JSON 파일 읽기/쓰기
            </td>
          </tr>
          <tr>
            <td><code>eventNormalizer.js</code></td>
            <td>데이터 정규화</td>
            <td>
              - <code>normalizeEvent(rawData, serviceId)</code><br>
              - API 응답을 공통 스키마로 변환<br>
              - fieldMap 기반 필드 매핑<br>
              - 날짜 형식 표준화 (UTC)<br>
              - null/undefined 처리
            </td>
          </tr>
        </tbody>
      </table>

      <h3>3. 데이터 모델 (src/models/)</h3>
      <table class="metric-table metric-table--resizable" id="data-model-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>내용</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>schemas.js</code></td>
            <td>
              - JSON Schema 정의<br>
              - EventRecord 스키마<br>
              - ValuationRecord 스키마<br>
              - 입력 검증 규칙<br>
              - 필수/선택 필드 정의
            </td>
          </tr>
          <tr>
            <td><code>types.js</code></td>
            <td>
              - JSDoc 타입 정의<br>
              - TypeScript 스타일 타입 힌트<br>
              - 함수 파라미터 타입 문서화<br>
              - IDE 자동완성 지원
            </td>
          </tr>
        </tbody>
      </table>

      <h3>4. 공통 유틸리티 (src/lib/)</h3>
      <table class="metric-table metric-table--resizable" id="utility-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>주요 함수</th>
            <th>용도</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>configLoader.js</code></td>
            <td>
              - <code>loadApiList()</code><br>
              - <code>loadEvMethod()</code><br>
              - <code>validateConfig()</code>
            </td>
            <td>
              설정 파일(ApiList.json, evMethod.json) 로드 및 검증
            </td>
          </tr>
          <tr>
            <td><code>dateUtils.js</code></td>
            <td>
              - <code>addDays(date, days)</code><br>
              - <code>formatISO(date)</code><br>
              - <code>parseUTC(dateString)</code><br>
              - <code>isMarketOpen()</code>
            </td>
            <td>
              UTC 날짜 계산, ISO 8601 포맷팅, 장중/장외 시간 판단
            </td>
          </tr>
          <tr>
            <td><code>ndJsonStreamer.js</code></td>
            <td>
              - <code>streamNDJSON(res, data)</code><br>
              - <code>writeNDJSONLine(res, obj)</code>
            </td>
            <td>
              NDJSON 형식 스트리밍 응답 처리
            </td>
          </tr>
        </tbody>
      </table>

      <h3>5. 미들웨어 (src/api/middleware/)</h3>
      <table class="metric-table metric-table--resizable" id="middleware-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>역할</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>errorHandler.js</code></td>
            <td>
              - 전역 에러 핸들링<br>
              - HTTP 상태 코드 매핑<br>
              - 에러 응답 포맷 통일<br>
              - 스택 트레이스 로깅 (개발 환경)
            </td>
          </tr>
          <tr>
            <td><code>logger.js</code></td>
            <td>
              - 요청/응답 로깅<br>
              - API 호출 메트릭 수집<br>
              - 구조화된 JSON 로그<br>
              - 레이턴시 측정
            </td>
          </tr>
        </tbody>
      </table>

      <h3>6. 설정 파일 (docs/config/)</h3>

      <h4>ApiList.json - API 서비스 정의</h4>
      <div class="note">
        <strong>구조:</strong>
        <pre><code>{
  "services": [
    {
      "id": "service-FMP-earnings-calendar",
      "provider": "FMP",
      "endpoint": "/v3/earning-calendar",
      "fieldMap": {
        "ticker": "symbol",
        "date": "date",
        "event": "'Earnings Release'"
      },
      "rateLimit": {
        "maxConcurrent": 4,
        "delayMs": 250
      }
    }
  ]
}</code></pre>
        <strong>필드 설명:</strong>
        <ul>
          <li><code>id</code>: 서비스 고유 식별자 (응답의 serviceId로 사용)</li>
          <li><code>provider</code>: API 제공자 (FMP, Yahoo, etc.)</li>
          <li><code>endpoint</code>: API 엔드포인트 경로</li>
          <li><code>fieldMap</code>: API 응답 필드를 내부 스키마로 매핑
            <ul>
              <li><code>"ticker": "symbol"</code> → API의 "symbol" 필드를 "ticker"로 매핑</li>
              <li><code>"event": "'Earnings Release'"</code> → 고정값 설정 (작은따옴표 사용)</li>
            </ul>
          </li>
          <li><code>rateLimit</code>: API 호출 제한 설정</li>
        </ul>
      </div>

      <h4>evMethod.json - 지표 계산 정의</h4>
      <div class="note">
        <strong>구조:</strong>
        <pre><code>{
  "quantitative": {
    "PBR": {
      "formula": "marketCap / equity",
      "description": "Price to Book Ratio",
      "category": "valuation",
      "dataSources": ["quote", "balance-sheet"]
    },
    "ROE": {
      "formula": "netIncomeTTM / avgEquity",
      "description": "Return on Equity",
      "category": "profitability",
      "dataSources": ["income-statement", "balance-sheet"]
    }
  },
  "ttmCalculation": {
    "method": "quarterSum",
    "fallback": "scaledAverage",
    "minQuarters": 1
  }
}</code></pre>
        <strong>필드 설명:</strong>
        <ul>
          <li><code>formula</code>: 계산 공식 (변수는 재무제표 필드명)</li>
          <li><code>description</code>: 지표 설명</li>
          <li><code>category</code>: 지표 분류 (valuation, profitability, growth, stability)</li>
          <li><code>dataSources</code>: 필요한 FMP API 엔드포인트 목록</li>
          <li><code>ttmCalculation</code>: TTM 계산 방식
            <ul>
              <li><code>quarterSum</code>: 4분기 합산</li>
              <li><code>scaledAverage</code>: 부분 분기 데이터 스케일링</li>
            </ul>
          </li>
        </ul>
      </div>

      <h3>7. 캐시 파일 (docs/)</h3>
      <table class="metric-table metric-table--resizable" id="cache-files-table">
        <thead>
          <tr>
            <th>파일명</th>
            <th>생성 시점</th>
            <th>내용</th>
            <th>갱신 주기</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>symbolCache.json</code></td>
            <td>첫 API 호출 시</td>
            <td>
              거래 가능한 티커 목록<br>
              <code>[{ "symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "sector": "Technology" }]</code>
            </td>
            <td>24시간</td>
          </tr>
          <tr>
            <td><code>getEventCache.json</code></td>
            <td>/getEvent 호출 시</td>
            <td>
              재무 이벤트 데이터 캐시<br>
              <code>{ "meta": {...}, "events": [...] }</code>
            </td>
            <td>매 요청마다 갱신</td>
          </tr>
          <tr>
            <td><code>analystLog.json</code></td>
            <td>/refreshAnalystLog 호출 시</td>
            <td>
              애널리스트 목표가 + 과거 주가 추세<br>
              <code>[{ "ticker": "AAPL", "date": "2025-11-01", "targetPrice": 195, "priceTrend": { "D1": 189, "D30": 192 } }]</code>
            </td>
            <td>수동 갱신</td>
          </tr>
          <tr>
            <td><code>analystRating.json</code></td>
            <td>/generateRating 호출 시</td>
            <td>
              애널리스트 예측 정확도 등급<br>
              <code>[{ "analyst": "John Doe", "accuracy": 0.85, "rating": "A" }]</code>
            </td>
            <td>수동 갱신</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="section-block">
      <h2>추가 리소스</h2>

      <h3>FMP API 주요 엔드포인트</h3>
      <table class="metric-table metric-table--resizable" id="major-endpoints-table">
        <thead>
          <tr>
            <th>카테고리</th>
            <th>엔드포인트</th>
            <th>용도</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="3">이벤트</td>
            <td><code>/v3/earning-calendar</code></td>
            <td>실적발표 일정</td>
          </tr>
          <tr>
            <td><code>/v3/stock-dividend-calendar</code></td>
            <td>배당 일정</td>
          </tr>
          <tr>
            <td><code>/v3/stock-split-calendar</code></td>
            <td>주식분할 일정</td>
          </tr>
          <tr>
            <td rowspan="4">재무제표</td>
            <td><code>/v3/income-statement/{ticker}</code></td>
            <td>손익계산서 (분기/연간)</td>
          </tr>
          <tr>
            <td><code>/v3/balance-sheet-statement/{ticker}</code></td>
            <td>재무상태표 (분기/연간)</td>
          </tr>
          <tr>
            <td><code>/v3/cash-flow-statement/{ticker}</code></td>
            <td>현금흐름표 (분기/연간)</td>
          </tr>
          <tr>
            <td><code>/v3/ratios-ttm/{ticker}</code></td>
            <td>TTM 재무비율</td>
          </tr>
          <tr>
            <td rowspan="3">주가</td>
            <td><code>/v3/quote/{ticker}</code></td>
            <td>실시간 호가 (장중)</td>
          </tr>
          <tr>
            <td><code>/v4/pre-post-market/{ticker}</code></td>
            <td>프리/포스트 마켓 가격</td>
          </tr>
          <tr>
            <td><code>/v3/historical-price-full/{ticker}</code></td>
            <td>과거 주가 (일/주/월)</td>
          </tr>
          <tr>
            <td rowspan="3">애널리스트</td>
            <td><code>/v4/price-target-consensus</code></td>
            <td>목표가 컨센서스</td>
          </tr>
          <tr>
            <td><code>/v4/price-target-summary</code></td>
            <td>목표가 통계 (기간별)</td>
          </tr>
          <tr>
            <td><code>/v3/analyst-estimates/{ticker}</code></td>
            <td>애널리스트 추정치</td>
          </tr>
          <tr>
            <td rowspan="2">기업 정보</td>
            <td><code>/v3/stock-peers</code></td>
            <td>동종업계 Peer 목록</td>
          </tr>
          <tr>
            <td><code>/v3/stock/list</code></td>
            <td>전체 거래 가능 종목 목록</td>
          </tr>
        </tbody>
      </table>

      <h3>자주 묻는 질문 (FAQ)</h3>
      <table class="metric-table metric-table--resizable" id="faq-table">
        <thead>
          <tr>
            <th>질문</th>
            <th>답변</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>FMP API 무료 플랜으로 충분한가요?</td>
            <td>
              무료 플랜(250 req/day)은 테스트용입니다.
              <code>/getValuation</code>은 티커당 5~10개 API 호출이 필요하므로,
              실사용 시 Starter 플랜($14/월, 250 req/min) 이상 권장합니다.
            </td>
          </tr>
          <tr>
            <td>캐시 파일이 커지면 성능 문제가 생기나요?</td>
            <td>
              <code>symbolCache.json</code>은 ~3만 티커 기준 5MB 정도이며,
              <code>getEventCache.json</code>은 날짜 범위에 따라 1~10MB입니다.
              Node.js는 100MB 이하 JSON 파일을 빠르게 처리하므로 문제없습니다.
            </td>
          </tr>
          <tr>
            <td>애널리스트 로그 갱신 시 API 호출량은?</td>
            <td>
              티커당 2~3개 API 호출 (목표가 + 과거 주가).
              1,000개 티커 = 약 2,000~3,000 req.
              처음엔 <code>test=true</code>로 10개만 테스트 후 진행하세요.
            </td>
          </tr>
          <tr>
            <td>NDJSON 형식이 왜 필요한가요?</td>
            <td>
              대량 이벤트 데이터(1만+ 레코드)를 한 번에 메모리 로드하면
              응답 지연이 발생합니다. NDJSON은 스트리밍 방식으로
              클라이언트가 데이터를 즉시 소비할 수 있어 UX가 향상됩니다.
            </td>
          </tr>
          <tr>
            <td>Peer 평균 계산 시 특정 Peer만 선택할 수 있나요?</td>
            <td>
              현재는 FMP Peer API가 반환하는 모든 Peer를 사용합니다.
              커스텀 Peer 리스트가 필요하면
              <code>docs/config/customPeers.json</code> 파일을 추가하고
              <code>getValuation.js</code>를 수정해야 합니다.
            </td>
          </tr>
        </tbody>
      </table>

    </section>
</div>
</body>


  <script>
    (function () {
      var STORAGE_PREFIX = 'metricTableColumnWidths:';

      function getStorageKey(table) {
        // 각 테이블마다 다른 key를 사용 (id 기준)
        var id = table.id || table.getAttribute('data-resize-id');
        if (!id) {
          // id가 없다면 DOM 상 index로 fallback (가능하면 id 쓰는 걸 추천)
          var all = Array.prototype.slice.call(
            document.querySelectorAll('.metric-table--resizable')
          );
          id = 'table-' + all.indexOf(table);
        }
        return STORAGE_PREFIX + id;
      }

      function ensureColgroup(table) {
        var colgroup = table.querySelector('colgroup');
        var headerRow = table.querySelector('thead tr');
        if (!headerRow) return null;

        var headerCells = headerRow.querySelectorAll('th, td');

        if (!colgroup) {
          colgroup = document.createElement('colgroup');
          headerCells.forEach(function (_, index) {
            var col = document.createElement('col');
            col.setAttribute('data-col', index);
            colgroup.appendChild(col);
          });
          // thead 앞에 colgroup 삽입
          table.insertBefore(colgroup, table.firstChild);
        } else {
          var existingCols = colgroup.querySelectorAll('col');
          // th 개수보다 col이 부족하면 추가
          for (var i = existingCols.length; i < headerCells.length; i++) {
            var col = document.createElement('col');
            col.setAttribute('data-col', i);
            colgroup.appendChild(col);
          }
        }

        return table.querySelectorAll('colgroup col');
      }

      function applySavedWidths(table, cols) {
        if (!window.localStorage || !cols) return;
        var key = getStorageKey(table);
        var saved = window.localStorage.getItem(key);
        if (!saved) return;

        try {
          var widths = JSON.parse(saved);
          cols.forEach(function (col, index) {
            if (widths[index]) {
              col.style.width = widths[index];
            }
          });
        } catch (e) {
          console.warn('Invalid saved widths for', key, e);
        }
      }

      function saveWidths(table, cols) {
        if (!window.localStorage || !cols) return;
        var key = getStorageKey(table);
        var widths = Array.prototype.map.call(cols, function (col) {
          return col.style.width || '';
        });
        window.localStorage.setItem(key, JSON.stringify(widths));
      }

      function makeResizable(table) {
        var headerCells = table.querySelectorAll('thead th');
        if (!headerCells.length) return;

        var cols = ensureColgroup(table);
        if (!cols || cols.length !== headerCells.length) return;

        headerCells.forEach(function (th, index) {
          // 마지막 컬럼은 리사이저 안 붙임
          if (index === headerCells.length - 1) return;

          var resizer = document.createElement('span');
          resizer.className = 'col-resizer';
          th.appendChild(resizer);

          var startX = 0;
          var startWidth = 0;

          function onMouseMove(e) {
            var dx = e.clientX - startX;
            var newWidthPx = Math.max(80, startWidth + dx);
            var tableWidth = table.getBoundingClientRect().width;
            var percent = (newWidthPx / tableWidth) * 100;
            cols[index].style.width = percent + '%';
          }

          function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveWidths(table, cols);
          }

          resizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            startX = e.clientX;
            startWidth = th.getBoundingClientRect().width;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          });
        });

        // 저장된 폭 반영
        applySavedWidths(table, cols);
      }

      window.addEventListener('DOMContentLoaded', function () {
        // metric-table--resizable 이 붙은 모든 표에 적용
        var tables = document.querySelectorAll('.metric-table--resizable');
        tables.forEach(function (table) {
          makeResizable(table);
        });
      });
    })();
  </script>



</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
