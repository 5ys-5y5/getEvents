/**
 * Home Page - Dashboard with links to all sections
 * GET /
 */

export default function homePage(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Financial Event API - Home</title>
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

    /* ========== Top Navigation Bar ========== */
    .top-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #2b2b2b;
      border-bottom: 1px solid #1a1a1a;
      z-index: 3000;
      display: flex;
      align-items: center;
      padding: 0 24px;
    }

    .top-nav-brand {
      font-size: 1.1rem;
      font-weight: 600;
      color: #e0e0e0;
      margin-right: 32px;
      text-decoration: none;
      white-space: nowrap;
    }

    .top-nav-links {
      display: flex;
      gap: 4px;
      flex: 1;
      align-items: center;
    }

    .top-nav-link {
      padding: 8px 16px;
      border-radius: 6px;
      color: #c0c0c0;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .top-nav-link:hover {
      background: #3a3a3a;
      color: #ffffff;
    }

    .top-nav-link.active {
      background: #0066cc;
      color: #ffffff;
    }

    .top-nav-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .top-nav-user {
      padding: 8px 12px;
      color: #e0e0e0;
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .top-nav-login {
      background: #0066cc;
      color: #ffffff;
    }

    .top-nav-login:hover {
      background: #0052a3;
    }

    .top-nav-logout {
      background: #c62828;
      color: #ffffff;
    }

    .top-nav-logout:hover {
      background: #a82020;
    }

    .top-nav-toggle {
      display: none;
      background: none;
      border: none;
      color: #e0e0e0;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 8px;
    }

    @media (max-width: 900px) {
      .top-nav {
        padding: 0 16px;
      }

      .top-nav-brand {
        margin-right: auto;
        font-size: 1rem;
      }

      .top-nav-toggle {
        display: block;
      }

      .top-nav-links {
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        background: #2b2b2b;
        flex-direction: column;
        padding: 16px;
        gap: 8px;
        border-bottom: 1px solid #1a1a1a;
        transform: translateY(-100%);
        opacity: 0;
        transition: all 0.3s;
        pointer-events: none;
      }

      .top-nav-links.open {
        transform: translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      .top-nav-link {
        width: 100%;
        text-align: left;
      }

      .top-nav-right {
        width: 100%;
        margin-left: 0;
      }
    }

    body {
      padding-top: 60px;
    }

    /* Main Container */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 64px;
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #111111;
      margin-bottom: 16px;
    }

    .header p {
      font-size: 1.1rem;
      color: #666666;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }

    .card {
      background: #ffffff;
      border: 1px solid #dddddd;
      border-radius: 6px;
      padding: 32px;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      border-color: #0066cc;
    }

    .card-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 1.4rem;
      font-weight: 600;
      color: #111111;
      margin-bottom: 12px;
    }

    .card-description {
      font-size: 0.95rem;
      color: #666666;
      line-height: 1.6;
      flex: 1;
    }

    .card-meta {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eeeeee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #999999;
    }

    .card-badge {
      background: #f0f0f0;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 500;
    }

    .card-badge.api { background: #e3f2fd; color: #1976d2; }
    .card-badge.management { background: #f3e5f5; color: #7b1fa2; }
    .card-badge.tracking { background: #e8f5e9; color: #388e3c; }
    .card-badge.analytics { background: #fff3e0; color: #f57c00; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px;
      color: #888888;
      font-size: 0.9rem;
      border-top: 1px solid #dddddd;
      margin-top: 64px;
    }

    /* Status Indicator */
    .status-indicator {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #ffffff;
      border: 1px solid #dddddd;
      border-radius: 8px;
      padding: 12px 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4caf50;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <!-- Top Navigation -->
  <nav class="top-nav">
    <a href="/" class="top-nav-brand">📊 Financial API</a>
    <button class="top-nav-toggle" onclick="document.querySelector('.top-nav-links').classList.toggle('open')">☰</button>
    <div class="top-nav-links">
      <a href="/apiguide" class="top-nav-link">API Guide</a>
      <a href="/control" class="top-nav-link">Control</a>
      <a href="/tracker" class="top-nav-link">Tracker</a>
      <a href="/proceeding" class="top-nav-link">Proceeding</a>
      <a href="/dashboard" class="top-nav-link">Dashboard</a>
      <a href="/pattern" class="top-nav-link">Pattern</a>
      <div class="top-nav-right">
        ${req.user ? `
          <span class="top-nav-user">👤 ${req.user.username}</span>
          <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
        ` : `
          <a href="/auth/login" class="top-nav-link top-nav-login">로그인</a>
        `}
        <a href="/" class="top-nav-link active">🏠 Home</a>
      </div>
    </div>
  </nav>

  <!-- Main Container -->
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Financial Event API</h1>
      <p>재무 이벤트 데이터와 밸류에이션 지표를 제공하는 통합 플랫폼</p>
    </div>

    <!-- Cards Grid -->
    <div class="cards-grid">
      <!-- API Guide -->
      <a href="/apiguide" class="card">
        <div class="card-icon">📚</div>
        <h2 class="card-title">API Guide</h2>
        <p class="card-description">
          API 엔드포인트 사용 방법, 파라미터 설명, 응답 형식 등 상세한 개발 가이드를 제공합니다.
        </p>
        <div class="card-meta">
          <span class="card-badge api">Documentation</span>
          <span>→</span>
        </div>
      </a>

      <!-- Control Panel -->
      <a href="/control" class="card">
        <div class="card-icon">⚙️</div>
        <h2 class="card-title">Control Panel</h2>
        <p class="card-description">
          시스템 설정, 환경변수, API 키, 스케줄러 등 모든 설정을 관리하고 저장합니다.
        </p>
        <div class="card-meta">
          <span class="card-badge management">Management</span>
          <span>→</span>
        </div>
      </a>

      <!-- Tracker -->
      <a href="/tracker" class="card">
        <div class="card-icon">📊</div>
        <h2 class="card-title">Price Tracker</h2>
        <p class="card-description">
          거래 데이터를 등록하고 D+1 ~ D+14 성과를 추적합니다. CSV, JSON, TSV 파일 업로드 지원.
        </p>
        <div class="card-meta">
          <span class="card-badge tracking">Tracking</span>
          <span>→</span>
        </div>
      </a>

      <!-- Proceeding -->
      <a href="/proceeding" class="card">
        <div class="card-icon">⚡</div>
        <h2 class="card-title">Proceeding</h2>
        <p class="card-description">
          Price Tracker와 Analyst 작업을 통합 관리하고 실시간 진행 상황을 모니터링합니다.
        </p>
        <div class="card-meta">
          <span class="card-badge tracking">Operations</span>
          <span>→</span>
        </div>
      </a>

      <!-- Dashboard -->
      <a href="/dashboard" class="card">
        <div class="card-icon">📈</div>
        <h2 class="card-title">Trade Analytics</h2>
        <p class="card-description">
          등록된 거래의 성과를 모델별, 보유기간별, 포지션별로 분석하고 시각화합니다.
        </p>
        <div class="card-meta">
          <span class="card-badge analytics">Analytics</span>
          <span>→</span>
        </div>
      </a>

      <!-- Pattern Analysis -->
      <a href="/pattern" class="card">
        <div class="card-icon">🔍</div>
        <h2 class="card-title">Pattern Analysis</h2>
        <p class="card-description">
          애널리스트 목표가 방향(상향/하향/유지)별 주가 패턴을 분석하고 최적 거래 전략을 제시합니다.
        </p>
        <div class="card-meta">
          <span class="card-badge analytics">Analysis</span>
          <span>→</span>
        </div>
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Financial Event API v3.0 | Powered by Financial Modeling Prep & Supabase</p>
      <p style="margin-top: 8px; font-size: 0.85rem;">
        <a href="/health" style="color: #0066cc; text-decoration: none;">Health Check</a> |
        <a href="/apiguide" style="color: #0066cc; text-decoration: none; margin-left: 12px;">Documentation</a>
      </p>
    </div>
  </div>

  <!-- Status Indicator -->
  <div class="status-indicator">
    <div class="status-dot"></div>
    <span>System Online</span>
  </div>
</body>
</html>
  `;

  res.send(html);
}
