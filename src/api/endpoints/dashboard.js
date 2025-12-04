/**
 * GET /dashboard - Trade Analytics Dashboard
 * Analyzes trades from DB and displays patterns by model, position, and date
 *
 * Authentication: Requires session-based login (handled by requireAuth middleware)
 */

import { supabase } from '../../config/supabase.js';
import { TABLES, RETURN_CAP } from '../../config/appConfig.js';

// Load all trades from DB
async function loadAllTrades() {
  if (!supabase) {
    return [];
  }

  const pageSize = 1000;
  let offset = 0;
  let allTrades = [];

  while (true) {
    const { data, error } = await supabase
      .from(TABLES.TRADES)
      .select('*')
      .range(offset, offset + pageSize - 1)
      .order('purchase_date', { ascending: false });

    if (error) throw new Error(`Failed to load trades: ${error.message}`);
    if (!data || data.length === 0) break;

    allTrades = allTrades.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allTrades.map(row => ({
    position: row.position,
    modelName: row.model_name,
    ticker: row.ticker,
    purchaseDate: row.purchase_date,
    currentPrice: row.current_price,
    priceHistory: row.price_history,
    returns: row.returns,           // Pure returns with OHLC data for dynamic cap calculation
    meta: row.meta
  }));
}

// API endpoint for fetching trades data
export async function dashboardDataHandler(req, res) {
  // Authentication is handled by requireAuth middleware in index.js

  try {
    const trades = await loadAllTrades();
    // Include current RETURN_CAP settings for dynamic calculation
    res.json({ 
      success: true, 
      trades, 
      count: trades.length,
      returnCapSettings: RETURN_CAP || { MAX_CAP_PCT: 0.20, LOW_CAP_PCT: 0.05, ENABLED: true }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default function dashboardPage(req, res) {
  // Authentication is handled by requireAuth middleware in index.js

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Trade Analytics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      /* Light theme matching apiGuide.js */
      --bg-primary: #999999;        /* Page background (grey) */
      --bg-secondary: #2b2b2b;      /* Sidebar background (dark) */
      --bg-card: #ffffff;           /* Content cards (white) */
      --bg-hover: #f5f5f5;          /* Hover state */
      --border: #dddddd;            /* Standard borders */
      --text-primary: #111111;      /* Main text (dark on light) */
      --text-secondary: #666666;    /* Secondary text */
      --text-muted: #888888;        /* Muted text */
      --accent: #0066cc;            /* Primary blue accent */
      --accent-hover: #0052a3;      /* Darker blue on hover */
      --success: #2e7d32;           /* Success green */
      --success-bg: rgba(46, 125, 50, 0.1);
      --error: #c62828;             /* Error red */
      --error-bg: rgba(198, 40, 40, 0.1);
      --warning: #f57c00;           /* Warning orange */
      --warning-bg: rgba(245, 124, 0, 0.1);
      --chart-1: #0066cc;           /* Blue */
      --chart-2: #2e7d32;           /* Green */
      --chart-3: #f57c00;           /* Orange */
      --chart-4: #c62828;           /* Red */
      --chart-5: #7b1fa2;           /* Purple */
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
    }
    
    /* Sidebar */
    .sidebar {
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid #1a1a1a;
      height: calc(100vh - 60px);
      position: fixed;
      left: 0;
      top: 60px;
      display: flex;
      flex-direction: column;
      z-index: 100;
      color: #e0e0e0; /* Light text on dark sidebar */
    }
    
    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid #1a1a1a;
    }
    
    .sidebar-header h1 {
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .sidebar-header .icon {
      font-size: 1.5rem;
    }
    
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
    }
    
    .nav-section {
      margin-bottom: 24px;
    }
    
    .nav-section-title {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #888888; /* Light grey for dark sidebar */
      padding: 0 8px;
      margin-bottom: 8px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #cccccc; /* Light text for dark sidebar */
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 4px;
    }

    .nav-item:hover {
      background: #3a3a3a; /* Lighter than sidebar bg */
      color: #ffffff;
    }

    .nav-item.active {
      background: var(--accent);
      color: white;
    }
    
    .nav-item .icon {
      font-size: 1.1rem;
      width: 24px;
      text-align: center;
    }
    
    /* Status Widget in Sidebar */
    .sidebar-status-widget {
      padding: 16px 20px;
      border-top: 1px solid #1a1a1a;
    }

    .status-widget-title {
      font-size: 0.7rem;
      font-weight: 600;
      color: #888888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .status-widget-box {
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 8px;
      padding: 12px;
    }

    .status-widget-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      font-size: 0.85rem;
      color: #e0e0e0;
      font-weight: 500;
    }

    .status-widget-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid #3a3a3a;
      border-top-color: #0066cc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: none;
    }

    .status-widget-box.running .status-widget-spinner {
      display: block;
    }

    .status-widget-progress {
      margin-bottom: 10px;
    }

    .status-widget-progress-bar {
      height: 6px;
      background: #0a0a0a;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 6px;
    }

    .status-widget-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0066cc, #2e7d32);
      width: 0%;
      transition: width 0.3s ease;
    }

    .status-widget-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: #888888;
    }

    .status-widget-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 0.7rem;
    }

    .status-widget-stat {
      display: flex;
      justify-content: space-between;
      color: #cccccc;
    }

    .status-widget-stat strong {
      color: #ffffff;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid #1a1a1a;
      font-size: 0.8rem;
      color: #888888;
    }
    
    /* Main Content */
    .main-content {
      margin-left: 280px;
      flex: 1;
      min-height: calc(100vh - 60px);
      padding: 32px;
    }
    
    .page-header {
      margin-bottom: 32px;
    }
    
    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .page-description {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px;
    }
    
    .stat-card .label {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 8px;
    }
    
    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
    }
    
    .stat-card .change {
      font-size: 0.85rem;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .stat-card .change.positive { color: var(--success); }
    .stat-card .change.negative { color: var(--error); }
    
    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 24px;
    }
    
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .card-body {
      padding: 24px;
    }
    
    /* Tables */
    .table-wrapper {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: var(--bg-secondary);
    }
    
    tr:hover td {
      background: var(--bg-hover);
    }
    
    .ticker {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: var(--accent);
    }
    
    .position-long { color: var(--success); }
    .position-short { color: var(--error); }
    
    .return-positive { color: var(--success); }
    .return-negative { color: var(--error); }
    
    /* Charts */
    .chart-container {
      position: relative;
      height: 300px;
    }
    
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 200px;
      padding: 20px 0;
    }
    
    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    
    .bar {
      width: 100%;
      max-width: 60px;
      border-radius: 4px 4px 0 0;
      transition: all 0.3s;
      position: relative;
    }
    
    .bar:hover {
      opacity: 0.8;
    }
    
    .bar.positive { background: var(--success); }
    .bar.negative { background: var(--error); }
    
    .bar-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }
    
    .bar-value {
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
    }
    
    /* Heatmap */
    .heatmap-grid {
      display: grid;
      gap: 4px;
    }
    
    .heatmap-cell {
      aspect-ratio: 1;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s;
    }
    
    .heatmap-cell:hover {
      transform: scale(1.1);
      z-index: 1;
    }
    
    /* Filters */
    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .filter-label {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    select, input[type="date"] {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-primary);
      font-size: 0.9rem;
      cursor: pointer;
    }
    
    select:focus, input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .badge-success { background: var(--success-bg); color: var(--success); }
    .badge-error { background: var(--error-bg); color: var(--error); }
    .badge-warning { background: var(--warning-bg); color: var(--warning); }
    
    /* Loading */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: var(--text-muted);
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Dashboard Views */
    .dashboard-view {
      display: none;
    }
    
    .dashboard-view.active {
      display: block;
    }
    
    /* Performance Grid */
    .performance-grid {
      display: grid;
      grid-template-columns: repeat(14, 1fr);
      gap: 4px;
      margin-top: 16px;
    }
    
    .day-header {
      text-align: center;
      font-size: 0.7rem;
      color: var(--text-muted);
      padding: 8px 0;
    }
    
    .perf-cell {
      aspect-ratio: 1;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
    }
    
    /* Tooltip */
    .tooltip {
      position: fixed;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 0.85rem;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
    }
    
    .tooltip-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .tooltip-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 2px 0;
    }
    
    .tooltip-label { color: var(--text-muted); }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    
    .empty-state .icon {
      font-size: 4rem;
      margin-bottom: 16px;
    }
    
    .empty-state h3 {
      font-size: 1.2rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    /* Responsive */
    @media (max-width: 1024px) {
      .sidebar {
        width: 80px;
      }
      .sidebar-header h1 span:not(.icon) { display: none; }
      .nav-item span:not(.icon) { display: none; }
      .main-content { 
        margin-left: 80px;
        padding: 24px;
      }
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

    .top-nav-logout {
      background: #c62828;
      color: #ffffff;
    }

    .top-nav-logout:hover {
      background: #a82020;
    }

    .top-nav-link.active {
      background: #0066cc;
      color: #ffffff;
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
    }

    body {
      padding-top: 60px;
    }

    .sidebar {
      top: 60px;
      height: calc(100vh - 60px);
    }

    .main-content {
      padding-top: 24px;
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
      <a href="/dashboard" class="top-nav-link active">Dashboard</a>
      <a href="/pattern" class="top-nav-link">Pattern</a>
      <div class="top-nav-right">
        <span class="top-nav-user">👤 ${req.user.username}</span>
        <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
        <a href="/" class="top-nav-link">🏠 Home</a>
      </div>
    </div>
  </nav>

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1><span class="icon">📊</span> <span>Dashboard</span></h1>
    </div>
    
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">Overview</div>
        <div class="nav-item active" data-view="overview">
          <span class="icon">🏠</span>
          <span>전체 현황</span>
        </div>
      </div>
      
      <div class="nav-section">
        <div class="nav-section-title">분석 방식</div>
        <div class="nav-item" data-view="by-model">
          <span class="icon">🤖</span>
          <span>모델별 성과</span>
        </div>
        <div class="nav-item" data-view="by-position">
          <span class="icon">📈</span>
          <span>포지션별 성과</span>
        </div>
        <div class="nav-item" data-view="by-date">
          <span class="icon">📅</span>
          <span>거래일별 성과</span>
        </div>
        <div class="nav-item" data-view="by-day">
          <span class="icon">⏱️</span>
          <span>보유일별 성과</span>
        </div>
      </div>
      
      <div class="nav-section">
        <div class="nav-section-title">상세 분석</div>
        <div class="nav-item" data-view="heatmap">
          <span class="icon">🗺️</span>
          <span>히트맵</span>
        </div>
        <div class="nav-item" data-view="trades">
          <span class="icon">📋</span>
          <span>거래 목록</span>
        </div>
      </div>
    </nav>

    <!-- Global Status Widget -->
    <div class="sidebar-status-widget">
      <div class="status-widget-title">API Status</div>
      <div class="status-widget-box" id="globalStatusWidget">
        <div class="status-widget-header">
          <div class="status-widget-spinner"></div>
          <span id="globalStatusText">⏸️ 대기 중</span>
        </div>
        <div class="status-widget-progress">
          <div class="status-widget-progress-bar">
            <div class="status-widget-progress-fill" id="globalStatusProgressFill"></div>
          </div>
          <div class="status-widget-info">
            <span id="globalStatusProgress">0/0 (0%)</span>
            <span id="globalStatusEta">--:--</span>
          </div>
        </div>
        <div class="status-widget-stats">
          <div class="status-widget-stat">
            <span>✅ 성공</span>
            <strong id="globalStatusSuccess">0</strong>
          </div>
          <div class="status-widget-stat">
            <span>❌ 실패</span>
            <strong id="globalStatusFail">0</strong>
          </div>
          <div class="status-widget-stat">
            <span>⏭️ 스킵</span>
            <strong id="globalStatusSkip">0</strong>
          </div>
          <div class="status-widget-stat">
            <span>🔄 업데이트</span>
            <strong id="globalStatusUpdate">0</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div>마지막 업데이트</div>
      <div id="lastUpdated">-</div>
    </div>
  </aside>
  
  <!-- Main Content -->
  <main class="main-content">
    <!-- Loading State -->
    <div id="loadingState" class="loading">
      <div class="spinner"></div>
      <p>데이터 로딩 중...</p>
    </div>
    
    <!-- Global Return Type Filter with Dynamic Cap Settings -->
    <div class="filters" style="margin-bottom: 24px; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border);">
      <div class="filter-group">
        <span class="filter-label">수익률 타입:</span>
        <select id="returnTypeFilter" onchange="changeReturnType(this.value)">
          <option value="cap">Cap 적용</option>
          <option value="pure">순수 수익률 (Cap 미적용)</option>
        </select>
      </div>
      <div class="filter-group" id="capSettingsGroup">
        <span class="filter-label">익절 상한:</span>
        <input type="number" id="maxCapInput" step="0.01" min="0" max="1" value="0.20" style="width: 80px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text-primary);" onchange="updateCapSettings()">
        <span class="filter-label" style="margin-left: 12px;">손절 하한:</span>
        <input type="number" id="lowCapInput" step="0.01" min="0" max="1" value="0.05" style="width: 80px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text-primary);" onchange="updateCapSettings()">
      </div>
      <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 16px;" id="capDescription">
        💡 Cap 적용: 일중 상한/하한 도달 시 시가 청산 가정
      </span>
    </div>

    <!-- 기능 안내 박스 -->
    <div style="background: linear-gradient(135deg, rgba(0, 102, 204, 0.1), rgba(46, 125, 50, 0.1)); border: 1px solid #0066cc; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
      <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: #0066cc;">📚 Dashboard 페이지 기능 안내</h4>
      <p style="font-size: 0.9rem; line-height: 1.7; margin-bottom: 16px; color: #111111;">
        <strong>Trade Analytics Dashboard</strong>는 Price Tracker에서 등록한 거래들의 성과를 다각도로 분석하는 종합 대시보드입니다.
      </p>
      
      <div style="padding-left: 16px;">
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">🎯 전체 현황 (Overview)</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
          <li><strong>수익률 타입 선택</strong>: Cap 적용 vs 순수 수익률 전환 가능</li>
          <li><strong>주요 지표</strong>: 총 거래 수, 모델 수, 평균 D+14 수익률, 전체 누적 수익률, Long/Short 거래 수</li>
          <li><strong>일별 누적 수익률</strong>: D+1부터 D+14까지 보유일별 평균 수익률 차트</li>
          <li><strong>최근 거래</strong>: 가장 최근에 등록된 거래들의 D+7, D+14 성과</li>
        </ul>
        
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">🤖 모델별 성과</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
          <li><strong>모델 비교</strong>: 각 MODEL 이름별 거래 수, 승률, 평균 수익률 비교</li>
          <li><strong>최적 보유일</strong>: 모델별로 가장 수익성이 높은 청산 시점</li>
          <li><strong>최대 수익/손실</strong>: 각 모델의 베스트/워스트 케이스</li>
        </ul>
        
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📈 포지션별 성과</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
          <li><strong>Long vs Short</strong>: 매수/매도 포지션별 성과 비교</li>
          <li><strong>포지션별 일간 수익률</strong>: 각 보유일별 Long/Short 수익률 차트</li>
        </ul>
        
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📅 거래일별 성과</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
          <li><strong>날짜 필터</strong>: 특정 기간의 거래만 조회 가능</li>
          <li><strong>요일별 분석</strong>: 어떤 요일에 시작한 거래가 수익성이 높은지 확인</li>
          <li><strong>일별 통계</strong>: 해당 날짜의 거래 수, Long/Short 비율, 평균 수익률</li>
        </ul>
        
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">⏱️ 보유일별 성과</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
          <li><strong>최적 청산 시점</strong>: D+1 ~ D+14 중 가장 수익성 높은 날 찾기</li>
          <li><strong>통계 지표</strong>: 각 보유일의 평균, 승률, 표준편차, 최대/최소값</li>
          <li><strong>수익률 변동</strong>: 보유 기간에 따른 수익률 추이 분석</li>
        </ul>
        
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">🗺️ 성과 히트맵</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
          <li><strong>모델 × 보유일 조합</strong>: 2D 히트맵으로 모든 조합의 성과 시각화</li>
          <li><strong>지표 선택</strong>: 평균 수익률 / 승률 / 거래 수 전환 가능</li>
          <li><strong>포지션 필터</strong>: 전체 / Long / Short 선택</li>
        </ul>
        
        <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📋 거래 목록</p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; color: #111111;">
          <li><strong>전체 거래 내역</strong>: 모든 거래의 D+1 ~ D+14 수익률 상세 조회</li>
          <li><strong>필터링</strong>: 모델 또는 포지션별로 거래 필터링</li>
          <li><strong>성과 추적</strong>: 각 거래의 시간에 따른 수익률 변화</li>
        </ul>
        
        <p style="font-size: 0.85rem; color: #666666; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <strong>💡 Cap 설정</strong>: 상단의 수익률 타입 필터에서 Cap 적용 여부와 상한/하한값을 조정할 수 있습니다. 
          Cap 적용 시 일중 상한/하한 도달 시 다음날 시가에 청산한 것으로 가정하여 더 현실적인 수익률을 계산합니다.
        </p>
      </div>
    </div>

    <!-- Overview View -->
    <div id="view-overview" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">📊 전체 현황</h2>
        <p class="page-description">모든 거래의 종합 성과를 확인합니다</p>
      </div>
      
      <div class="stats-grid" id="overviewStats"></div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📈 일별 누적 수익률 (D+1 ~ D+14)</h3>
        </div>
        <div class="card-body">
          <div class="bar-chart" id="dailyReturnsChart"></div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏆 최근 거래</h3>
        </div>
        <div class="card-body">
          <div class="table-wrapper">
            <table id="recentTradesTable">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>포지션</th>
                  <th>모델</th>
                  <th>티커</th>
                  <th>진입가</th>
                  <th>D+7 수익률</th>
                  <th>D+14 수익률</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- By Model View -->
    <div id="view-by-model" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">🤖 모델별 성과</h2>
        <p class="page-description">각 모델의 성과를 비교 분석합니다</p>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">모델별 평균 수익률</h3>
        </div>
        <div class="card-body">
          <div class="table-wrapper">
            <table id="modelPerformanceTable">
              <thead>
                <tr>
                  <th>모델</th>
                  <th>거래 수</th>
                  <th>승률</th>
                  <th>평균 수익률</th>
                  <th>최대 수익</th>
                  <th>최대 손실</th>
                  <th>최적 보유일</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">모델별 일간 수익률 추이</h3>
        </div>
        <div class="card-body">
          <div id="modelDailyChart"></div>
        </div>
      </div>
    </div>
    
    <!-- By Position View -->
    <div id="view-by-position" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">📈 포지션별 성과</h2>
        <p class="page-description">Long/Short 포지션의 성과를 비교합니다</p>
      </div>
      
      <div class="stats-grid" id="positionStats"></div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">포지션별 일간 수익률</h3>
        </div>
        <div class="card-body">
          <div id="positionDailyChart"></div>
        </div>
      </div>
    </div>
    
    <!-- By Date View -->
    <div id="view-by-date" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">📅 거래일별 성과</h2>
        <p class="page-description">거래 시작일에 따른 성과를 분석합니다</p>
      </div>
      
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">기간:</span>
          <input type="date" id="dateFrom">
          <span>~</span>
          <input type="date" id="dateTo">
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">일별 거래 성과</h3>
        </div>
        <div class="card-body">
          <div class="table-wrapper">
            <table id="datePerformanceTable">
              <thead>
                <tr>
                  <th>거래일</th>
                  <th>요일</th>
                  <th>거래 수</th>
                  <th>Long</th>
                  <th>Short</th>
                  <th>평균 D+7</th>
                  <th>평균 D+14</th>
                  <th>승률</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- By Holding Day View -->
    <div id="view-by-day" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">⏱️ 보유일별 성과</h2>
        <p class="page-description">D+1부터 D+14까지 각 보유일의 성과를 분석합니다</p>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">보유일별 평균 수익률 및 승률</h3>
        </div>
        <div class="card-body">
          <div class="table-wrapper">
            <table id="holdingDayTable">
              <thead>
                <tr>
                  <th>보유일</th>
                  <th>데이터 수</th>
                  <th>평균 수익률</th>
                  <th>승률</th>
                  <th>표준편차</th>
                  <th>최대 수익</th>
                  <th>최대 손실</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">최적 청산 시점 분석</h3>
        </div>
        <div class="card-body">
          <div id="optimalExitAnalysis"></div>
        </div>
      </div>
    </div>
    
    <!-- Heatmap View -->
    <div id="view-heatmap" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">🗺️ 성과 히트맵</h2>
        <p class="page-description">모델 × 보유일 조합의 성과를 시각화합니다</p>
      </div>
      
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">포지션:</span>
          <select id="heatmapPosition">
            <option value="all">전체</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div class="filter-group">
          <span class="filter-label">지표:</span>
          <select id="heatmapMetric">
            <option value="avgReturn">평균 수익률</option>
            <option value="winRate">승률</option>
            <option value="count">거래 수</option>
          </select>
        </div>
      </div>
      
      <div class="card">
        <div class="card-body">
          <div id="heatmapContainer"></div>
        </div>
      </div>
    </div>
    
    <!-- Trades List View -->
    <div id="view-trades" class="dashboard-view">
      <div class="page-header">
        <h2 class="page-title">📋 거래 목록</h2>
        <p class="page-description">모든 거래 내역을 확인합니다</p>
      </div>
      
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">모델:</span>
          <select id="tradesModelFilter">
            <option value="all">전체</option>
          </select>
        </div>
        <div class="filter-group">
          <span class="filter-label">포지션:</span>
          <select id="tradesPositionFilter">
            <option value="all">전체</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
      </div>
      
      <div class="card">
        <div class="card-body">
          <div class="table-wrapper">
            <table id="allTradesTable">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>포지션</th>
                  <th>모델</th>
                  <th>티커</th>
                  <th>진입가</th>
                  <th>D+1</th>
                  <th>D+3</th>
                  <th>D+5</th>
                  <th>D+7</th>
                  <th>D+10</th>
                  <th>D+14</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>
  
  <!-- Tooltip -->
  <div class="tooltip" id="tooltip" style="display: none;"></div>
  
  <script>
    // State
    let trades = [];
    let currentView = 'overview';
    let returnType = 'cap'; // 'cap' or 'pure'
    
    // Dynamic Cap Settings (loaded from server, can be adjusted in UI)
    let capSettings = {
      maxCap: ${RETURN_CAP?.MAX_CAP_PCT || 0.20},
      lowCap: ${RETURN_CAP?.LOW_CAP_PCT || 0.05},
      enabled: ${RETURN_CAP?.ENABLED !== false}
    };
    
    // Elements
    const loadingState = document.getElementById('loadingState');
    const tooltip = document.getElementById('tooltip');
    
    // Initialize
    document.addEventListener('DOMContentLoaded', async () => {
      await loadData();
      setupNavigation();
      setupFilters();
      setupCapSettingsUI();
      showView('overview');
    });
    
    // Setup Cap Settings UI
    function setupCapSettingsUI() {
      document.getElementById('maxCapInput').value = capSettings.maxCap;
      document.getElementById('lowCapInput').value = capSettings.lowCap;
      updateCapSettingsVisibility();
    }
    
    // Update Cap Settings from UI
    function updateCapSettings() {
      capSettings.maxCap = parseFloat(document.getElementById('maxCapInput').value) || 0.20;
      capSettings.lowCap = parseFloat(document.getElementById('lowCapInput').value) || 0.05;
      if (returnType === 'cap') {
        renderView(currentView);
      }
    }
    window.updateCapSettings = updateCapSettings;
    
    // Update Cap Settings visibility based on return type
    function updateCapSettingsVisibility() {
      const capGroup = document.getElementById('capSettingsGroup');
      const capDesc = document.getElementById('capDescription');
      if (returnType === 'cap') {
        capGroup.style.display = 'flex';
        capDesc.textContent = '💡 Cap 적용: 익절 ' + (capSettings.maxCap * 100).toFixed(0) + '%, 손절 ' + (capSettings.lowCap * 100).toFixed(0) + '% 도달 시 시가 청산';
      } else {
        capGroup.style.display = 'none';
        capDesc.textContent = '💡 순수 수익률: 종가 기준 실제 수익률 (Cap 미적용)';
      }
    }
    
    // Change return type and re-render current view
    function changeReturnType(type) {
      returnType = type;
      updateCapSettingsVisibility();
      renderView(currentView);
    }
    window.changeReturnType = changeReturnType;
    
    // Load data from API
    async function loadData() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('api_key');
        
        const response = await fetch('/dashboard/data?api_key=' + encodeURIComponent(apiKey));
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        trades = data.trades || [];
        
        // Load server-side cap settings
        if (data.returnCapSettings) {
          capSettings.maxCap = data.returnCapSettings.MAX_CAP_PCT || 0.20;
          capSettings.lowCap = data.returnCapSettings.LOW_CAP_PCT || 0.05;
          capSettings.enabled = data.returnCapSettings.ENABLED !== false;
        }
        
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString('ko-KR');
        
        loadingState.style.display = 'none';
        
        if (trades.length === 0) {
          showEmptyState();
        }
      } catch (error) {
        loadingState.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>데이터 로드 실패</h3><p>' + error.message + '</p></div>';
      }
    }
    
    // Navigation
    function setupNavigation() {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          const view = item.dataset.view;
          showView(view);
          
          document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        });
      });
    }
    
    // Show view
    function showView(view) {
      currentView = view;
      
      document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
      const viewEl = document.getElementById('view-' + view);
      if (viewEl) {
        viewEl.classList.add('active');
        renderView(view);
      }
    }
    
    // Render view
    function renderView(view) {
      switch (view) {
        case 'overview': renderOverview(); break;
        case 'by-model': renderByModel(); break;
        case 'by-position': renderByPosition(); break;
        case 'by-date': renderByDate(); break;
        case 'by-day': renderByDay(); break;
        case 'heatmap': renderHeatmap(); break;
        case 'trades': renderTrades(); break;
      }
    }
    
    // Utility functions
    
    /**
     * Calculate cap-aware return for a single day's OHLC data
     * @param {string} position - 'long' or 'short'
     * @param {number} currentPrice - Entry price
     * @param {Object} dayData - OHLC data from returns array
     * @param {number} maxCap - Max profit cap (e.g., 0.20)
     * @param {number} lowCap - Max loss cap (e.g., 0.05)
     * @returns {number} Cap-aware return rate
     */
    function calculateCapAwareReturn(position, currentPrice, dayData, maxCap, lowCap) {
      if (!dayData || !dayData.open || !dayData.high || !dayData.low || !dayData.close) {
        // Fallback to pure return if OHLC data not available
        return dayData?.returnRate || null;
      }
      
      const { open, high, low, close } = dayData;
      
      if (position === 'long') {
        const maxCapThreshold = currentPrice * (1 + maxCap);
        const lowCapThreshold = currentPrice * (1 - lowCap);
        
        if (high >= maxCapThreshold) {
          return (open - currentPrice) / currentPrice;
        } else if (low <= lowCapThreshold) {
          return (open - currentPrice) / currentPrice;
        } else {
          return (close - currentPrice) / currentPrice;
        }
      } else {
        // Short position
        const maxCapThreshold = currentPrice * (1 - maxCap);
        const lowCapThreshold = currentPrice * (1 + lowCap);
        
        if (low <= maxCapThreshold) {
          return ((open - currentPrice) / currentPrice) * -1;
        } else if (high >= lowCapThreshold) {
          return ((open - currentPrice) / currentPrice) * -1;
        } else {
          return ((close - currentPrice) / currentPrice) * -1;
        }
      }
    }
    
    /**
     * Get cumulative return for a trade up to day N
     * If returnType is 'cap', calculates cap-aware returns dynamically
     */
    function getReturn(trade, day) {
      if (!trade.returns || !trade.returns[day - 1]) return null;
      
      if (returnType === 'pure') {
        // Pure returns - just use stored cumulative return
        return trade.returns[day - 1].cumulativeReturn;
      }
      
      // Cap-aware returns - calculate dynamically
      let cumulativeReturn = 0;
      for (let i = 0; i < day; i++) {
        const dayData = trade.returns[i];
        if (!dayData) continue;
        
        const dayReturn = calculateCapAwareReturn(
          trade.position, 
          trade.currentPrice, 
          dayData, 
          capSettings.maxCap, 
          capSettings.lowCap
        );
        if (dayReturn !== null) {
          cumulativeReturn += dayReturn;
        }
      }
      return cumulativeReturn;
    }
    
    /**
     * Get single day return (non-cumulative)
     */
    function getDayReturn(trade, day) {
      if (!trade.returns || !trade.returns[day - 1]) return null;
      
      if (returnType === 'pure') {
        return trade.returns[day - 1].returnRate;
      }
      
      // Cap-aware return for single day
      return calculateCapAwareReturn(
        trade.position,
        trade.currentPrice,
        trade.returns[day - 1],
        capSettings.maxCap,
        capSettings.lowCap
      );
    }
    
    function formatPercent(value) {
      if (value === null || value === undefined) return '-';
      return (value * 100).toFixed(2) + '%';
    }
    
    function formatPrice(value) {
      if (value === null || value === undefined) return '-';
      return '$' + value.toFixed(2);
    }
    
    function getColorForReturn(value) {
      if (value === null) return 'var(--bg-hover)';
      if (value > 0.05) return 'var(--success)';
      if (value > 0) return 'rgba(34, 197, 94, 0.5)';
      if (value > -0.05) return 'rgba(239, 68, 68, 0.5)';
      return 'var(--error)';
    }
    
    // Render Overview
    function renderOverview() {
      const totalTrades = trades.length;
      const models = [...new Set(trades.map(t => t.modelName))];
      const longTrades = trades.filter(t => t.position === 'long');
      const shortTrades = trades.filter(t => t.position === 'short');
      
      // Calculate average returns
      let avgD7 = 0, avgD14 = 0, winCount = 0;
      trades.forEach(t => {
        const d7 = getReturn(t, 7);
        const d14 = getReturn(t, 14);
        if (d7 !== null) avgD7 += d7;
        if (d14 !== null) {
          avgD14 += d14;
          if (d14 > 0) winCount++;
        }
      });
      avgD7 = totalTrades > 0 ? avgD7 / totalTrades : 0;
      avgD14 = totalTrades > 0 ? avgD14 / totalTrades : 0;
      const winRate = totalTrades > 0 ? winCount / totalTrades : 0;
      
      // Stats
      document.getElementById('overviewStats').innerHTML = \`
        <div class="stat-card">
          <div class="label">총 거래 수</div>
          <div class="value">\${totalTrades}</div>
        </div>
        <div class="stat-card">
          <div class="label">모델 수</div>
          <div class="value">\${models.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">평균 D+14 수익률</div>
          <div class="value \${avgD14 >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(avgD14)}</div>
        </div>
        <div class="stat-card">
          <div class="label">승률 (D+14)</div>
          <div class="value">\${formatPercent(winRate)}</div>
        </div>
        <div class="stat-card">
          <div class="label">Long 거래</div>
          <div class="value position-long">\${longTrades.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">Short 거래</div>
          <div class="value position-short">\${shortTrades.length}</div>
        </div>
      \`;
      
      // Daily returns chart
      const dailyReturns = [];
      for (let d = 1; d <= 14; d++) {
        let sum = 0, count = 0;
        trades.forEach(t => {
          const ret = getReturn(t, d);
          if (ret !== null) { sum += ret; count++; }
        });
        dailyReturns.push(count > 0 ? sum / count : 0);
      }
      
      const maxAbs = Math.max(...dailyReturns.map(Math.abs), 0.01);
      document.getElementById('dailyReturnsChart').innerHTML = dailyReturns.map((ret, i) => \`
        <div class="bar-group">
          <div class="bar-value \${ret >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(ret)}</div>
          <div class="bar \${ret >= 0 ? 'positive' : 'negative'}" style="height: \${Math.abs(ret) / maxAbs * 150}px;"></div>
          <div class="bar-label">D+\${i + 1}</div>
        </div>
      \`).join('');
      
      // Recent trades
      const recentTrades = trades.slice(0, 10);
      document.querySelector('#recentTradesTable tbody').innerHTML = recentTrades.map(t => \`
        <tr>
          <td>\${t.purchaseDate}</td>
          <td class="position-\${t.position}">\${t.position.toUpperCase()}</td>
          <td>\${t.modelName}</td>
          <td class="ticker">\${t.ticker}</td>
          <td>\${formatPrice(t.currentPrice)}</td>
          <td class="\${(getReturn(t, 7) || 0) >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(getReturn(t, 7))}</td>
          <td class="\${(getReturn(t, 14) || 0) >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(getReturn(t, 14))}</td>
        </tr>
      \`).join('');
    }
    
    // Render By Model
    function renderByModel() {
      const models = [...new Set(trades.map(t => t.modelName))].sort();
      const modelStats = models.map(model => {
        const modelTrades = trades.filter(t => t.modelName === model);
        const returns14 = modelTrades.map(t => getReturn(t, 14)).filter(r => r !== null);
        const avgReturn = returns14.length > 0 ? returns14.reduce((a, b) => a + b, 0) / returns14.length : 0;
        const winRate = returns14.length > 0 ? returns14.filter(r => r > 0).length / returns14.length : 0;
        const maxReturn = returns14.length > 0 ? Math.max(...returns14) : 0;
        const minReturn = returns14.length > 0 ? Math.min(...returns14) : 0;
        
        // Find optimal holding day
        let optimalDay = 1, maxAvg = -Infinity;
        for (let d = 1; d <= 14; d++) {
          const dayReturns = modelTrades.map(t => getReturn(t, d)).filter(r => r !== null);
          const avg = dayReturns.length > 0 ? dayReturns.reduce((a, b) => a + b, 0) / dayReturns.length : -Infinity;
          if (avg > maxAvg) { maxAvg = avg; optimalDay = d; }
        }
        
        return { model, count: modelTrades.length, avgReturn, winRate, maxReturn, minReturn, optimalDay };
      });
      
      document.querySelector('#modelPerformanceTable tbody').innerHTML = modelStats.map(s => \`
        <tr>
          <td><strong>\${s.model}</strong></td>
          <td>\${s.count}</td>
          <td>\${formatPercent(s.winRate)}</td>
          <td class="\${s.avgReturn >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(s.avgReturn)}</td>
          <td class="return-positive">\${formatPercent(s.maxReturn)}</td>
          <td class="return-negative">\${formatPercent(s.minReturn)}</td>
          <td><span class="badge badge-success">D+\${s.optimalDay}</span></td>
        </tr>
      \`).join('');
      
      // Model daily chart (simplified text version)
      document.getElementById('modelDailyChart').innerHTML = '<p style="color: var(--text-muted);">각 모델의 일별 수익률 추이 차트 (차트 라이브러리 추가 시 구현)</p>';
    }
    
    // Render By Position
    function renderByPosition() {
      const positions = ['long', 'short'];
      const positionStats = positions.map(pos => {
        const posTrades = trades.filter(t => t.position === pos);
        const returns14 = posTrades.map(t => getReturn(t, 14)).filter(r => r !== null);
        const avgReturn = returns14.length > 0 ? returns14.reduce((a, b) => a + b, 0) / returns14.length : 0;
        const winRate = returns14.length > 0 ? returns14.filter(r => r > 0).length / returns14.length : 0;
        return { position: pos, count: posTrades.length, avgReturn, winRate };
      });
      
      document.getElementById('positionStats').innerHTML = positionStats.map(s => \`
        <div class="stat-card">
          <div class="label">\${s.position.toUpperCase()} 거래 수</div>
          <div class="value position-\${s.position}">\${s.count}</div>
        </div>
        <div class="stat-card">
          <div class="label">\${s.position.toUpperCase()} 평균 수익률</div>
          <div class="value \${s.avgReturn >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(s.avgReturn)}</div>
        </div>
        <div class="stat-card">
          <div class="label">\${s.position.toUpperCase()} 승률</div>
          <div class="value">\${formatPercent(s.winRate)}</div>
        </div>
      \`).join('');
      
      // Position daily chart
      let chartHtml = '<div style="display: flex; gap: 40px;">';
      positions.forEach(pos => {
        const posTrades = trades.filter(t => t.position === pos);
        const dailyReturns = [];
        for (let d = 1; d <= 14; d++) {
          const dayReturns = posTrades.map(t => getReturn(t, d)).filter(r => r !== null);
          dailyReturns.push(dayReturns.length > 0 ? dayReturns.reduce((a, b) => a + b, 0) / dayReturns.length : 0);
        }
        
        chartHtml += \`<div style="flex: 1;">
          <h4 style="margin-bottom: 12px; color: var(--text-secondary);">\${pos.toUpperCase()}</h4>
          <div class="bar-chart" style="height: 150px;">
            \${dailyReturns.map((ret, i) => \`
              <div class="bar-group" style="flex: 1;">
                <div class="bar \${ret >= 0 ? 'positive' : 'negative'}" style="height: \${Math.abs(ret) * 1000}px; max-height: 100px;"></div>
                <div class="bar-label">D+\${i + 1}</div>
              </div>
            \`).join('')}
          </div>
        </div>\`;
      });
      chartHtml += '</div>';
      document.getElementById('positionDailyChart').innerHTML = chartHtml;
    }
    
    // Render By Date
    function renderByDate() {
      const dateGroups = {};
      trades.forEach(t => {
        const date = t.purchaseDate;
        if (!dateGroups[date]) dateGroups[date] = [];
        dateGroups[date].push(t);
      });
      
      const sortedDates = Object.keys(dateGroups).sort().reverse();
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      
      document.querySelector('#datePerformanceTable tbody').innerHTML = sortedDates.slice(0, 50).map(date => {
        const dateTrades = dateGroups[date];
        const d = new Date(date);
        const dayOfWeek = dayNames[d.getDay()];
        const longCount = dateTrades.filter(t => t.position === 'long').length;
        const shortCount = dateTrades.filter(t => t.position === 'short').length;
        
        const returns7 = dateTrades.map(t => getReturn(t, 7)).filter(r => r !== null);
        const returns14 = dateTrades.map(t => getReturn(t, 14)).filter(r => r !== null);
        const avgD7 = returns7.length > 0 ? returns7.reduce((a, b) => a + b, 0) / returns7.length : 0;
        const avgD14 = returns14.length > 0 ? returns14.reduce((a, b) => a + b, 0) / returns14.length : 0;
        const winRate = returns14.length > 0 ? returns14.filter(r => r > 0).length / returns14.length : 0;
        
        return \`
          <tr>
            <td>\${date}</td>
            <td>\${dayOfWeek}</td>
            <td>\${dateTrades.length}</td>
            <td class="position-long">\${longCount}</td>
            <td class="position-short">\${shortCount}</td>
            <td class="\${avgD7 >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(avgD7)}</td>
            <td class="\${avgD14 >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(avgD14)}</td>
            <td>\${formatPercent(winRate)}</td>
          </tr>
        \`;
      }).join('');
    }
    
    // Render By Holding Day
    function renderByDay() {
      const dayStats = [];
      for (let d = 1; d <= 14; d++) {
        const dayReturns = trades.map(t => getReturn(t, d)).filter(r => r !== null);
        if (dayReturns.length === 0) {
          dayStats.push({ day: d, count: 0, avg: 0, winRate: 0, std: 0, max: 0, min: 0 });
          continue;
        }
        
        const avg = dayReturns.reduce((a, b) => a + b, 0) / dayReturns.length;
        const winRate = dayReturns.filter(r => r > 0).length / dayReturns.length;
        const std = Math.sqrt(dayReturns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / dayReturns.length);
        const max = Math.max(...dayReturns);
        const min = Math.min(...dayReturns);
        
        dayStats.push({ day: d, count: dayReturns.length, avg, winRate, std, max, min });
      }
      
      document.querySelector('#holdingDayTable tbody').innerHTML = dayStats.map(s => \`
        <tr>
          <td><strong>D+\${s.day}</strong></td>
          <td>\${s.count}</td>
          <td class="\${s.avg >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(s.avg)}</td>
          <td>\${formatPercent(s.winRate)}</td>
          <td>\${formatPercent(s.std)}</td>
          <td class="return-positive">\${formatPercent(s.max)}</td>
          <td class="return-negative">\${formatPercent(s.min)}</td>
        </tr>
      \`).join('');
      
      // Optimal exit analysis
      const optimalDay = dayStats.reduce((best, s) => s.avg > best.avg ? s : best, dayStats[0]);
      document.getElementById('optimalExitAnalysis').innerHTML = \`
        <div style="display: flex; gap: 24px; align-items: center;">
          <div style="flex: 1;">
            <h4 style="color: var(--text-muted); margin-bottom: 8px;">최적 청산 시점</h4>
            <div style="font-size: 2.5rem; font-weight: 700; color: var(--accent);">D+\${optimalDay.day}</div>
            <div style="color: var(--text-secondary); margin-top: 8px;">
              평균 수익률: <span class="\${optimalDay.avg >= 0 ? 'return-positive' : 'return-negative'}">\${formatPercent(optimalDay.avg)}</span>
              &nbsp;|&nbsp; 승률: \${formatPercent(optimalDay.winRate)}
            </div>
          </div>
          <div style="flex: 2;">
            <p style="color: var(--text-muted); line-height: 1.6;">
              분석 결과, <strong>D+\${optimalDay.day}</strong>에서 가장 높은 평균 수익률을 기록했습니다.
              이 시점에서의 승률은 \${formatPercent(optimalDay.winRate)}이며, 
              표준편차는 \${formatPercent(optimalDay.std)}입니다.
            </p>
          </div>
        </div>
      \`;
    }
    
    // Render Heatmap
    function renderHeatmap() {
      const positionFilter = document.getElementById('heatmapPosition').value;
      const metricType = document.getElementById('heatmapMetric').value;
      
      const filteredTrades = positionFilter === 'all' ? trades : trades.filter(t => t.position === positionFilter);
      const models = [...new Set(filteredTrades.map(t => t.modelName))].sort();
      
      if (models.length === 0) {
        document.getElementById('heatmapContainer').innerHTML = '<div class="empty-state"><p>데이터가 없습니다</p></div>';
        return;
      }
      
      // Calculate heatmap data
      const heatmapData = {};
      models.forEach(model => {
        heatmapData[model] = {};
        for (let d = 1; d <= 14; d++) {
          const modelTrades = filteredTrades.filter(t => t.modelName === model);
          const dayReturns = modelTrades.map(t => getReturn(t, d)).filter(r => r !== null);
          
          if (dayReturns.length === 0) {
            heatmapData[model][d] = { avg: null, winRate: null, count: 0 };
          } else {
            const avg = dayReturns.reduce((a, b) => a + b, 0) / dayReturns.length;
            const winRate = dayReturns.filter(r => r > 0).length / dayReturns.length;
            heatmapData[model][d] = { avg, winRate, count: dayReturns.length };
          }
        }
      });
      
      // Render heatmap
      let html = '<div style="overflow-x: auto;"><table style="width: 100%;">';
      html += '<thead><tr><th style="width: 120px;">모델</th>';
      for (let d = 1; d <= 14; d++) {
        html += '<th style="text-align: center; padding: 8px;">D+' + d + '</th>';
      }
      html += '</tr></thead><tbody>';
      
      models.forEach(model => {
        html += '<tr><td><strong>' + model + '</strong></td>';
        for (let d = 1; d <= 14; d++) {
          const cell = heatmapData[model][d];
          let value, color;
          
          if (metricType === 'avgReturn') {
            value = cell.avg;
            color = getColorForReturn(value);
          } else if (metricType === 'winRate') {
            value = cell.winRate;
            color = value === null ? 'var(--bg-hover)' : 
                    value >= 0.6 ? 'var(--success)' : 
                    value >= 0.5 ? 'rgba(34, 197, 94, 0.5)' : 
                    value >= 0.4 ? 'rgba(239, 68, 68, 0.5)' : 'var(--error)';
          } else {
            value = cell.count;
            color = value === 0 ? 'var(--bg-hover)' : 
                    'rgba(99, 102, 241, ' + Math.min(value / 10, 1) + ')';
          }
          
          const displayValue = metricType === 'count' ? (value || '-') : formatPercent(value);
          html += '<td style="text-align: center; background: ' + color + '; padding: 8px; font-size: 0.75rem; font-weight: 600;">' + displayValue + '</td>';
        }
        html += '</tr>';
      });
      
      html += '</tbody></table></div>';
      document.getElementById('heatmapContainer').innerHTML = html;
    }
    
    // Render Trades
    function renderTrades() {
      const modelFilter = document.getElementById('tradesModelFilter').value;
      const positionFilter = document.getElementById('tradesPositionFilter').value;
      
      // Populate model filter options
      const models = [...new Set(trades.map(t => t.modelName))].sort();
      const modelSelect = document.getElementById('tradesModelFilter');
      if (modelSelect.options.length <= 1) {
        models.forEach(m => {
          const option = document.createElement('option');
          option.value = m;
          option.textContent = m;
          modelSelect.appendChild(option);
        });
      }
      
      let filteredTrades = trades;
      if (modelFilter !== 'all') {
        filteredTrades = filteredTrades.filter(t => t.modelName === modelFilter);
      }
      if (positionFilter !== 'all') {
        filteredTrades = filteredTrades.filter(t => t.position === positionFilter);
      }
      
      document.querySelector('#allTradesTable tbody').innerHTML = filteredTrades.slice(0, 100).map(t => {
        const days = [1, 3, 5, 7, 10, 14];
        return \`
          <tr>
            <td>\${t.purchaseDate}</td>
            <td class="position-\${t.position}">\${t.position.toUpperCase()}</td>
            <td>\${t.modelName}</td>
            <td class="ticker">\${t.ticker}</td>
            <td>\${formatPrice(t.currentPrice)}</td>
            \${days.map(d => {
              const ret = getReturn(t, d);
              return '<td class="' + ((ret || 0) >= 0 ? 'return-positive' : 'return-negative') + '">' + formatPercent(ret) + '</td>';
            }).join('')}
          </tr>
        \`;
      }).join('');
    }
    
    // Setup filters
    function setupFilters() {
      document.getElementById('heatmapPosition').addEventListener('change', () => renderHeatmap());
      document.getElementById('heatmapMetric').addEventListener('change', () => renderHeatmap());
      document.getElementById('tradesModelFilter').addEventListener('change', () => renderTrades());
      document.getElementById('tradesPositionFilter').addEventListener('change', () => renderTrades());
    }
    
    // Show empty state
    function showEmptyState() {
      document.querySelector('.main-content').innerHTML = \`
        <div class="empty-state" style="margin-top: 100px;">
          <div class="icon">📭</div>
          <h3>거래 데이터가 없습니다</h3>
          <p>Price Tracker를 통해 거래를 등록하세요</p>
          <a href="/tracker" style="color: var(--accent); margin-top: 16px; display: inline-block;">→ Tracker 페이지로 이동</a>
        </div>
      \`;
    }
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

