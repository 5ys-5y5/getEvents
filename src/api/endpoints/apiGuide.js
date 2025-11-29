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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet">
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
      font-family: 'Noto Sans KR', 'Noto Sans', sans-serif;
      line-height: 1.7;
      color: #111111;
      background: #999999;
      padding: 0;
      margin: 0;
    }

    /* Layout: Sidebar + Main Content */
    .page-wrapper {
      display: flex;
      min-height: 100vh;
    }

    /* Table of Contents Sidebar */
    .toc-sidebar {
      width: 280px;
      background: #2b2b2b;
      color: #e0e0e0;
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      overflow-y: auto;
      padding: 24px 16px;
      border-right: 1px solid #1a1a1a;
      z-index: 1000;
      /* 스크롤바 숨기기 */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }

    .toc-sidebar::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }

    .toc-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #999999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #3a3a3a;
    }

    /* Search box styling */
    .toc-search-box {
      margin-bottom: 16px;
      position: relative;
    }

    .toc-search-input {
      width: 100%;
      padding: 15px 32px 15px 12px;
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 0.85rem;
      outline: none;
      transition: all 0.2s;
    }

    .toc-search-input:focus {
      border-color: #0066cc;
      background: #222222;
    }

    .toc-search-input::placeholder {
      color: #666666;
    }

    .toc-search-clear {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #666666;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 1rem;
      line-height: 1;
      display: none;
    }

    .toc-search-clear:hover {
      color: #999999;
    }

    .toc-search-clear.show {
      display: block;
    }

    .toc-search-result-count {
      font-size: 0.75rem;
      color: #999999;
      margin-top: 6px;
      padding-left: 4px;
    }

    .toc-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .toc-group-box {
      list-style: none;
      margin: 0;
      padding: 0;
      margin-top: 4px;
      margin-left: 0;
      border: none;
      border-left: 0.5px solid #555555;
      padding-left: 0;
      background: none;
      border-radius: 0;
    }

    /* 위계별 박스 들여쓰기 - 상위 항목의 위계에 따라 좌측 테두리가 보이도록 */
    .toc-group-box.toc-group-h2 {
      margin-left: 1.3rem;
    }

    .toc-group-box.toc-group-h3 {
      margin-left: 1.3rem;
    }

    .toc-group-box.toc-group-h4 {
      margin-left: 1.3rem;
    }

    .toc-item {
      margin-bottom: 4px;
      list-style: none;
    }

    .toc-group-box .toc-item:last-child {
      margin-bottom: 0;
    }

    /* 하위 항목들은 간격을 줄여 세로줄이 연결되어 보이도록 */
    .toc-item.level-h3,
    .toc-item.level-h4 {
      margin-bottom: 0;
    }

    /* 외부 박스 (호버/선택 상태 표시용) */
    .toc-link {
      display: block;
      text-decoration: none;
      color: #e0e0e0;
      padding: 6px 12px 6px 8px;
      border-radius: 4px;
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background-color 0.2s, color 0.2s;
      position: relative;
    }

    .toc-link:hover {
      background: #3a3a3a;
      color: #ffffff;
    }

    .toc-link.active {
      background: #0066cc;
      color: #ffffff;
      font-weight: 500;
    }

    /* 항목별 호버/선택 박스 - 위계에 관계없이 모든 항목이 1위계 박스의 너비와 같은 너비 */
    .toc-item.level-h2 .toc-link,
    .toc-item.level-h3 .toc-link,
    .toc-item.level-h4 .toc-link {
      margin-left: 0;
      margin-right: 0;
      width: 100%;
    }

    /* h2: 기본 패딩 */
    .toc-item.level-h2 .toc-link {
      padding-left: 1rem;
    }

    /* h3: 폰트 크기와 색상만 조정, 너비는 동일 */
    .toc-item.level-h3 .toc-link {
      font-size: 0.85rem;
      padding: 5px 12px 5px 1rem;
      margin-top: 0;
      margin-bottom: 0;
      color: #c0c0c0;
    }

    .toc-item.level-h3 .toc-link:hover {
      color: #e0e0e0;
    }

    /* h4: 폰트 크기와 색상만 조정, 너비는 동일 */
    .toc-item.level-h4 .toc-link {
      font-size: 0.8rem;
      padding: 5px 12px 5px 1rem;
      margin-top: 0;
      margin-bottom: 0;
      color: #a0a0a0;
    }

    .toc-item.level-h4 .toc-link:hover {
      color: #d0d0d0;
    }

    /* Main Content Area */
    .content-wrapper {
      margin-left: 280px;
      flex: 1;
      background: #999999;
      padding: 24px;
    }

    .container {
      max-width: 1200px;
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
      margin-top: 0px;
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
      margin-top: 50px;
    }

    .section-block:first-of-type {
      margin-top: 50px;
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

    /* Mobile: Hide sidebar, show toggle button */
    .toc-toggle {
      display: none;
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 1001;
      background: #2b2b2b;
      color: #ffffff;
      border: none;
      padding: 10px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2rem;
    }

    .toc-toggle:hover {
      background: #3a3a3a;
    }

    @media (max-width: 1024px) {
      .toc-sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .toc-sidebar.open {
        transform: translateX(0);
      }

      .content-wrapper {
        margin-left: 0;
      }

      .toc-toggle {
        display: block;
      }
    }

    @media (max-width: 768px) {
      .content-wrapper {
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

      .toc-sidebar {
        width: 260px;
      }
    }

    /* Smooth scroll */
    html {
      scroll-behavior: smooth;
    }

    /* Add scroll padding for fixed header offset */
    html {
      scroll-padding-top: 20px;
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
  <!-- Mobile TOC Toggle Button -->
  <button class="toc-toggle" onclick="document.querySelector('.toc-sidebar').classList.toggle('open')">
    ☰
  </button>

  <div class="page-wrapper">
    <!-- Table of Contents Sidebar -->
    <nav class="toc-sidebar" id="toc">

      <!-- Search Box -->
      <div class="toc-search-box">
        <input
          type="text"
          id="toc-search-input"
          class="toc-search-input"
          placeholder="검색..."
          autocomplete="off"
        />
        <button id="toc-search-clear" class="toc-search-clear">×</button>
      </div>
      <div id="toc-search-result-count" class="toc-search-result-count"></div>

      <ul class="toc-list" id="toc-list">
        <!-- TOC will be generated by JavaScript -->
      </ul>
    </nav>

    <!-- Main Content -->
    <div class="content-wrapper">
      <div class="container">
        <h1 id="top">Financial Event API - 상세 사용 가이드</h1>

    <div class="section-intro">
      <p><strong>API 개요</strong></p>
      이 API는 Financial Modeling Prep (FMP) API를 활용하여 기업 재무 이벤트 정보와 밸류에이션 지표를 제공합니다.<br>
      실시간 주가, 재무제표 기반 정량 지표, 애널리스트 목표가 등 포괄적인 투자 의사결정 정보를 JSON 형태로 제공합니다.
    </div>

    <section class="section-block">
      <h2 id="installation">설치 및 실행</h2>

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
      <h2 id="api-endpoints">API 엔드포인트 상세 설명</h2>

      <div class="endpoint">
        <h3 class="endpoint-title">1. GET /getEvent - 재무 이벤트 조회</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/getEvent?startDate=3&endDate=7</code>

        <h4>기능 설명</h4>
        <p>지정된 날짜 범위 내에 발생하는 기업 재무 이벤트(실적발표, 배당일 등)를 수집하여 반환합니다.</p>

        <h4>데이터 수집 프로세스</h4>
        <ul>
          <li><strong>심볼 캐시 로드:</strong> 거래 가능한 주식 심볼 목록을 <code>docs/symbolCache.json</code>에서 로드 (자동 갱신)</li>
          <li><strong>API 호출:</strong> FMP API의 여러 이벤트 서비스(<code>earnings-calendar</code>, <code>dividend-calendar</code> 등)를 병렬 호출</li>
          <li><strong>데이터 정규화:</strong> 각 서비스의 응답을 공통 포맷으로 변환 (fieldMap 사용)</li>
          <li><strong>필터링:</strong> 심볼 캐시에 존재하는 종목만 필터링</li>
          <li><strong>중복 제거:</strong> 동일 ticker + date + event 조합 제거</li>
          <li><strong>캐싱:</strong> 결과를 <code>docs/getEventCache.json</code>에 저장</li>
        </ul>

        <h4>요청 파라미터</h4>
        <ul>
          <li><code>startDate</code> (필수): 오늘로부터 N일 후 (예: 3 = 오늘+3일)</li>
          <li><code>endDate</code> (필수): 오늘로부터 N일 후 (예: 7 = 오늘+7일)</li>
          <li><code>format</code> (선택): "ndjson" 지정 시 NDJSON 스트리밍, 미지정 시 일반 JSON</li>
        </ul>

        <h4>응답 구조</h4>
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

        <h4>출력 필드 설명</h4>
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
        <h3 class="endpoint-title">2. GET /getEventLatest - 캐시된 이벤트 조회</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/getEventLatest</code>

        <h4>기능 설명</h4>
        <p>가장 최근에 <code>/getEvent</code>로 수집된 이벤트 캐시를 즉시 반환합니다. API 호출 없이 빠른 응답이 필요할 때 사용합니다.</p>

        <h4>데이터 처리 프로세스</h4>
        <ul>
          <li><code>docs/getEventCache.json</code> 파일 읽기</li>
          <li>JSON 파싱 및 유효성 검증</li>
          <li>캐시 데이터 반환</li>
        </ul>

        <h4>주의사항</h4>
        <div class="note">
          <ul>
            <li>캐시 파일이 없으면 404 에러 반환 → 먼저 <code>/getEvent</code> 호출 필요</li>
            <li>캐시 데이터는 최근 <code>/getEvent</code> 호출 시점의 스냅샷</li>
            <li>실시간 데이터가 필요하면 <code>/getEvent</code> 사용</li>
          </ul>
        </div>
      </div>

      <div class="endpoint">
        <h3 class="endpoint-title">3. GET /getValuation - 밸류에이션 지표 계산</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/getValuation?tickers=AAPL,MSFT&cache=false</code>

        <h4>기능 설명</h4>
        <p>지정된 종목의 현재가, 정량적 밸류에이션 지표, 동종업계 평균, 애널리스트 목표가를 종합적으로 계산하여 제공합니다.</p>

        <h4>데이터 수집 및 계산 프로세스</h4>
        <ul>
          <li><strong>현재가 조회:</strong> 장중에는 실시간 호가, 장외시간에는 Pre/Post Market API 사용</li>
          <li><strong>재무 데이터 수집:</strong> 최근 4분기 손익계산서 + 재무상태표 조회</li>
          <li><strong>정량 지표 계산:</strong> 수집된 재무 데이터로 PBR, PER, ROE 등 계산</li>
          <li><strong>Peer 분석:</strong> 동종업계 티커 조회 → 각 Peer의 정량 지표 계산 → 평균값 산출</li>
          <li><strong>정성 지표 수집:</strong> 애널리스트 컨센서스 목표가 및 통계 조회</li>
        </ul>

        <h4>요청 파라미터</h4>
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

        <h4>정량적 지표 (Quantitative Metrics) - 계산 수식</h4>

        <h5>밸류에이션 배수</h5>
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

        <h4>Peer 정량 지표 (peerQuantitative)</h4>
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

        <h4>정성적 지표 (Qualitative Metrics)</h4>
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

        <h4>Price (현재가)</h4>
        <div class="response-info">
          <strong>조회 로직:</strong>
          <ul>
            <li><strong>정규 장중 (9:30 AM - 4:00 PM ET):</strong> Quote API 사용 (실시간 호가)</li>
            <li><strong>장외 시간 (Pre/Post Market):</strong> Pre-Post Market API 사용</li>
            <li>타임존: 미국 동부시간(ET) 기준으로 판단</li>
          </ul>
        </div>

        <h4>응답 구조 예시</h4>
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
        <h3 class="endpoint-title">4. GET /refreshAnalystLog - 애널리스트 로그 갱신</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/refreshAnalystLog</code>

        <h4>기능 설명</h4>
        <p>애널리스트 목표가 데이터를 수집하고, 과거 주가 추세(priceTrend)를 채워서 <code>docs/analystLog.json</code>을 생성/업데이트합니다.</p>

        <h4>3단계 처리 프로세스</h4>
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

        <h4>요청 파라미터</h4>
        <ul>
          <li><code>priceTarget=true</code>: 1단계만 실행</li>
          <li><code>frame=true</code>: 2단계만 실행</li>
          <li><code>quote=true</code>: 3단계만 실행</li>
          <li>파라미터 없음: 1+2+3 순차 실행 (기본값)</li>
          <li><code>tickers=AAPL,MSFT</code>: 특정 티커만 처리</li>
          <li><code>test=true</code>: 상위 10개 티커만 처리 (테스트용)</li>
          <li><code>generateRating=false</code>: 완료 후 Rating 생성 생략</li>
        </ul>

        <h4>출력 파일</h4>
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
        <h3 class="endpoint-title">5. GET /generateRating - 애널리스트 등급 생성</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/generateRating</code>

        <h4>기능 설명</h4>
        <p>기존 <code>analystLog.json</code>을 읽어서 애널리스트별 목표가 정확도와 가격 추이 통계를 계산합니다.
        <strong>애널리스트 + 소속 회사</strong> 조합별로 D+1 ~ D+365일까지 각 시점의 괴리율(Gap Rate) 평균, 표준편차, 데이터 개수를 산출합니다.
        추가 API 호출 없이 캐시 데이터만 사용하므로 빠르고 Rate Limit 걱정이 없습니다.</p>

        <h4>괴리율(Gap Rate) 정의</h4>
        <div class="note">
          <strong>gapRate(D+N) = (D+N 가격 / 리포트 시점 가격) - 1</strong>
          <ul>
            <li>양수(+): 리포트 발표 이후 주가 상승</li>
            <li>음수(-): 리포트 발표 이후 주가 하락</li>
            <li>예: gapRate(D+7) = 0.15 → 7일 후 15% 상승</li>
            <li>예: gapRate(D+30) = -0.08 → 30일 후 8% 하락</li>
          </ul>
        </div>

        <h4>처리 프로세스</h4>
        <ul>
          <li><strong>1단계:</strong> <code>docs/analystLog.json</code>에서 모든 애널리스트 리포트 수집</li>
          <li><strong>2단계:</strong> 애널리스트명 + 소속 회사 조합으로 고유 애널리스트 식별</li>
          <li><strong>3단계:</strong> 각 애널리스트별로 모든 리포트의 D+N 괴리율 계산
            <ul>
              <li>D+1, D+2, D+3, ..., D+365 각 시점별 괴리율 수집</li>
              <li>null 값은 제외하고 유효한 데이터만 통계 계산</li>
            </ul>
          </li>
          <li><strong>4단계:</strong> 목표가 도달 시간(timeToTarget) 분석
            <ul>
              <li>목표가 ±2% 이내 도달한 첫 시점 기록</li>
              <li>평균, 중간값, 사분위수 계산</li>
              <li>목표가 도달률(reachedRatio) 산출</li>
            </ul>
          </li>
          <li><strong>5단계:</strong> <code>docs/analystRating.json</code> 저장</li>
        </ul>

        <h4>출력 데이터 구조</h4>
        <div class="response-info">
          <pre><code>{
  "meta": {
    "lastUpdated": "2025-11-27T05:02:42.729Z",
    "analystCount": 76,
    "horizons": [1, 2, 3, 4, 5, 6, 7, 14, 30, 60, 180, 365],
    "description": "Gap rate = (D+N price / priceWhenPosted) - 1"
  },
  "analysts": {
    "David Williams|Williams Trading": {
      "analystName": "David Williams",
      "analystCompany": "Williams Trading",
      "priceTargetCount": 4,
      "gapRates": {
        "D1": {
          "meanGapRate": 0.0042,
          "stdGapRate": 0.067,
          "count": 4,
          "standardError": 0.0335,
          "ci95Lower": -0.0614,
          "ci95Upper": 0.0698,
          "ci95Width": 0.1312
        },
        "D30": {
          "meanGapRate": 0.3939,
          "stdGapRate": 0.7991,
          "count": 17,
          "standardError": 0.1938,
          "ci95Lower": 0.0140,
          "ci95Upper": 0.7738,
          "ci95Width": 0.7597
        }
      },
      "timeToTarget": {
        "mean": 45.2,
        "median": 30,
        "q25": 14,
        "q75": 60,
        "targetReachedCount": 12,
        "totalTargets": 20,
        "reachedRatio": 0.6
      },
      "accuracy": {
        "mean": 0.98,
        "std": 0.05,
        "count": 12
      }
    }
  }
}</code></pre>
        </div>

        <h4>출력 필드 상세 설명</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>필드</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>analystName</code></td>
              <td>애널리스트 이름</td>
            </tr>
            <tr>
              <td><code>analystCompany</code></td>
              <td>애널리스트 소속 회사 (증권사/리서치 기관)</td>
            </tr>
            <tr>
              <td><code>priceTargetCount</code></td>
              <td>해당 애널리스트가 발표한 총 목표가 리포트 개수</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].meanGapRate</code></td>
              <td>D+N일 시점 평균 괴리율 (null 제외)</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].stdGapRate</code></td>
              <td>D+N일 시점 괴리율 표준편차 (변동성 지표)</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].count</code></td>
              <td>D+N일 시점 유효 데이터 개수</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].standardError</code></td>
              <td>표준오차 (SE = σ / √n) - 평균의 불확실성 측정</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].ci95Lower</code></td>
              <td>95% 신뢰구간 하한 (mean - 1.96 × SE)</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].ci95Upper</code></td>
              <td>95% 신뢰구간 상한 (mean + 1.96 × SE)</td>
            </tr>
            <tr>
              <td><code>gapRates.D[N].ci95Width</code></td>
              <td>95% 신뢰구간 폭 (상한 - 하한) - 작을수록 신뢰도 높음</td>
            </tr>
            <tr>
              <td><code>timeToTarget.mean</code></td>
              <td>목표가 도달까지 평균 일수</td>
            </tr>
            <tr>
              <td><code>timeToTarget.median</code></td>
              <td>목표가 도달까지 중간값 일수</td>
            </tr>
            <tr>
              <td><code>timeToTarget.q25 / q75</code></td>
              <td>25% / 75% 사분위수 (분포 파악)</td>
            </tr>
            <tr>
              <td><code>timeToTarget.reachedRatio</code></td>
              <td>목표가 도달률 (0~1, 1 = 100% 도달)</td>
            </tr>
            <tr>
              <td><code>accuracy.mean</code></td>
              <td>목표가 정확도 평균 (실제가/목표가)</td>
            </tr>
          </tbody>
        </table>

        <h4>통계적 신뢰도 이해하기</h4>
        <div class="note">
          <strong>표준편차(σ) vs 표준오차(SE)의 차이:</strong>
          <ul>
            <li><strong>표준편차 (stdGapRate)</strong>: 개별 관측값의 흩어짐 정도
              <ul>
                <li>애널리스트 예측의 변동성을 나타냄</li>
                <li>높을수록 예측이 불안정 (어떤 종목은 맞고, 어떤 종목은 틀림)</li>
              </ul>
            </li>
            <li><strong>표준오차 (standardError = σ / √n)</strong>: 평균의 불확실성
              <ul>
                <li>샘플 개수(n)가 증가하면 SE는 감소 (√n에 반비례)</li>
                <li>낮을수록 평균 추정이 정확함</li>
              </ul>
            </li>
          </ul>

          <strong>95% 신뢰구간(CI) 해석:</strong>
          <ul>
            <li><strong>의미:</strong> 진짜 평균 괴리율이 이 구간 안에 있을 확률 95%</li>
            <li><strong>계산:</strong> 평균 ± 1.96 × SE</li>
            <li><strong>예시:</strong> D+30 meanGapRate = 39.39%, CI = [1.40%, 77.38%]
              <ul>
                <li>→ 30일 후 진짜 평균 수익률이 1.4%~77.4% 사이일 확률 95%</li>
                <li>→ CI 폭이 75.97%로 넓음 = 불확실성 높음</li>
              </ul>
            </li>
          </ul>

          <strong>샘플 개수(count)의 중요성:</strong>
          <table class="metric-table">
            <thead>
              <tr>
                <th>샘플 수(n)</th>
                <th>표준편차(σ)</th>
                <th>표준오차(SE)</th>
                <th>95% CI 폭</th>
                <th>신뢰도</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>5개</td>
                <td>30%</td>
                <td>13.4%</td>
                <td>±26.4%</td>
                <td>낮음</td>
              </tr>
              <tr>
                <td>10개</td>
                <td>30%</td>
                <td>9.5%</td>
                <td>±18.6%</td>
                <td>보통</td>
              </tr>
              <tr>
                <td>40개</td>
                <td>30%</td>
                <td>4.7%</td>
                <td>±9.3%</td>
                <td>높음</td>
              </tr>
              <tr>
                <td>100개</td>
                <td>30%</td>
                <td>3.0%</td>
                <td>±5.9%</td>
                <td>매우 높음</td>
              </tr>
            </tbody>
          </table>
          <p>⚠️ <strong>핵심:</strong> 표준편차가 크면(변동성 높음) 더 많은 샘플이 필요하고,<br>
          샘플 개수가 증가할수록 CI 폭이 √n에 비례하여 빠르게 감소합니다.</p>
        </div>

        <h4>활용 방법</h4>
        <div class="step-process">
          <strong>1. 신뢰할 수 있는 애널리스트 식별:</strong>
          <ul>
            <li><code>priceTargetCount</code>가 높고 (충분한 샘플, 최소 10개 이상)</li>
            <li><code>ci95Width</code>가 좁으며 (신뢰구간 폭 < 20% 권장)</li>
            <li><code>gapRates.D[N].stdGapRate</code>가 낮고 (일관성, < 30% 권장)</li>
            <li><code>timeToTarget.reachedRatio</code>가 높은 (목표가 실현율 > 60%) 애널리스트 선별</li>
          </ul>

          <strong>2. 기대 수익률 예측 (신뢰구간 활용):</strong>
          <ul>
            <li><strong>보수적 시나리오:</strong> ci95Lower 사용 (95% 확률로 최소 이 정도 수익)</li>
            <li><strong>기대 시나리오:</strong> meanGapRate 사용 (평균 수익)</li>
            <li><strong>낙관적 시나리오:</strong> ci95Upper 사용 (95% 확률로 최대 이 정도 수익)</li>
            <li><strong>예:</strong> D+7 CI = [2%, 14%], mean = 8%
              <ul>
                <li>보수적: 최소 2% 수익 기대</li>
                <li>기대: 평균 8% 수익 기대</li>
                <li>낙관적: 최대 14% 수익 기대</li>
              </ul>
            </li>
          </ul>

          <strong>3. 신뢰도 기반 포지션 크기 조정:</strong>
          <ul>
            <li><code>ci95Width</code>가 좁으면 (< 10%) → 큰 포지션 허용</li>
            <li><code>ci95Width</code>가 넓으면 (> 50%) → 작은 포지션 또는 제외</li>
            <li><code>count</code>가 적으면 (< 5) → 통계적으로 신뢰하기 어려움</li>
          </ul>

          <strong>4. 포지션 기간 결정:</strong>
          <ul>
            <li><code>timeToTarget.median</code>으로 목표가 도달 예상 기간 파악</li>
            <li>예: median = 30일 → 30일 이내 목표가 도달 가능성 50%</li>
            <li>q25~q75 범위로 보수적/공격적 시나리오 수립</li>
          </ul>
        </div>

        <h4>사용 시나리오</h4>
        <ul>
          <li><code>/refreshAnalystLog</code> 완료 후 Rating만 재생성하고 싶을 때</li>
          <li>Rating 계산 로직 변경 후 재계산</li>
          <li>API 호출 없이 빠른 결과 확인</li>
          <li>애널리스트 성과 백테스팅 및 랭킹 산출</li>
        </ul>

        <div class="note">
          <strong>통계적 유의성 주의:</strong>
          <ul>
            <li><code>count</code>가 너무 작으면(< 5) 통계적으로 신뢰하기 어려움</li>
            <li>특정 섹터/종목에만 집중된 애널리스트는 편향 가능성</li>
            <li>과거 성과가 미래를 보장하지 않음 (시장 환경 변화 고려)</li>
          </ul>
        </div>
      </div>
    </section>


    <!-- Price Tracker API Documentation (Feature 002) -->
    <section class="section-block">
      <h2 id="price-tracker-api">Price Tracker API - 거래 추적 및 모델 성과 분석</h2>

      <p class="section-intro">
        개별 거래의 D+1~D+14 가격 변동을 추적하고, Cap-Aware 수익률 계산을 통해 트레이딩 모델의 성과를 분석하는 API입니다.
        Long/Short 포지션별로 일중 고가/저가를 고려한 현실적인 수익률 계산을 제공하며, 모델별 최적 보유일수 및 추천 Cap 임계값을 자동 산출합니다.
      </p>

      <div class="endpoint">
        <h3 class="endpoint-title">6. POST /priceTracker - 거래 추적 등록</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/priceTracker</code>

        <h4>기능 설명</h4>
        <p>개별 거래를 등록하고 D+1~D+14 일별 가격 데이터를 수집하여 Cap-Aware 수익률을 계산합니다.
        배치 처리 방식으로 여러 거래를 한 번에 등록할 수 있으며, HTTP 207 Multi-Status 응답으로 각 거래의 성공/실패 상태를 개별 반환합니다.</p>

        <h4>데이터 수집 및 계산 프로세스</h4>
        <ul>
          <li><strong>입력 검증:</strong> position(long/short), modelName(MODEL-{숫자}), ticker(심볼캐시 존재 확인), purchaseDate(과거 날짜 검증)</li>
          <li><strong>현재가 조회:</strong> 구매일 기준 종가(currentPrice) 조회</li>
          <li><strong>D+N 가격 이력 수집:</strong> D+1부터 D+14까지 각 거래일의 OHLC(시가/고가/저가/종가) 데이터 조회</li>
          <li><strong>Cap-Aware 수익률 계산:</strong> 포지션별로 일중 고가/저가가 임계값 도달 시 시가 기준 수익률 적용</li>
          <li><strong>캐시 병합:</strong> 기존 거래 데이터와 병합하여 docs/trackedPriceCache.json에 저장</li>
          <li><strong>모델 성과 재계산:</strong> 해당 모델의 전체 거래 기반으로 최적 보유일수/추천 Cap/평균 수익률 갱신</li>
        </ul>

        <h4>요청 형식 (text/plain, 탭 구분)</h4>
        <pre><code>position	modelName	ticker	purchaseDate
