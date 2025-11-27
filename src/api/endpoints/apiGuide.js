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

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Malgun Gothic', sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
      font-size: 2em;
    }

    h2 {
      color: #2c3e50;
      margin-top: 40px;
      margin-bottom: 15px;
      font-size: 1.5em;
      border-left: 4px solid #3498db;
      padding-left: 10px;
    }

    h3 {
      color: #34495e;
      margin-top: 25px;
      margin-bottom: 12px;
      font-size: 1.2em;
      font-weight: 600;
    }

    h4 {
      color: #555;
      margin-top: 15px;
      margin-bottom: 8px;
      font-size: 1em;
      font-weight: 600;
    }

    ul {
      margin-left: 20px;
      margin-bottom: 15px;
    }

    li {
      margin-bottom: 8px;
    }

    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 15px 0;
      font-size: 0.9em;
    }

    code {
      font-family: 'Courier New', Courier, monospace;
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }

    pre code {
      background: transparent;
      padding: 0;
    }

    .endpoint {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid #3498db;
    }

    .endpoint-title {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 12px;
      font-size: 1.1em;
    }

    .endpoint-url {
      background: #2c3e50;
      color: #3498db;
      padding: 8px 12px;
      border-radius: 3px;
      display: inline-block;
      margin: 8px 0;
      font-family: monospace;
      cursor: pointer;
      transition: background 0.3s;
    }

    .endpoint-url:hover {
      background: #34495e;
    }

    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
      border-radius: 3px;
    }

    .response-info {
      background: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      margin: 15px 0;
      border-radius: 3px;
    }

    .step-process {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 15px 0;
      border-radius: 3px;
    }

    .formula {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      padding: 15px;
      margin: 15px 0;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
    }

    .metric-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    .metric-table th,
    .metric-table td {
      border: 1px solid #dee2e6;
      padding: 10px;
      text-align: left;
    }

    .metric-table th {
      background: #f8f9fa;
      font-weight: 600;
    }

    .metric-table tr:nth-child(even) {
      background: #f8f9fa;
    }

    a {
      color: #3498db;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .section-desc {
      color: #555;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Financial Event API - 상세 사용 가이드</h1>

    <div class="section-desc">
      <strong>API 개요:</strong> 이 API는 Financial Modeling Prep (FMP) API를 활용하여 기업 재무 이벤트 정보와 밸류에이션 지표를 제공합니다.
      실시간 주가, 재무제표 기반 정량 지표, 애널리스트 목표가 등 포괄적인 투자 의사결정 정보를 JSON 형태로 제공합니다.
    </div>

    <h2>🔧 설치 및 실행</h2>

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

    <h2>📡 API 엔드포인트 상세 설명</h2>

    <div class="endpoint">
      <div class="endpoint-title">1. GET /getEvent - 재무 이벤트 조회</div>
      <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">http://localhost:3000/getEvent?startDate=3&endDate=7</code>

      <h3>📌 기능 설명</h3>
      <p>지정된 날짜 범위 내에 발생하는 기업 재무 이벤트(실적발표, 배당일 등)를 수집하여 반환합니다.</p>

      <h3>🔄 데이터 수집 프로세스</h3>
      <ol>
        <li><strong>심볼 캐시 로드:</strong> 거래 가능한 주식 심볼 목록을 <code>docs/symbolCache.json</code>에서 로드 (자동 갱신)</li>
        <li><strong>API 호출:</strong> FMP API의 여러 이벤트 서비스(<code>earnings-calendar</code>, <code>dividend-calendar</code> 등)를 병렬 호출</li>
        <li><strong>데이터 정규화:</strong> 각 서비스의 응답을 공통 포맷으로 변환 (fieldMap 사용)</li>
        <li><strong>필터링:</strong> 심볼 캐시에 존재하는 종목만 필터링</li>
        <li><strong>중복 제거:</strong> 동일 ticker + date + event 조합 제거</li>
        <li><strong>캐싱:</strong> 결과를 <code>docs/getEventCache.json</code>에 저장</li>
      </ol>

      <h3>📥 요청 파라미터</h3>
      <ul>
        <li><code>startDate</code> (필수): 오늘로부터 N일 후 (예: 3 = 오늘+3일)</li>
        <li><code>endDate</code> (필수): 오늘로부터 N일 후 (예: 7 = 오늘+7일)</li>
        <li><code>format</code> (선택): "ndjson" 지정 시 NDJSON 스트리밍, 미지정 시 일반 JSON</li>
      </ul>

      <h3>📤 응답 구조</h3>
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

      <h3>📊 출력 필드 설명</h3>
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
      <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">http://localhost:3000/getEventLatest</code>

      <h3>📌 기능 설명</h3>
      <p>가장 최근에 <code>/getEvent</code>로 수집된 이벤트 캐시를 즉시 반환합니다. API 호출 없이 빠른 응답이 필요할 때 사용합니다.</p>

      <h3>🔄 데이터 처리 프로세스</h3>
      <ol>
        <li><code>docs/getEventCache.json</code> 파일 읽기</li>
        <li>JSON 파싱 및 유효성 검증</li>
        <li>캐시 데이터 반환</li>
      </ol>

      <h3>⚠️ 주의사항</h3>
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
      <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">http://localhost:3000/getValuation?tickers=AAPL,MSFT&cache=false</code>

      <h3>📌 기능 설명</h3>
      <p>지정된 종목의 현재가, 정량적 밸류에이션 지표, 동종업계 평균, 애널리스트 목표가를 종합적으로 계산하여 제공합니다.</p>

      <h3>🔄 데이터 수집 및 계산 프로세스</h3>
      <ol>
        <li><strong>현재가 조회:</strong> 장중에는 실시간 호가, 장외시간에는 Pre/Post Market API 사용</li>
        <li><strong>재무 데이터 수집:</strong> 최근 4분기 손익계산서 + 재무상태표 조회</li>
        <li><strong>정량 지표 계산:</strong> 수집된 재무 데이터로 PBR, PER, ROE 등 계산</li>
        <li><strong>Peer 분석:</strong> 동종업계 티커 조회 → 각 Peer의 정량 지표 계산 → 평균값 산출</li>
        <li><strong>정성 지표 수집:</strong> 애널리스트 컨센서스 목표가 및 통계 조회</li>
      </ol>

      <h3>📥 요청 파라미터</h3>
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

      <h3>📊 정량적 지표 (Quantitative Metrics) - 계산 수식</h3>

      <h4>📈 밸류에이션 배수</h4>
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

      <h4>💰 수익성 지표</h4>
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

      <h4>📈 성장성 지표</h4>
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

      <h4>💼 재무안정성 지표</h4>
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
        <strong>📊 TTM (Trailing Twelve Months) 계산 방식:</strong>
        <ul>
          <li>4개 분기 데이터가 모두 있으면: <code>Q0 + Q1 + Q2 + Q3</code></li>
          <li>일부 분기 누락 시: <code>(사용 가능한 분기 평균) × 4</code></li>
          <li>예: 3개 분기만 있으면 → <code>(Q0 + Q1 + Q2) / 3 × 4</code></li>
        </ul>
      </div>

      <h3>🤝 Peer 정량 지표 (peerQuantitative)</h3>
      <div class="step-process">
        <strong>계산 프로세스:</strong>
        <ol>
          <li>FMP Peer API로 동종업계 티커 목록 조회 (예: AAPL → [MSFT, GOOGL, META])</li>
          <li>각 Peer 티커의 정량 지표 개별 계산</li>
          <li>각 지표별 평균값 산출 (null 값 제외)</li>
          <li><code>peerCount</code>: 계산에 사용된 Peer 수</li>
          <li><code>peerList</code>: Peer 티커 목록</li>
        </ol>
        <strong>활용 방법:</strong> 대상 종목의 정량 지표와 비교하여 업종 내 상대적 위치 파악
      </div>

      <h3>🎯 정성적 지표 (Qualitative Metrics)</h3>
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

      <h3>💵 Price (현재가)</h3>
      <div class="response-info">
        <strong>조회 로직:</strong>
        <ul>
          <li><strong>정규 장중 (9:30 AM - 4:00 PM ET):</strong> Quote API 사용 (실시간 호가)</li>
          <li><strong>장외 시간 (Pre/Post Market):</strong> Pre-Post Market API 사용</li>
          <li>타임존: 미국 동부시간(ET) 기준으로 판단</li>
        </ul>
      </div>

      <h3>📤 응답 구조 예시</h3>
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
      <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">http://localhost:3000/refreshAnalystLog</code>

      <h3>📌 기능 설명</h3>
      <p>애널리스트 목표가 데이터를 수집하고, 과거 주가 추세(priceTrend)를 채워서 <code>docs/analystLog.json</code>을 생성/업데이트합니다.</p>

      <h3>🔄 3단계 처리 프로세스</h3>
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

      <h3>📥 요청 파라미터</h3>
      <ul>
        <li><code>priceTarget=true</code>: 1단계만 실행</li>
        <li><code>frame=true</code>: 2단계만 실행</li>
        <li><code>quote=true</code>: 3단계만 실행</li>
        <li>파라미터 없음: 1+2+3 순차 실행 (기본값)</li>
        <li><code>tickers=AAPL,MSFT</code>: 특정 티커만 처리</li>
        <li><code>test=true</code>: 상위 10개 티커만 처리 (테스트용)</li>
        <li><code>generateRating=false</code>: 완료 후 Rating 생성 생략</li>
      </ul>

      <h3>💾 출력 파일</h3>
      <ul>
        <li><code>docs/analystLog.json</code>: 애널리스트 목표가 + 과거 주가 추세 데이터</li>
        <li><code>docs/analystRating.json</code>: 생성된 등급 (generateRating=true 시)</li>
      </ul>

      <div class="note">
        <strong>⚠️ API 호출량 주의:</strong> 티커가 많으면 수백~수천 건의 API 호출이 발생할 수 있습니다.
        처음 실행 시 <code>test=true</code>로 소량 테스트 후 전체 실행 권장.
      </div>
    </div>

    <div class="endpoint">
      <div class="endpoint-title">5. GET /generateRating - 애널리스트 등급 생성</div>
      <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">http://localhost:3000/generateRating</code>

      <h3>📌 기능 설명</h3>
      <p>기존 <code>analystLog.json</code>을 읽어서 애널리스트 등급 데이터(<code>analystRating.json</code>)를 생성합니다.
      추가 API 호출 없이 캐시 데이터만 사용하므로 빠르고 Rate Limit 걱정이 없습니다.</p>

      <h3>🔄 처리 프로세스</h3>
      <ol>
        <li><code>docs/analystLog.json</code> 읽기</li>
        <li>목표가와 실제 주가 변동 비교</li>
        <li>애널리스트 예측 정확도 평가</li>
        <li><code>docs/analystRating.json</code> 저장</li>
      </ol>

      <h3>✅ 사용 시나리오</h3>
      <ul>
        <li><code>/refreshAnalystLog</code> 완료 후 Rating만 재생성하고 싶을 때</li>
        <li>Rating 계산 로직 변경 후 재계산</li>
        <li>API 호출 없이 빠른 결과 확인</li>
      </ul>
    </div>

    <h2>🧪 테스트 실행</h2>
    <pre><code>npm test                    # 전체 테스트
npm run test:unit           # 단위 테스트
npm run test:integration    # 통합 테스트
npm run test:contract       # 계약 테스트
npm run test:coverage       # 커버리지 리포트</code></pre>

    <h2>🚨 문제 해결</h2>
    <ul>
      <li><strong>503 Service Unavailable:</strong> <code>docs/</code> 디렉토리에 캐시 파일 존재 확인</li>
      <li><strong>401 Unauthorized:</strong> <code>.env</code> 파일의 <code>FMP_API_KEY</code> 유효성 확인</li>
      <li><strong>빈 응답:</strong> 응답 내 <code>collectionErrorChecklist</code> 확인</li>
      <li><strong>Rate Limit 초과:</strong> <code>/getEventLatest</code>, <code>/generateRating</code> 등 캐시 기반 API 사용</li>
    </ul>

    <h2>📚 추가 리소스</h2>
    <ul>
      <li><a href="https://site.financialmodelingprep.com/developer/docs" target="_blank">FMP API 공식 문서</a></li>
      <li>프로젝트 구조: <code>src/api/endpoints/</code> - 엔드포인트, <code>src/services/</code> - 비즈니스 로직</li>
      <li>설정 파일: <code>docs/ApiList.json</code> - API 엔드포인트 매핑, <code>docs/evMethod.json</code> - 지표 계산 정의</li>
    </ul>

  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