long	MODEL-1	AAPL	2025-11-20
short	MODEL-2	MSFT	2025-11-21
long	MODEL-1	GOOGL	2025-11-22</code></pre>

        <h4>입력 필드 검증 규칙</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>필드</th>
              <th>유효성 규칙</th>
              <th>에러 코드</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>position</code></td>
              <td>"long" 또는 "short"만 허용</td>
              <td>INVALID_POSITION</td>
            </tr>
            <tr>
              <td><code>modelName</code></td>
              <td>정규식: <code>^MODEL-\\d+$</code> (예: MODEL-1, MODEL-123)</td>
              <td>INVALID_MODEL_NAME</td>
            </tr>
            <tr>
              <td><code>ticker</code></td>
              <td>대문자 영문만 허용 + symbolCache.json에 존재해야 함</td>
              <td>INVALID_TICKER / TICKER_NOT_FOUND</td>
            </tr>
            <tr>
              <td><code>purchaseDate</code></td>
              <td>YYYY-MM-DD 형식 + 과거 또는 오늘 날짜</td>
              <td>INVALID_DATE_FORMAT / FUTURE_DATE</td>
            </tr>
          </tbody>
        </table>

        <h4>Cap-Aware 수익률 계산 로직</h4>
        <p>일중 가격 변동이 임계값(maxCap/lowCap)을 초과할 때 시가 기준 수익률을 적용하여 현실적인 매매 시나리오를 반영합니다.</p>

        <h5>Long 포지션 (매수 전략)</h5>
        <table class="metric-table">
          <thead>
            <tr>
              <th>조건</th>
              <th>수익률 계산식</th>
              <th>returnSource</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>고가(high) ≥ currentPrice × (1 + maxCap)</td>
              <td><code>(시가 - currentPrice) / currentPrice</code></td>
              <td>open_maxCap</td>
            </tr>
            <tr>
              <td>저가(low) ≤ currentPrice × (1 - lowCap)</td>
              <td><code>(시가 - currentPrice) / currentPrice</code></td>
              <td>open_lowCap</td>
            </tr>
            <tr>
              <td>상기 조건 모두 미충족</td>
              <td><code>(종가 - currentPrice) / currentPrice</code></td>
              <td>close_normal</td>
            </tr>
          </tbody>
        </table>

        <h5>Short 포지션 (공매도 전략)</h5>
        <table class="metric-table">
          <thead>
            <tr>
              <th>조건</th>
              <th>수익률 계산식</th>
              <th>returnSource</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>저가(low) ≤ currentPrice × (1 - lowCap)</td>
              <td><code>(currentPrice - 시가) / currentPrice</code></td>
              <td>open_lowCap</td>
            </tr>
            <tr>
              <td>고가(high) ≥ currentPrice × (1 + maxCap)</td>
              <td><code>(currentPrice - 시가) / currentPrice</code></td>
              <td>open_maxCap</td>
            </tr>
            <tr>
              <td>상기 조건 모두 미충족</td>
              <td><code>(currentPrice - 종가) / currentPrice</code></td>
              <td>close_normal</td>
            </tr>
          </tbody>
        </table>

        <div class="note">
          <strong>Progressive Null-Filling:</strong> 미래 D+N 날짜의 수익률은 null로 저장되며, 시간이 경과하면 자동으로 실제 수익률로 업데이트됩니다.
          예: 오늘이 구매일+3일이면 D+1~D+3은 실제값, D+4~D+14는 null입니다.
        </div>

        <h4>응답 구조 (HTTP 207 Multi-Status)</h4>
        <pre><code>{
  "results": [
    {
      "index": 0,
      "status": 200,
      "trade": {
        "position": "long",
        "modelName": "MODEL-1",
        "ticker": "AAPL",
        "purchaseDate": "2025-11-20"
      },
      "data": {
        "currentPrice": 185.32,
        "priceHistory": {
          "D+1": { "date": "2025-11-21", "open": 186.00, "high": 188.50, "low": 185.00, "close": 187.20 },
          "D+2": { "date": "2025-11-22", "open": 187.50, ... }
        },
        "returns": {
          "D+1": { "returnRate": 0.0101, "returnSource": "close_normal" },
          "D+2": { "returnRate": 0.0230, "returnSource": "open_maxCap" },
          "D+14": null
        }
      }
    },
    {
      "index": 1,
      "status": 404,
      "trade": { ... },
      "error": {
        "code": "TICKER_NOT_FOUND",
        "message": "Ticker XYZ not found in symbolCache"
      }
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}</code></pre>

        <h4>에러 코드</h4>
        <table class="metric-table">
          <thead>
            <tr>
              <th>코드</th>
              <th>HTTP 상태</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>INVALID_FORMAT</td>
              <td>400</td>
              <td>요청 본문이 탭 구분 형식이 아니거나 필드 개수 불일치</td>
            </tr>
            <tr>
              <td>INVALID_POSITION</td>
              <td>400</td>
              <td>position이 "long" 또는 "short"가 아님</td>
            </tr>
            <tr>
              <td>INVALID_MODEL_NAME</td>
              <td>400</td>
              <td>modelName이 MODEL-{숫자} 패턴이 아님</td>
            </tr>
            <tr>
              <td>INVALID_TICKER</td>
              <td>400</td>
              <td>ticker가 대문자 영문이 아님</td>
            </tr>
            <tr>
              <td>TICKER_NOT_FOUND</td>
              <td>404</td>
              <td>ticker가 symbolCache.json에 없음</td>
            </tr>
            <tr>
              <td>INVALID_DATE_FORMAT</td>
              <td>400</td>
              <td>purchaseDate가 YYYY-MM-DD 형식이 아님</td>
            </tr>
            <tr>
              <td>FUTURE_DATE</td>
              <td>400</td>
              <td>purchaseDate가 미래 날짜</td>
            </tr>
            <tr>
              <td>INTERNAL_ERROR</td>
              <td>500</td>
              <td>API 호출 실패 또는 내부 오류</td>
            </tr>
          </tbody>
        </table>

        <h4>curl 사용 예시</h4>
        <pre><code>curl -X POST https://getevents.onrender.com/priceTracker \\
  -H "Content-Type: text/plain" \\
  -d "long	MODEL-1	AAPL	2025-11-20"</code></pre>
      </div>

      <div class="endpoint">
        <h3 class="endpoint-title">7. GET /trackedPrice - 거래 조회 및 모델 성과 요약</h3>
        <code class="endpoint-url" onclick="window.open(this.textContent, '_blank')">https://getevents.onrender.com/trackedPrice</code>

        <h4>기능 설명</h4>
        <p>등록된 모든 거래 기록과 모델별 성과 요약 통계를 조회합니다.
        최적 보유일수, 추천 maxCap/lowCap, 평균 수익률, 승률 등 포괄적인 백테스팅 결과를 제공합니다.</p>

        <h4>데이터 처리 프로세스</h4>
        <ul>
          <li><code>docs/trackedPriceCache.json</code> 파일 읽기</li>
          <li>캐시 데이터 JSON 파싱 및 유효성 검증</li>
          <li>meta, trades, modelSummaries 반환</li>
        </ul>

        <h4>응답 구조</h4>
        <pre><code>{
  "meta": {
    "lastUpdated": "2025-11-25T10:30:00.000Z",
    "totalTrades": 150,
    "uniqueModels": 5
  },
  "trades": [
    {
      "position": "long",
      "modelName": "MODEL-1",
      "ticker": "AAPL",
      "purchaseDate": "2025-11-20",
      "currentPrice": 185.32,
      "priceHistory": { "D+1": {...}, "D+2": {...}, ... },
      "returns": { "D+1": {...}, "D+2": {...}, ... },
      "meta": {
        "lastUpdated": "2025-11-25T10:30:00.000Z",
        "dataSource": "fmp_historical_ohlc"
      }
    }
  ],
  "modelSummaries": [
    {
      "modelName": "MODEL-1",
      "totalTrades": 45,
      "optimalHoldingDays": [3, 5, 7],
      "suggestedMaxCap": 0.078,
      "suggestedLowCap": 0.032,
      "avgReturnByDay": {
        "D+1": 0.0032,
        "D+3": 0.0089,
        "D+7": 0.0145,
        "D+14": 0.0201
      },
      "winRateByDay": {
        "D+1": 0.52,
        "D+3": 0.58,
        "D+7": 0.61,
        "D+14": 0.55
      },
      "meta": {
        "lastUpdated": "2025-11-25T10:30:00.000Z"
      }
    }
  ]
}</code></pre>

        <h4>모델 성과 지표 계산 로직</h4>

        <h5>최적 보유일수 (optimalHoldingDays)</h5>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 방법</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>optimalHoldingDays</strong></td>
              <td>각 D+N의 평균 수익률을 계산 → 상위 3개 D+N 선택 (내림차순 정렬)</td>
              <td>해당 모델에서 가장 수익률이 높은 보유 기간 (예: [3, 5, 7])</td>
            </tr>
          </tbody>
        </table>

        <h5>추천 Cap 임계값</h5>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 방법</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>suggestedMaxCap</strong></td>
              <td>전체 거래의 모든 D+N 수익률 수집 → 20th percentile 계산</td>
              <td>Long 포지션의 이익실현 임계값 (상위 80% 수익률 지점)</td>
            </tr>
            <tr>
              <td><strong>suggestedLowCap</strong></td>
              <td>전체 거래의 모든 D+N 수익률 수집 → 5th percentile 계산 (절댓값)</td>
              <td>손절 임계값 (하위 5% 손실률 지점)</td>
            </tr>
          </tbody>
        </table>

        <div class="note">
          <strong>Percentile 계산 방식:</strong> 선형 보간법(Linear Interpolation) 사용.
          거래 건수가 3건 미만이면 suggestedMaxCap 및 suggestedLowCap은 null 반환됩니다.
        </div>

        <h5>평균 수익률 및 승률</h5>
        <table class="metric-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>계산 방법</th>
              <th>의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>avgReturnByDay[D+N]</strong></td>
              <td>D+N의 모든 유효 수익률(null 제외) 평균</td>
              <td>D+N 시점의 평균 수익률 (소수점 표시, 예: 0.0032 = 0.32%)</td>
            </tr>
            <tr>
              <td><strong>winRateByDay[D+N]</strong></td>
              <td>(수익률 > 0인 거래 수) / (유효 거래 총 수)</td>
              <td>D+N 시점의 승률 (0~1 범위, 예: 0.58 = 58%)</td>
            </tr>
          </tbody>
        </table>

        <h4>주의사항</h4>
        <div class="note">
          <ul>
            <li>캐시 파일이 없으면 404 에러 반환 → 먼저 <code>/priceTracker</code>로 거래 등록 필요</li>
            <li>Progressive Null-Filling으로 인해 최근 거래는 일부 D+N 수익률이 null일 수 있음</li>
            <li>모델 성과 지표는 POST /priceTracker 호출 시마다 자동 재계산됨</li>
          </ul>
        </div>

        <h4>curl 사용 예시</h4>
        <pre><code>curl https://getevents.onrender.com/trackedPrice</code></pre>
      </div>

      <h3>트레이딩 캘린더 및 D+N 날짜 계산</h3>
      <p>D+N 날짜는 NYSE 거래일 기준으로 계산됩니다. 주말 및 다음 공휴일은 자동으로 건너뜁니다:</p>

      <h4>2025년 NYSE 공휴일</h4>
      <table class="metric-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>공휴일</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>2025-01-01</td><td>New Year's Day</td></tr>
          <tr><td>2025-01-20</td><td>Martin Luther King Jr. Day</td></tr>
          <tr><td>2025-02-17</td><td>Presidents' Day</td></tr>
          <tr><td>2025-04-18</td><td>Good Friday</td></tr>
          <tr><td>2025-05-26</td><td>Memorial Day</td></tr>
          <tr><td>2025-07-04</td><td>Independence Day</td></tr>
          <tr><td>2025-09-01</td><td>Labor Day</td></tr>
          <tr><td>2025-11-27</td><td>Thanksgiving Day</td></tr>
          <tr><td>2025-12-25</td><td>Christmas Day</td></tr>
        </tbody>
      </table>

      <div class="note">
        <strong>Fallback 메커니즘:</strong> 거래일 조회 시 7일 연속 비거래일이면 null 반환.
        공휴일 데이터는 매년 수동으로 <code>src/lib/tradingCalendar.js</code>에서 업데이트 필요합니다.
      </div>

      <h3>활용 시나리오</h3>

      <h4>시나리오 1: 신규 트레이딩 모델 백테스팅</h4>
      <ol>
        <li>과거 거래 신호 목록을 탭 구분 텍스트 파일로 준비</li>
        <li>POST /priceTracker로 배치 등록 (최대 100건/요청 권장)</li>
        <li>GET /trackedPrice로 모델 성과 확인:
          <ul>
            <li>optimalHoldingDays로 최적 청산 타이밍 파악</li>
            <li>suggestedMaxCap/lowCap으로 손익 임계값 설정</li>
            <li>avgReturnByDay/winRateByDay로 일별 성과 추이 분석</li>
          </ul>
        </li>
      </ol>

      <h4>시나리오 2: 실시간 트레이딩 모니터링</h4>
      <ol>
        <li>매일 장 마감 후 당일 신규 거래를 POST /priceTracker로 등록</li>
        <li>주기적으로 GET /trackedPrice 호출하여 기존 거래의 D+N 수익률 업데이트 확인</li>
        <li>모델별 성과가 기준치 이하로 떨어지면 알림 (외부 모니터링 시스템 연동)</li>
      </ol>

      <h4>시나리오 3: 다중 모델 비교 분석</h4>
      <ol>
        <li>동일한 종목/기간에 대해 서로 다른 modelName으로 거래 등록 (예: MODEL-1 = MA 전략, MODEL-2 = RSI 전략)</li>
        <li>GET /trackedPrice의 modelSummaries 배열에서 각 모델의 성과 지표 비교</li>
        <li>optimalHoldingDays, avgReturn, winRate를 기준으로 우수 모델 선별</li>
      </ol>
    </section>

    <section class="section-block">
      <h2 id="project-structure">프로젝트 구조 및 설정 파일</h2>

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

      <h3 id="endpoint-details">엔드포인트별 상세 구조 및 데이터 흐름</h3>

      <div class="note">
      <h4 id="endpoint-getEvent">1️⃣ GET /getEvent - 재무 이벤트 수집</h4><br>
        <strong>📍 엔드포인트 파일:</strong> <code>src/api/endpoints/getEvent.js</code><br><br>
        <strong>📊 데이터 흐름:</strong>
        <pre><code>1. 요청 파라미터 검증
   ↓ src/lib/dateUtils.js → validateDateRange()
   ↓ startDate, endDate를 ISO 8601 날짜로 변환

2. 심볼 캐시 로드 (거래 가능 종목 목록)
   ↓ src/services/cacheManager.js → getSymbolCache()
   ↓ docs/symbolCache.json 읽기 (없으면 FMP API 호출)

3. API 설정 로드
   ↓ src/lib/configLoader.js → loadApiList()
   ↓ docs/config/ApiList.json 읽기
   ↓ getCalendar.getEarningsCalendar, getDividendCalendar 등

4. 이벤트 서비스 병렬 호출
   ↓ src/services/fmpClient.js → fetchApi()
   ↓ FMP API: /v3/earning-calendar, /v3/stock-dividend-calendar 등
   ↓ axios + axios-retry (최대 3회 재시도)

5. 응답 데이터 정규화
   ↓ src/services/eventNormalizer.js → normalizeEvents()
   ↓ fieldMap 기반 필드 매핑 (symbol → ticker)
   ↓ 날짜 UTC 변환, 고정값 처리

6. 심볼 필터링 및 중복 제거
   ↓ src/services/eventNormalizer.js → filterEventsBySymbols()
   ↓ symbolCache에 없는 종목 제외
   ↓ deduplicateEvents() → ticker + date + event 중복 제거

7. 응답 포맷 선택
   ↓ format=ndjson → src/lib/ndJsonStreamer.js
   ↓ format=json → 일반 JSON 배열

8. 캐시 저장
   ↓ src/services/cacheManager.js → saveEventCache()
   ↓ docs/getEventCache.json 쓰기</code></pre>

        <strong>🗂️ 관련 파일:</strong>
        <ul>
          <li><code>src/api/endpoints/getEvent.js</code> - 엔드포인트 핸들러 (메인)</li>
          <li><code>src/services/cacheManager.js</code> - 캐시 관리 (getSymbolCache, saveEventCache)</li>
          <li><code>src/services/fmpClient.js</code> - FMP API 호출 (fetchApi, axios-retry)</li>
          <li><code>src/services/eventNormalizer.js</code> - 데이터 정규화 (normalizeEvents, deduplicateEvents)</li>
          <li><code>src/lib/configLoader.js</code> - 설정 로드 (loadApiList, buildApiUrl)</li>
          <li><code>src/lib/dateUtils.js</code> - 날짜 유틸 (validateDateRange, daysFromTodayToISO)</li>
          <li><code>src/lib/ndJsonStreamer.js</code> - NDJSON 스트리밍 (initNDJsonStream, writeNDJsonLine)</li>
          <li><code>docs/config/ApiList.json</code> - API 서비스 정의 및 fieldMap</li>
          <li><code>docs/symbolCache.json</code> - 거래 가능 종목 목록 (읽기)</li>
          <li><code>docs/getEventCache.json</code> - 이벤트 캐시 (쓰기)</li>
        </ul>

        <strong>⚙️ 외부 API 의존성:</strong>
        <ul>
          <li>FMP <code>/v3/earning-calendar</code> - 실적발표 일정</li>
          <li>FMP <code>/v3/stock-dividend-calendar</code> - 배당 일정</li>
          <li>FMP <code>/v3/stock-split-calendar</code> - 주식분할 일정</li>
          <li>FMP <code>/v3/stock/list</code> - 전체 종목 목록 (캐시 갱신 시)</li>
        </ul>
      </div>

      <div class="note">
      <h4 id="endpoint-getEventLatest">2️⃣ GET /getEventLatest - 캐시 이벤트 조회</h4><br>
        <strong>📍 엔드포인트 파일:</strong> <code>src/api/endpoints/getEventLatest.js</code><br><br>
        <strong>📊 데이터 흐름:</strong>
        <pre><code>1. 캐시 파일 읽기
   ↓ src/services/cacheManager.js → loadEventCache()
   ↓ docs/getEventCache.json 읽기

2. 파일 존재 여부 검증
   ↓ 없으면 404 에러 (GET_EVENT_CACHE_NOT_AVAILABLE)
   ↓ 파싱 실패 시 503 에러 (CACHE_FILE_CORRUPTED)

3. JSON 응답 반환
   ↓ res.json(cachedData)</code></pre>

        <strong>🗂️ 관련 파일:</strong>
        <ul>
          <li><code>src/api/endpoints/getEventLatest.js</code> - 엔드포인트 핸들러 (메인)</li>
          <li><code>src/services/cacheManager.js</code> - 캐시 로드 (loadEventCache)</li>
          <li><code>docs/getEventCache.json</code> - 이벤트 캐시 (읽기 전용)</li>
        </ul>

        <strong>⚠️ 주의사항:</strong>
        <ul>
          <li>API 호출 없음 - 순수 파일 시스템 읽기</li>
          <li>최초 실행 시 반드시 <code>/getEvent</code> 먼저 호출 필요</li>
          <li>캐시 데이터는 마지막 <code>/getEvent</code> 호출 시점의 스냅샷</li>
        </ul>
      </div>
      
      <div class="note">
      <h4 id="endpoint-getValuation">3️⃣ GET /getValuation - 밸류에이션 계산</h4><br>
        <strong>📍 엔드포인트 파일:</strong> <code>src/api/endpoints/getValuation.js</code><br><br>
        <strong>📊 데이터 흐름:</strong>
        <pre><code>1. 티커 목록 결정
   ↓ cache=true → docs/getEventCache.json에서 추출
   ↓ cache=false → tickers 파라미터 파싱

2. 각 티커별 현재가 조회
   ↓ src/services/priceService.js → getCurrentPrice()
   ↓ src/lib/marketHours.js → isMarketOpen() (장중 판단)
   ↓ 장중: FMP /v3/quote/{ticker}
   ↓ 장외: FMP /v4/pre-post-market/{ticker}

3. 정량적 지표 계산
   ↓ src/services/valuationCalculator.js → calculateQuantitativeValuation()
   ↓ FMP /v3/income-statement/{ticker}?period=quarter&limit=4
   ↓ FMP /v3/balance-sheet-statement/{ticker}?period=quarter&limit=4
   ↓ src/lib/valuationHelpers.js → 지표 계산 로직
   ↓ PBR, PSR, PER, ROE, GrossMargin, OperatingMargin 등

4. Peer 정량 지표 계산
   ↓ src/services/peerEvaluationService.js → calculatePeerQuantitative()
   ↓ FMP /v3/stock-peers?symbol={ticker}
   ↓ 각 Peer에 대해 정량 지표 계산 (3단계 반복)
   ↓ 평균값 산출 (null 제외)

5. 정성적 지표 수집
   ↓ src/services/qualitativeCalculator.js → calculateQualitativeValuation()
   ↓ FMP /v4/price-target-consensus?symbol={ticker}
   ↓ FMP /v4/price-target-summary?symbol={ticker}
   ↓ ConsensusTargetPrice, PriceTargetSummary

6. 응답 조합
   ↓ { ticker, price, quantitative, peerQuantitative, qualitative }</code></pre>

        <strong>🗂️ 관련 파일:</strong>
        <ul>
          <li><code>src/api/endpoints/getValuation.js</code> - 엔드포인트 핸들러 (메인)</li>
          <li><code>src/services/priceService.js</code> - 현재가 조회 (getCurrentPrice)</li>
          <li><code>src/services/valuationCalculator.js</code> - 정량 지표 계산 (calculateQuantitativeValuation)</li>
          <li><code>src/services/peerEvaluationService.js</code> - Peer 분석 (calculatePeerQuantitative)</li>
          <li><code>src/services/qualitativeCalculator.js</code> - 정성 지표 수집 (calculateQualitativeValuation)</li>
          <li><code>src/services/fmpClient.js</code> - FMP API 호출 (fetchApi)</li>
          <li><code>src/lib/valuationHelpers.js</code> - 지표 계산 헬퍼 (ttmFromQuarterSumOrScaled 등)</li>
          <li><code>src/lib/marketHours.js</code> - 장중/장외 판단 (isMarketOpen)</li>
          <li><code>src/lib/configLoader.js</code> - API 설정 로드</li>
          <li><code>docs/config/evMethod.json</code> - 지표 계산 공식 정의</li>
          <li><code>docs/getEventCache.json</code> - 티커 목록 소스 (cache=true 시)</li>
        </ul>

        <strong>⚙️ 외부 API 의존성 (티커당):</strong>
        <ul>
          <li>FMP <code>/v3/quote/{ticker}</code> - 실시간 호가 (장중)</li>
          <li>FMP <code>/v4/pre-post-market/{ticker}</code> - 프리/포스트 마켓 (장외)</li>
          <li>FMP <code>/v3/income-statement/{ticker}</code> - 손익계산서 (4분기)</li>
          <li>FMP <code>/v3/balance-sheet-statement/{ticker}</code> - 재무상태표 (4분기)</li>
          <li>FMP <code>/v3/stock-peers?symbol={ticker}</code> - Peer 목록</li>
          <li>FMP <code>/v4/price-target-consensus?symbol={ticker}</code> - 애널리스트 컨센서스</li>
          <li>FMP <code>/v4/price-target-summary?symbol={ticker}</code> - 목표가 통계</li>
        </ul>

        <strong>📈 계산 복잡도:</strong>
        <ul>
          <li>티커 1개 = 약 7~10개 API 호출</li>
          <li>Peer 분석 포함 시 = (1 + Peer 수) × 4개 API 호출 추가</li>
          <li>예: 티커 1개 + Peer 3개 = 최대 22~26개 API 호출</li>
        </ul>
      </div>

      <div class="note">
      <h4 id="endpoint-refreshAnalystLog">4️⃣ GET /refreshAnalystLog - 애널리스트 로그 갱신</h4><br>
        <strong>📍 엔드포인트 파일:</strong> <code>src/api/endpoints/refreshAnalystLog.js</code><br><br>
        <strong>📊 데이터 흐름 (3단계 파이프라인):</strong>
        <pre><code>📍 Step 1: priceTarget=true (애널리스트 목표가 수집)
   ↓ src/services/analystCacheManager.js → refreshPriceTarget()
   ↓ docs/symbolCache.json 읽기 (티커 목록)
   ↓ 각 티커별 FMP /v3/analyst-estimates/{ticker} 호출
   ↓ 기존 docs/analystLog.json과 병합 (publishedDate 기준)
   ↓ 새 레코드만 추가, 기존 데이터 보존

📍 Step 2: frame=true (priceTrend 구조 초기화)
   ↓ src/services/analystCacheManager.js → initializePriceTrendFrame()
   ↓ docs/analystLog.json 읽기
   ↓ priceTrend 필드 없는 레코드 탐지
   ↓ D1~D365 null 값으로 초기화
   ↓ { D1: null, D2: null, ..., D365: null }

📍 Step 3: quote=true (과거 주가 데이터 채우기)
   ↓ src/services/analystCacheManager.js → fillPriceTrendQuotes()
   ↓ 각 레코드의 publishedDate 기준
   ↓ D+N일 날짜 계산 (예: publishedDate + 30일 = D30 날짜)
   ↓ FMP /v3/historical-price-full/{ticker}?from={date}&to={date+7}
   ↓ 7일 윈도우로 시장 휴무 대응
   ↓ priceTrend의 null 값만 채우기 (기존 값 보존)</code></pre>

        <strong>🗂️ 관련 파일:</strong>
        <ul>
          <li><code>src/api/endpoints/refreshAnalystLog.js</code> - 엔드포인트 핸들러 (메인)</li>
          <li><code>src/services/analystCacheManager.js</code> - 3단계 파이프라인 오케스트레이션
            <ul>
              <li><code>refreshPriceTarget()</code> - Step 1 실행</li>
              <li><code>initializePriceTrendFrame()</code> - Step 2 실행</li>
              <li><code>fillPriceTrendQuotes()</code> - Step 3 실행</li>
              <li><code>refreshAnalystLog()</code> - 전체 오케스트레이터</li>
            </ul>
          </li>
          <li><code>src/services/cacheManager.js</code> - symbolCache 로드</li>
          <li><code>src/services/fmpClient.js</code> - FMP API 호출</li>
          <li><code>src/lib/configLoader.js</code> - API 설정 로드</li>
          <li><code>src/lib/dateUtils.js</code> - 날짜 계산 (D+N)</li>
          <li><code>docs/symbolCache.json</code> - 티커 목록 (읽기)</li>
          <li><code>docs/analystLog.json</code> - 애널리스트 로그 (읽기/쓰기)</li>
        </ul>

        <strong>⚙️ 외부 API 의존성:</strong>
        <ul>
          <li>FMP <code>/v3/analyst-estimates/{ticker}</code> - 애널리스트 목표가 (Step 1)</li>
          <li>FMP <code>/v3/historical-price-full/{ticker}</code> - 과거 주가 (Step 3)</li>
        </ul>

        <strong>🔄 실행 모드:</strong>
        <table class="metric-table">
          <thead>
            <tr>
              <th>파라미터</th>
              <th>실행 단계</th>
              <th>용도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>파라미터 없음</td>
              <td>Step 1 → 2 → 3</td>
              <td>전체 파이프라인 실행 (기본값)</td>
            </tr>
            <tr>
              <td><code>priceTarget=true</code></td>
              <td>Step 1만</td>
              <td>신규 목표가만 수집</td>
            </tr>
            <tr>
              <td><code>frame=true</code></td>
              <td>Step 2만</td>
              <td>priceTrend 구조 초기화</td>
            </tr>
            <tr>
              <td><code>quote=true</code></td>
              <td>Step 3만</td>
              <td>누락된 주가 데이터 채우기</td>
            </tr>
            <tr>
              <td><code>tickers=AAPL,MSFT</code></td>
              <td>지정 티커만</td>
              <td>특정 종목 처리</td>
            </tr>
            <tr>
              <td><code>test=true</code></td>
              <td>상위 10개만</td>
              <td>테스트용 소량 실행</td>
            </tr>
          </tbody>
        </table>

        <strong>📊 데이터 구조 예시:</strong>
        <pre><code>{
  "meta": { "lastUpdated": "2025-11-27T...", "step": "fillQuotes" },
  "analysts": {
    "AAPL": [
      {
        "symbol": "AAPL",
        "publishedDate": "2025-10-15T...",
        "analystName": "John Doe",
        "analystCompany": "Goldman Sachs",
        "priceTarget": 195,
        "priceWhenPosted": 189,
        "priceTrend": {
          "D1": 190.5,
          "D7": 192.3,
          "D30": 198.1,
          "D365": null  // 아직 365일이 경과하지 않음
        }
      }
    ]
  }
}</code></pre>
      </div>
      
      <div class="note">
      <h4 id="endpoint-generateRating">5️⃣ GET /generateRating - 애널리스트 등급 생성</h4><br>
        <strong>📍 엔드포인트 파일:</strong> <code>src/api/endpoints/generateRating.js</code><br><br>
        <strong>📊 데이터 흐름:</strong>
        <pre><code>1. 애널리스트 로그 로드
   ↓ src/services/analystCacheManager.js → loadAnalystLog()
   ↓ docs/analystLog.json 읽기

2. 애널리스트 식별 및 그룹핑
   ↓ analystName + analystCompany 조합으로 고유 키 생성
   ↓ "John Doe|Goldman Sachs"

3. D+N 괴리율 계산
   ↓ 각 레코드별 gapRate = (D+N price / priceWhenPosted) - 1
   ↓ D1, D2, ..., D365 각 시점별 계산
   ↓ null 값 제외

4. 통계 산출 (각 D+N별)
   ↓ calculateStats() 함수 실행
   ↓ - meanGapRate: 평균 괴리율
   ↓ - stdGapRate: 표준편차 (변동성)
   ↓ - standardError: σ / √n (평균의 불확실성)
   ↓ - ci95Lower: mean - 1.96×SE (95% 신뢰구간 하한)
   ↓ - ci95Upper: mean + 1.96×SE (95% 신뢰구간 상한)
   ↓ - ci95Width: 신뢰구간 폭 (좁을수록 신뢰도↑)

5. timeToTarget 분석
   ↓ 목표가 ±2% 이내 도달한 첫 시점 탐지
   ↓ calculateQuantile() 함수로 25%, 50%, 75% 분위수 계산
   ↓ reachedRatio: 목표가 도달률

6. 정확도 메트릭
   ↓ accuracy = actualPrice / targetPrice
   ↓ 평균 및 표준편차 계산

7. 결과 저장
   ↓ src/services/analystCacheManager.js → writeFile()
   ↓ docs/analystRating.json 쓰기</code></pre>

        <strong>🗂️ 관련 파일:</strong>
        <ul>
          <li><code>src/api/endpoints/generateRating.js</code> - 엔드포인트 핸들러 (메인)</li>
          <li><code>src/services/analystCacheManager.js</code> - 등급 생성 로직
            <ul>
              <li><code>generateAnalystRating()</code> - 메인 함수</li>
              <li><code>calculateStats()</code> - 통계 계산 (mean, std, SE, CI)</li>
              <li><code>calculateQuantile()</code> - 분위수 계산</li>
              <li><code>loadAnalystLog()</code> - 로그 로드</li>
            </ul>
          </li>
          <li><code>src/lib/dateUtils.js</code> - 타임스탬프 생성</li>
          <li><code>docs/analystLog.json</code> - 입력 데이터 (읽기 전용)</li>
          <li><code>docs/analystRating.json</code> - 출력 데이터 (쓰기)</li>
        </ul>

        <strong>⚡ 성능 특성:</strong>
        <ul>
          <li><strong>API 호출: 0개</strong> - 순수 로컬 계산</li>
          <li>처리 시간: 일반적으로 < 100ms</li>
          <li>Rate Limit 영향: 없음</li>
          <li>캐시 기반 처리로 빠른 반복 실행 가능</li>
        </ul>

        <strong>📊 계산 공식:</strong>
        <ul>
          <li><strong>Gap Rate:</strong> <code>(D+N price / priceWhenPosted) - 1</code></li>
          <li><strong>Standard Error:</strong> <code>σ / √n</code></li>
          <li><strong>95% CI:</strong> <code>mean ± 1.96 × SE</code></li>
          <li><strong>Reached Ratio:</strong> <code>targetReachedCount / totalTargets</code></li>
        </ul>

        <strong>💾 출력 파일 구조:</strong>
        <pre><code>{
  "meta": {
    "analystCount": 76,
    "horizons": [1, 2, 3, ..., 365],
    "description": "Gap rate = (D+N price / priceWhenPosted) - 1"
  },
  "analysts": {
    "John Doe|Goldman Sachs": {
      "analystName": "John Doe",
      "analystCompany": "Goldman Sachs",
      "priceTargetCount": 15,
      "gapRates": {
        "D30": {
          "meanGapRate": 0.0842,
          "stdGapRate": 0.1523,
          "count": 15,
          "standardError": 0.0393,
          "ci95Lower": 0.0070,
          "ci95Upper": 0.1614,
          "ci95Width": 0.1544
        }
      },
      "timeToTarget": { ... },
      "accuracy": { ... }
    }
  }
}</code></pre>
      </div>

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
      <h2 id="resources">추가 리소스</h2>

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
      </div><!-- /.container -->
    </div><!-- /.content-wrapper -->
  </div><!-- /.page-wrapper -->

  <script>
    // Generate Table of Contents from headings
    (function() {
      const tocList = document.getElementById('toc-list');
      const container = document.querySelector('.container');
      // h1 제외하고 h2부터 출력
      const headings = container.querySelectorAll('h2, h3, h4');

      // 계층 구조로 변환: 상위 위계 항목이 하위 위계 항목들을 포함
      function createTOCItem(item) {
        const li = document.createElement('li');
        li.className = 'toc-item level-' + item.level;

        // 외부 박스 (호버/선택 상태 표시용)
        const a = document.createElement('a');
        a.href = '#' + item.id;
        a.className = 'toc-link';
        a.textContent = item.text;

        // Click handler for mobile: close sidebar after clicking
        a.addEventListener('click', function() {
          if (window.innerWidth <= 1024) {
            document.querySelector('.toc-sidebar').classList.remove('open');
          }
        });

        li.appendChild(a);
        return li;
      }

      // 계층 구조 생성
      const stack = []; // 상위 항목들을 추적하는 스택
      const rootItems = []; // 최상위 항목들
      
      headings.forEach((heading, index) => {
        const level = heading.tagName.toLowerCase();
        const levelNum = parseInt(level.charAt(1));

        // Create ID for heading if it doesn't have one
        if (!heading.id) {
          heading.id = 'section-' + index;
        }

        const item = {
          heading: heading,
          level: level,
          levelNum: levelNum,
          text: heading.textContent,
          id: heading.id,
          children: []
        };

        // 스택에서 현재 항목보다 상위인 항목들을 제거
        while (stack.length > 0 && stack[stack.length - 1].levelNum >= levelNum) {
          stack.pop();
        }

        // 상위 항목이 있으면 하위 항목으로 추가
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(item);
        } else {
          // 최상위 항목이면 루트에 추가
          rootItems.push(item);
        }

        // 현재 항목을 스택에 추가
        stack.push(item);
      });

      // 계층 구조를 DOM으로 변환
      function renderTOCItem(item, parentList) {
        const li = createTOCItem(item);
        
        // 하위 항목이 있으면 박스로 묶기
        if (item.children.length > 0) {
          const childBox = document.createElement('ul');
          childBox.className = 'toc-group-box toc-group-' + item.level;
          
          item.children.forEach(child => {
            renderTOCItem(child, childBox);
          });
          
          li.appendChild(childBox);
        }
        
        parentList.appendChild(li);
      }

      // 루트 항목들을 렌더링
      rootItems.forEach(item => {
        renderTOCItem(item, tocList);
      });

      // Highlight active section on scroll
      function updateActiveTOC() {
        const scrollPosition = window.scrollY + 100; // Offset for better UX
        const tocSidebar = document.querySelector('.toc-sidebar');
        let activeLink = null;

        headings.forEach((heading) => {
          const section = heading;
          const link = document.querySelector('.toc-link[href="#' + heading.id + '"]');

          if (!link) return;

          if (section.offsetTop <= scrollPosition &&
              section.offsetTop + section.offsetHeight > scrollPosition) {
            // Remove active from all
            document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
            // Add active to current
            link.classList.add('active');
            activeLink = link;
          }
        });

        // 활성화된 링크가 보이도록 목차 스크롤 조정
        if (activeLink && tocSidebar) {
          const linkRect = activeLink.getBoundingClientRect();
          const sidebarRect = tocSidebar.getBoundingClientRect();
          
          // 링크가 사이드바 뷰포트 밖에 있는지 확인
          const isAboveViewport = linkRect.top < sidebarRect.top;
          const isBelowViewport = linkRect.bottom > sidebarRect.bottom;
          
          if (isAboveViewport || isBelowViewport) {
            // 링크를 사이드바 중앙 근처에 위치시키기
            const linkTop = activeLink.offsetTop;
            const sidebarScrollTop = tocSidebar.scrollTop;
            const sidebarHeight = tocSidebar.clientHeight;
            const linkHeight = activeLink.offsetHeight;
            
            // 링크를 사이드바 중앙에 맞추기 위한 스크롤 위치 계산
            const targetScrollTop = linkTop - (sidebarHeight / 2) + (linkHeight / 2);
            
            // 부드러운 스크롤
            tocSidebar.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          }
        }
      }

      // Update on scroll
      window.addEventListener('scroll', updateActiveTOC);
      // Initial update
      updateActiveTOC();

      // ===== Search Functionality =====
      const searchInput = document.getElementById('toc-search-input');
      const searchClear = document.getElementById('toc-search-clear');
      const searchResultCount = document.getElementById('toc-search-result-count');
      const allTocItems = Array.from(document.querySelectorAll('.toc-item'));

      // Store original text content for searching (title + body content)
      allTocItems.forEach(item => {
        const link = item.querySelector('.toc-link');
        if (link && link.hash) {
          const targetId = link.hash.substring(1);
          const targetElement = document.getElementById(targetId);

          if (targetElement) {
            // Get title text
            const titleText = link.textContent.toLowerCase();

            // Get body content under this section
            let bodyText = '';
            let currentElement = targetElement.nextElementSibling;

            // Collect text until next heading of same or higher level
            const targetLevel = parseInt(targetElement.tagName.charAt(1));

            while (currentElement) {
              const currentLevel = currentElement.tagName.match(/^H([1-6])$/);

              if (currentLevel && parseInt(currentLevel[1]) <= targetLevel) {
                break;
              }

              bodyText += ' ' + currentElement.textContent.toLowerCase();
              currentElement = currentElement.nextElementSibling;
            }

            item.dataset.searchText = titleText + bodyText;
          } else {
            item.dataset.searchText = link.textContent.toLowerCase();
          }
        }
      });

      function filterTOC(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        // Show/hide clear button
        if (term) {
          searchClear.classList.add('show');
        } else {
          searchClear.classList.remove('show');
        }

        // If search is empty, show all items
        if (!term) {
          allTocItems.forEach(item => {
            item.style.display = '';
          });
          // Show all group boxes
          document.querySelectorAll('.toc-group-box').forEach(box => {
            box.style.display = '';
          });
          searchResultCount.textContent = '';
          return;
        }

        let matchCount = 0;
        const matchedItems = new Set();
        const itemsToShow = new Set();

        // Find all matching items (search in title + body)
        allTocItems.forEach(item => {
          const searchText = item.dataset.searchText || '';
          if (searchText.includes(term)) {
            matchedItems.add(item);
            matchCount++;
          }
        });

        // For each matched item, show it and all its ancestors
        matchedItems.forEach(item => {
          itemsToShow.add(item);

          // Show all parent items
          let parent = item.parentElement;
          while (parent && parent !== tocList) {
            if (parent.classList.contains('toc-item')) {
              itemsToShow.add(parent);
            }
            parent = parent.parentElement;
          }

          // Show all child items
          const childItems = item.querySelectorAll('.toc-item');
          childItems.forEach(child => itemsToShow.add(child));
        });

        // Hide/show items based on search
        allTocItems.forEach(item => {
          if (itemsToShow.has(item)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });

        // Hide/show group boxes
        document.querySelectorAll('.toc-group-box').forEach(box => {
          const visibleChildren = Array.from(box.children).some(
            child => child.style.display !== 'none'
          );
          box.style.display = visibleChildren ? '' : 'none';
        });

        // Update result count
        if (matchCount === 0) {
          searchResultCount.textContent = '검색 결과 없음';
        } else if (matchCount === 1) {
          searchResultCount.textContent = '1개 항목';
        } else {
          searchResultCount.textContent = matchCount + '개 항목';
        }
      }

      // Event listeners
      searchInput.addEventListener('input', (e) => {
        filterTOC(e.target.value);
      });

      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        filterTOC('');
        searchInput.focus();
      });

      // Clear search on Escape key
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          filterTOC('');
        }
      });
    })();
  </script>

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
