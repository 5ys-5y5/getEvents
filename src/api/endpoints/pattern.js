/**
 * GET /pattern - Pattern Analysis Dashboard
 *
 * 세 가지 기준으로 주가 패턴을 분석합니다:
 * 1. 이벤트 유형별 주가 변동 추이 (earning calendar 기반)
 * 2. 애널리스트 목표가 + 이벤트 연관성 분석
 * 3. 애널리스트 목표가만으로 주가 예측 기여도 분석
 *
 * Authentication: Requires session-based login (handled by requireAuth middleware)
 */

import { supabase } from '../../config/supabase.js';
import { TABLES, PRICE_TREND } from '../../config/appConfig.js';

// ============================================
// Cache Management
// ============================================
let patternCache = {
  data: null,
  timestamp: null,
  loading: false
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

/**
 * Clear pattern cache (call this after generateRating)
 */
export function clearPatternCache() {
  console.log('[Pattern] Cache cleared');
  patternCache = {
    data: null,
    timestamp: null,
    loading: false
  };
}

/**
 * Check if cache is valid
 */
function isCacheValid() {
  if (!patternCache.data || !patternCache.timestamp) return false;
  const age = Date.now() - patternCache.timestamp;
  return age < CACHE_TTL_MS;
}

// ============================================
// Data Loading Functions
// ============================================

/**
 * Load analyst records with price_trend data
 * 기준3: 애널리스트 목표가만으로 주가 예측 기여도 분석
 */
async function loadAnalystRecordsWithTrend() {
  if (!supabase) return [];
  
  const pageSize = 1000;
  let offset = 0;
  let allRecords = [];
  
  while (true) {
    const { data, error } = await supabase
      .from(TABLES.ANALYST_RECORDS)
      .select('ticker, published_date, analyst_name, analyst_company, price_target, price_when_posted, price_trend')
      .not('price_trend', 'is', null)
      .order('published_date', { ascending: true }) // Order by date for better grouping
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(`[Pattern] Error loading analyst records: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    allRecords = allRecords.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  
  return allRecords;
}

/**
 * Extract close price from price_trend value
 * Handles both old format (number) and new format (object with close field)
 */
function extractClosePrice(priceTrendValue) {
  if (priceTrendValue === null || priceTrendValue === undefined) {
    return null;
  }

  // New format: object with close field
  if (typeof priceTrendValue === 'object' && priceTrendValue.close !== null && priceTrendValue.close !== undefined) {
    return priceTrendValue.close;
  }

  // Old format: number
  if (typeof priceTrendValue === 'number') {
    return priceTrendValue;
  }

  return null;
}

/**
 * Calculate statistics for an array of numbers
 */
function calculateStats(values) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return { mean: null, std: null, count: 0, median: null, winRate: null };

  const sorted = [...valid].sort((a, b) => a - b);
  const count = valid.length;
  const mean = valid.reduce((s, v) => s + v, 0) / count;
  const variance = valid.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / count;
  const std = Math.sqrt(variance);
  const median = count % 2 === 0
    ? (sorted[count/2 - 1] + sorted[count/2]) / 2
    : sorted[Math.floor(count/2)];
  const winRate = valid.filter(v => v > 0).length / count;

  return { mean, std, count, median, winRate };
}

/**
 * 기준3 분석: 애널리스트 목표가 방향별 수익률 분석
 * 
 * 올바른 정의:
 * - 상향 (Upgrade): 같은 애널리스트의 직전 목표가 < 이번 목표가
 * - 하향 (Downgrade): 같은 애널리스트의 직전 목표가 > 이번 목표가
 * - 유지 (Maintain): 같은 애널리스트의 직전 목표가 = 이번 목표가
 * 
 * 수익률 = (D+N 종가 - 발표 당시 주가) / 발표 당시 주가
 */
function analyzeAnalystDirectionPattern(records) {
  const horizons = PRICE_TREND.HORIZONS;
  
  // 1. 애널리스트별로 레코드 그룹화 (analyst_name + analyst_company)
  const analystGroups = {};
  
  for (const record of records) {
    const { analyst_name, analyst_company, published_date, price_target, price_when_posted, price_trend, ticker } = record;
    if (!analyst_name || !price_target || !price_when_posted || !price_trend) continue;
    
    const analystKey = `${analyst_name}|${analyst_company || 'Unknown'}`;
    
    if (!analystGroups[analystKey]) {
      analystGroups[analystKey] = [];
    }
    
    analystGroups[analystKey].push({
      symbol: ticker,
      ticker: ticker,
      publishedDate: published_date,
      priceTarget: price_target,
      priceWhenPosted: price_when_posted,
      priceTrend: price_trend
    });
  }
  
  // 2. 각 애널리스트별로 시간순 정렬 후 직전 목표가와 비교
  const upgradeReturns = {};
  const downgradeReturns = {};
  const maintainReturns = {};
  const initialReturns = {}; // 첫 번째 목표가 (비교 대상 없음)
  
  horizons.forEach(h => {
    upgradeReturns[`D${h}`] = [];
    downgradeReturns[`D${h}`] = [];
    maintainReturns[`D${h}`] = [];
    initialReturns[`D${h}`] = [];
  });
  
  let upgradeCount = 0;
  let downgradeCount = 0;
  let maintainCount = 0;
  let initialCount = 0;
  
  for (const analystKey of Object.keys(analystGroups)) {
    const analystRecords = analystGroups[analystKey];
    
    // 발표일 기준 시간순 정렬 (오래된 것부터)
    analystRecords.sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
    
    // 같은 종목에 대한 직전 목표가 추적
    const lastTargetBySymbol = {};
    
    for (const rec of analystRecords) {
      const { symbol, ticker, priceTarget, priceWhenPosted, priceTrend } = rec;
      const tickerValue = ticker || symbol;
      const prevTarget = lastTargetBySymbol[tickerValue];
      
      let direction = 'initial'; // 첫 번째 목표가
      let targetReturns = initialReturns;
      
      if (prevTarget !== undefined) {
        if (priceTarget > prevTarget) {
          direction = 'upgrade';
          targetReturns = upgradeReturns;
          upgradeCount++;
        } else if (priceTarget < prevTarget) {
          direction = 'downgrade';
          targetReturns = downgradeReturns;
          downgradeCount++;
        } else {
          direction = 'maintain';
          targetReturns = maintainReturns;
          maintainCount++;
        }
      } else {
        initialCount++;
      }
      
      // 수익률 계산 및 저장
      for (const horizon of horizons) {
        const key = `D${horizon}`;
        const priceAtHorizon = extractClosePrice(priceTrend[key]);
        if (priceAtHorizon !== null && priceAtHorizon !== undefined) {
          const returnRate = (priceAtHorizon - priceWhenPosted) / priceWhenPosted;
          targetReturns[key].push(returnRate);
        }
      }
      
      // 현재 목표가를 다음 비교를 위해 저장
      lastTargetBySymbol[tickerValue] = priceTarget;
    }
  }
  
  // 3. 통계 계산
  const upgradeStats = {};
  const downgradeStats = {};
  const maintainStats = {};
  const initialStats = {};
  
  for (const horizon of horizons) {
    const key = `D${horizon}`;
    upgradeStats[key] = calculateStats(upgradeReturns[key]);
    downgradeStats[key] = calculateStats(downgradeReturns[key]);
    maintainStats[key] = calculateStats(maintainReturns[key]);
    initialStats[key] = calculateStats(initialReturns[key]);
  }
  
  return { 
    upgradeStats, 
    downgradeStats, 
    maintainStats,
    initialStats,
    horizons,
    counts: {
      upgrade: upgradeCount,
      downgrade: downgradeCount,
      maintain: maintainCount,
      initial: initialCount,
      total: upgradeCount + downgradeCount + maintainCount + initialCount
    }
  };
}

/**
 * 거래 효율성 지표 계산
 * 효율성 = (수익률 / 보유일수) * 연환산계수
 * 
 * 예: D+1에서 1.5% 수익 vs D+14에서 5% 수익
 * D+1 효율: 1.5% / 1 * 252 = 378% 연환산
 * D+14 효율: 5% / 14 * 252 = 90% 연환산
 */
function calculateTradingEfficiency(stats, holdingDays) {
  if (!stats.mean || stats.mean === null) return null;
  const dailyReturn = stats.mean / holdingDays;
  const annualizedReturn = dailyReturn * 252; // 연간 거래일 기준
  return {
    dailyReturn,
    annualizedReturn,
    holdingDays,
    rawReturn: stats.mean,
    winRate: stats.winRate,
    count: stats.count
  };
}

/**
 * 최적 거래 전략 찾기
 * 가장 높은 효율성(연환산 수익률)을 가진 보유 기간 찾기
 */
function findOptimalStrategy(directionStats, horizons) {
  let bestStrategy = null;
  let bestEfficiency = -Infinity;
  
  for (const horizon of horizons) {
    const key = `D${horizon}`;
    const stats = directionStats[key];
    if (!stats || stats.count < 30) continue; // 최소 30개 데이터 필요
    
    const efficiency = calculateTradingEfficiency(stats, horizon);
    if (efficiency && efficiency.annualizedReturn > bestEfficiency) {
      bestEfficiency = efficiency.annualizedReturn;
      bestStrategy = {
        horizon,
        ...efficiency
      };
    }
  }
  
  return bestStrategy;
}

// ============================================
// Main Handler
// ============================================

export async function patternHandler(req, res) {
  // Authentication is handled by requireAuth middleware in index.js
  const view = req.query.view || 'overview'; // overview, analyst, event, efficiency
  const forceRefresh = req.query.refresh === 'true';

  let analysisResults = {};

  try {
    // Check cache first
    if (!forceRefresh && isCacheValid()) {
      console.log('[Pattern] Using cached data (age: ' + Math.round((Date.now() - patternCache.timestamp) / 1000) + 's)');
      analysisResults = patternCache.data;
    } else {
      // Wait if another request is loading
      if (patternCache.loading) {
        console.log('[Pattern] Waiting for ongoing data load...');
        // Wait up to 30 seconds for the other request to finish
        const maxWait = 30000;
        const startWait = Date.now();
        while (patternCache.loading && (Date.now() - startWait) < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // If cache is now valid, use it
        if (isCacheValid()) {
          console.log('[Pattern] Using data loaded by another request');
          analysisResults = patternCache.data;
        }
      }

      // If still no valid cache, load data
      if (!isCacheValid()) {
        patternCache.loading = true;
        console.log('[Pattern] Loading fresh data from database...');
        const loadStart = Date.now();

        const analystRecords = await loadAnalystRecordsWithTrend();
        console.log(`[Pattern] Loaded ${analystRecords.length} records in ${Date.now() - loadStart}ms`);

        // 기준3 분석 실행
        const analysisStart = Date.now();
        const analystPattern = analyzeAnalystDirectionPattern(analystRecords);
        console.log(`[Pattern] Analysis completed in ${Date.now() - analysisStart}ms`);

        // 최적 전략 찾기
        const upgradeOptimal = findOptimalStrategy(analystPattern.upgradeStats, analystPattern.horizons);
        const downgradeOptimal = findOptimalStrategy(analystPattern.downgradeStats, analystPattern.horizons);

        analysisResults = {
          analystPattern,
          upgradeOptimal,
          downgradeOptimal,
          totalRecords: analystRecords.length
        };

        // Cache the results
        patternCache.data = analysisResults;
        patternCache.timestamp = Date.now();
        patternCache.loading = false;

        console.log(`[Pattern] Total load+analysis time: ${Date.now() - loadStart}ms`);
        console.log(`[Pattern] Data cached for ${CACHE_TTL_MS / 1000 / 60} minutes`);
      }
    }
  } catch (error) {
    console.error('[Pattern] Error:', error.message);
    patternCache.loading = false;
  }

  // Generate HTML
  const html = generatePatternHTML(req.user.username, view, analysisResults);
  res.status(200).send(html);
}

// ============================================
// HTML Generation
// ============================================

function generatePatternHTML(username, view, results) {
  const { analystPattern, upgradeOptimal, downgradeOptimal, totalRecords } = results;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pattern Analysis - 주가 패턴 분석</title>
  <style>
    :root {
      /* Light theme matching apiGuide.js */
      --bg-primary: #999999;          /* Page background (grey) */
      --bg-secondary: #2b2b2b;        /* Sidebar background (dark) */
      --bg-card: #ffffff;             /* Content cards (white) */
      --text-primary: #111111;        /* Main text (dark on light) */
      --text-secondary: #666666;      /* Secondary text */
      --accent-green: #2e7d32;        /* Success green */
      --accent-red: #c62828;          /* Error red */
      --accent-blue: #0066cc;         /* Primary blue */
      --accent-purple: #7b1fa2;       /* Purple accent */
      --accent-gold: #f57c00;         /* Warning orange */
      --border-color: #dddddd;        /* Standard borders */
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    .layout {
      display: flex;
      min-height: 100vh;
    }
    
    /* Sidebar */
    .sidebar {
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid #1a1a1a;
      padding: 24px 16px;
      position: fixed;
      top: 60px;
      height: calc(100vh - 60px);
      overflow-y: auto;
      color: #e0e0e0; /* Light text on dark sidebar */
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      margin-bottom: 32px;
    }
    
    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--accent-blue);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #e0e0e0;
    }
    
    .nav-section {
      margin-bottom: 24px;
    }
    
    .nav-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888888; /* Light grey for dark sidebar */
      padding: 8px 12px;
      margin-bottom: 8px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      color: #cccccc; /* Light text for dark sidebar */
      text-decoration: none;
      transition: all 0.2s;
      margin-bottom: 4px;
    }

    .nav-item:hover {
      background: #3a3a3a; /* Lighter than sidebar bg */
      color: #ffffff;
    }

    .nav-item.active {
      background: var(--accent-blue);
      color: white;
    }
    
    .nav-icon { font-size: 18px; }

    /* Status Widget in Sidebar */
    .sidebar-status-widget {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #3a3a3a;
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

    /* Main Content */
    .main {
      flex: 1;
      margin-left: 280px;
      padding: 32px;
      min-height: calc(100vh - 60px);
    }
    
    .header {
      margin-bottom: 32px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .header p {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    /* Cards */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .card {
      background: var(--bg-card);
      border-radius: 6px;
      padding: 20px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .card-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .card-value.positive { color: var(--accent-green); }
    .card-value.negative { color: var(--accent-red); }
    
    .card-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    /* Strategy Cards */
    .strategy-card {
      background: var(--bg-card);
      border-radius: 6px;
      padding: 20px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    
    .strategy-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .strategy-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    
    .strategy-icon.upgrade {
      background: linear-gradient(135deg, rgba(0,212,170,0.2), rgba(0,212,170,0.05));
      border: 1px solid rgba(0,212,170,0.3);
    }
    
    .strategy-icon.downgrade {
      background: linear-gradient(135deg, rgba(255,71,87,0.2), rgba(255,71,87,0.05));
      border: 1px solid rgba(255,71,87,0.3);
    }
    
    .strategy-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .strategy-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .strategy-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    
    .metric {
      text-align: center;
      padding: 16px;
      background: rgba(255,255,255,0.02);
      border-radius: 12px;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .metric-label {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    /* Table */
    .table-container {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border-color);
      overflow-x: auto;
    }
    
    .table-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 12px 16px;
      text-align: right;
      border-bottom: 1px solid var(--border-color);
    }
    
    th {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.02);
    }
    
    th:first-child, td:first-child {
      text-align: left;
    }
    
    td {
      font-size: 14px;
      font-family: 'SF Mono', Monaco, monospace;
    }
    
    .positive { color: var(--accent-green); }
    .negative { color: var(--accent-red); }
    .highlight { background: rgba(168,85,247,0.1); }
    
    /* Info Box */
    .info-box {
      background: rgba(74,158,255,0.1);
      border: 1px solid rgba(74,158,255,0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    
    .info-box h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--accent-blue);
    }
    
    .info-box p {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    
    /* Efficiency Bar */
    .efficiency-bar {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 12px;
    }
    
    .efficiency-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    
    .efficiency-fill.high { background: var(--accent-green); }
    .efficiency-fill.medium { background: var(--accent-gold); }
    .efficiency-fill.low { background: var(--accent-red); }
    
    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
      text-align: center;
      color: var(--text-secondary);
      font-size: 12px;
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

    .layout {
      margin-top: 0;
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
      <a href="/dashboard" class="top-nav-link">Dashboard</a>
      <a href="/pattern" class="top-nav-link active">Pattern</a>
      <div class="top-nav-right">
        <span class="top-nav-user">👤 ${username}</span>
        <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
        <a href="/" class="top-nav-link">🏠 Home</a>
      </div>
    </div>
  </nav>

  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">📊</div>
        <span class="logo-text">Pattern Lab</span>
      </div>
      
      <nav>
        <div class="nav-section">
          <div class="nav-section-title">분석 기준</div>
          <a href="/pattern?view=overview" class="nav-item ${view === 'overview' ? 'active' : ''}">
            <span class="nav-icon">🎯</span>
            <span>Overview</span>
          </a>
          <a href="/pattern?view=analyst" class="nav-item ${view === 'analyst' ? 'active' : ''}">
            <span class="nav-icon">📈</span>
            <span>기준3: 애널리스트</span>
          </a>
          <a href="/pattern?view=efficiency" class="nav-item ${view === 'efficiency' ? 'active' : ''}">
            <span class="nav-icon">⚡</span>
            <span>거래 효율성</span>
          </a>
        </div>
        
        <div class="nav-section">
          <div class="nav-section-title">준비 중</div>
          <a href="#" class="nav-item" style="opacity: 0.5; pointer-events: none;">
            <span class="nav-icon">📅</span>
            <span>기준1: 이벤트</span>
          </a>
          <a href="#" class="nav-item" style="opacity: 0.5; pointer-events: none;">
            <span class="nav-icon">🔗</span>
            <span>기준2: 연관성</span>
          </a>
        </div>
        
        <div class="nav-section">
          <div class="nav-section-title">도구</div>
          <a href="/control" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span>Control Panel</span>
          </a>
          <a href="/dashboard" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
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
    </aside>
    
    <!-- Main Content -->
    <main class="main">
      ${view === 'overview' ? generateOverviewHTML(results) : ''}
      ${view === 'analyst' ? generateAnalystHTML(results) : ''}
      ${view === 'efficiency' ? generateEfficiencyHTML(results) : ''}
      
      <div class="footer">
        Pattern Analysis Dashboard • 데이터 기준: analyst_records (${totalRecords?.toLocaleString() || 0}건)
      </div>
    </main>
  </div>
</body>
</html>
  `;
}

function generateOverviewHTML(results) {
  const { analystPattern, upgradeOptimal, downgradeOptimal, totalRecords } = results;
  const counts = analystPattern?.counts || {};
  
  const formatPct = (val) => val !== null && val !== undefined 
    ? `${(val * 100).toFixed(2)}%` 
    : 'N/A';
  
  const formatNum = (val) => val !== null && val !== undefined 
    ? val.toLocaleString() 
    : 'N/A';
  
  return `
    <div class="header">
      <h1>📊 Pattern Analysis Overview</h1>
      <p>애널리스트 목표가 변동 방향에 따른 주가 패턴을 분석하여 최적의 거래 전략을 찾습니다.</p>
    </div>
    
    <!-- 기능 안내 박스 -->
    <div class="info-box" style="background: linear-gradient(135deg, rgba(0, 102, 204, 0.1), rgba(46, 125, 50, 0.1)); border-color: #0066cc;">
      <h4>📚 Pattern 페이지 기능 안내</h4>
      <p style="margin-bottom: 16px;">
        <strong>Pattern Analysis</strong>는 애널리스트 목표가 조정 패턴을 분석하여 최적의 거래 전략을 발견하는 도구입니다.
      </p>
      
      <div style="padding-left: 16px; margin-top: 12px;">
        <p style="margin-bottom: 12px;"><strong>🎯 Overview (현재 페이지)</strong></p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
          <li><strong>전체 통계</strong>: 분석 데이터 총량, 상향/하향/유지 건수</li>
          <li><strong>최적 전략 카드</strong>: Upgrade와 Downgrade 시 가장 수익성 높은 보유 기간 표시</li>
          <li><strong>연환산 수익률</strong>: (일평균 수익률 × 252일)로 계산된 투자 효율성 지표</li>
          <li><strong>승률</strong>: 해당 방향에서 수익을 낸 거래의 비율</li>
        </ul>
        
        <p style="margin-bottom: 12px;"><strong>📈 기준3: 애널리스트</strong></p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
          <li><strong>방향별 상세 분석</strong>: Upgrade, Downgrade, Maintain, Initial(첫 발표) 각각의 성과</li>
          <li><strong>보유 기간별 표</strong>: D+1 ~ D+365까지 각 기간의 평균 수익률, 승률, 데이터 수</li>
          <li><strong>최적 기간 하이라이트</strong>: 연환산 수익률이 가장 높은 기간 강조 표시</li>
          <li><strong>통계적 신뢰도</strong>: 최소 30개 데이터 이상일 때만 최적 전략으로 선정</li>
        </ul>
        
        <p style="margin-bottom: 12px;"><strong>⚡ 거래 효율성</strong></p>
        <ul style="list-style: disc; padding-left: 20px; line-height: 1.8;">
          <li><strong>효율성 비교</strong>: 모든 보유 기간의 연환산 수익률을 시각적으로 비교</li>
          <li><strong>단기 vs 장기</strong>: 짧은 기간의 높은 효율 vs 긴 기간의 안정성 비교</li>
          <li><strong>의사결정 지원</strong>: 보유 기간별 원수익률과 연환산 수익률 동시 제공</li>
        </ul>
      </div>
    </div>
    
    <div class="info-box">
      <h4>💡 분석 방법론</h4>
      <p>
        같은 애널리스트가 같은 종목에 대해 <strong>직전 목표가 대비</strong> 이번 목표가를 조정했을 때의 방향을 분류합니다:<br>
        • <strong>상향 (Upgrade)</strong>: 직전 목표가 < 이번 목표가 → 주가 상승 예상<br>
        • <strong>하향 (Downgrade)</strong>: 직전 목표가 > 이번 목표가 → 주가 하락 예상<br>
        • <strong>유지 (Maintain)</strong>: 직전 목표가 = 이번 목표가 → 현재 수준 유지<br><br>
        각 방향별로 D+1 ~ D+365일까지의 <strong>실제 주가 변동</strong>을 추적하고,
        <strong>연환산 수익률 = (평균수익률 / 보유일수) × 252일</strong>이 가장 높은 최적 보유 기간을 찾습니다.<br><br>
        <strong>📊 데이터 출처</strong>: analyst_records 테이블 (price_trend 컬럼 보유 레코드)
      </p>
    </div>
    
    <!-- Summary Cards -->
    <div class="card-grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 분석 데이터</span>
        </div>
        <div class="card-value">${formatNum(totalRecords)}</div>
        <div class="card-subtitle">애널리스트 레코드 (price_trend 보유)</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">📈 상향 조정</span>
        </div>
        <div class="card-value positive">${formatNum(counts.upgrade)}</div>
        <div class="card-subtitle">직전 대비 목표가 상향</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">📉 하향 조정</span>
        </div>
        <div class="card-value negative">${formatNum(counts.downgrade)}</div>
        <div class="card-subtitle">직전 대비 목표가 하향</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">➡️ 유지/첫발표</span>
        </div>
        <div class="card-value">${formatNum((counts.maintain || 0) + (counts.initial || 0))}</div>
        <div class="card-subtitle">목표가 유지 또는 첫 발표</div>
      </div>
    </div>
    
    <!-- Optimal Strategy Cards -->
    ${upgradeOptimal ? `
    <div class="strategy-card">
      <div class="strategy-header">
        <div class="strategy-icon upgrade">📈</div>
        <div>
          <div class="strategy-title">상향 조정 시 최적 전략</div>
          <div class="strategy-subtitle">직전 대비 목표가를 올렸을 때 (Long Position 권장)</div>
        </div>
      </div>
      <div class="strategy-metrics">
        <div class="metric">
          <div class="metric-value positive">D+${upgradeOptimal.horizon}</div>
          <div class="metric-label">최적 보유 기간</div>
        </div>
        <div class="metric">
          <div class="metric-value ${upgradeOptimal.rawReturn >= 0 ? 'positive' : 'negative'}">${formatPct(upgradeOptimal.rawReturn)}</div>
          <div class="metric-label">평균 수익률</div>
        </div>
        <div class="metric">
          <div class="metric-value positive">${formatPct(upgradeOptimal.annualizedReturn)}</div>
          <div class="metric-label">연환산 수익률</div>
        </div>
        <div class="metric">
          <div class="metric-value">${formatPct(upgradeOptimal.winRate)}</div>
          <div class="metric-label">승률</div>
        </div>
      </div>
    </div>
    ` : ''}
    
    ${downgradeOptimal ? `
    <div class="strategy-card">
      <div class="strategy-header">
        <div class="strategy-icon downgrade">📉</div>
        <div>
          <div class="strategy-title">하향 조정 시 최적 전략</div>
          <div class="strategy-subtitle">직전 대비 목표가를 내렸을 때 (Short Position 권장)</div>
        </div>
      </div>
      <div class="strategy-metrics">
        <div class="metric">
          <div class="metric-value negative">D+${downgradeOptimal.horizon}</div>
          <div class="metric-label">최적 보유 기간</div>
        </div>
        <div class="metric">
          <div class="metric-value ${downgradeOptimal.rawReturn >= 0 ? 'positive' : 'negative'}">${formatPct(downgradeOptimal.rawReturn)}</div>
          <div class="metric-label">평균 수익률</div>
        </div>
        <div class="metric">
          <div class="metric-value positive">${formatPct(downgradeOptimal.annualizedReturn)}</div>
          <div class="metric-label">연환산 수익률</div>
        </div>
        <div class="metric">
          <div class="metric-value">${formatPct(downgradeOptimal.winRate)}</div>
          <div class="metric-label">승률</div>
        </div>
      </div>
    </div>
    ` : ''}
  `;
}

function generateAnalystHTML(results) {
  const { analystPattern } = results;
  if (!analystPattern) return '<p>데이터를 불러오는 중 오류가 발생했습니다.</p>';
  
  const { upgradeStats, downgradeStats, maintainStats, horizons, counts } = analystPattern;
  
  const formatPct = (val) => val !== null && val !== undefined 
    ? `${(val * 100).toFixed(2)}%` 
    : '-';
  
  const formatNum = (val) => val !== null && val !== undefined 
    ? val.toLocaleString() 
    : '-';
  
  return `
    <div class="header">
      <h1>📈 기준3: 애널리스트 목표가 분석</h1>
      <p>같은 애널리스트의 직전 목표가 대비 변동 방향에 따른 D+N 수익률을 분석합니다.</p>
    </div>
    
    <div class="info-box">
      <h4>📌 분석 기준 (올바른 정의)</h4>
      <p>
        <strong>상향 (Upgrade)</strong>: 같은 애널리스트가 같은 종목에 대해 <u>직전 목표가 < 이번 목표가</u> (${formatNum(counts?.upgrade)}건)<br>
        <strong>하향 (Downgrade)</strong>: 같은 애널리스트가 같은 종목에 대해 <u>직전 목표가 > 이번 목표가</u> (${formatNum(counts?.downgrade)}건)<br>
        <strong>유지 (Maintain)</strong>: 같은 애널리스트가 같은 종목에 대해 <u>직전 목표가 = 이번 목표가</u> (${formatNum(counts?.maintain)}건)<br><br>
        수익률 = (D+N 종가 - 발표 당시 주가) / 발표 당시 주가
      </p>
    </div>
    
    <!-- Upgrade Table -->
    <div class="table-container" style="margin-bottom: 24px;">
      <div class="table-title">📈 상향 조정 시 수익률 (직전 대비 목표가 상향, Long Position)</div>
      <table>
        <thead>
          <tr>
            <th>보유 기간</th>
            <th>평균 수익률</th>
            <th>표준편차</th>
            <th>승률</th>
            <th>데이터 수</th>
            <th>일평균 수익</th>
            <th>연환산</th>
          </tr>
        </thead>
        <tbody>
          ${horizons.map(h => {
            const key = `D${h}`;
            const stats = upgradeStats[key];
            const dailyReturn = stats.mean ? stats.mean / h : null;
            const annualized = dailyReturn ? dailyReturn * 252 : null;
            const isOptimal = annualized && annualized === Math.max(...horizons.map(hh => {
              const s = upgradeStats[`D${hh}`];
              return s.mean && s.count >= 30 ? (s.mean / hh) * 252 : -Infinity;
            }));
            
            return `
              <tr class="${isOptimal ? 'highlight' : ''}">
                <td><strong>D+${h}</strong></td>
                <td class="${stats.mean >= 0 ? 'positive' : 'negative'}">${formatPct(stats.mean)}</td>
                <td>${formatPct(stats.std)}</td>
                <td>${formatPct(stats.winRate)}</td>
                <td>${formatNum(stats.count)}</td>
                <td class="${dailyReturn >= 0 ? 'positive' : 'negative'}">${formatPct(dailyReturn)}</td>
                <td class="${annualized >= 0 ? 'positive' : 'negative'}"><strong>${formatPct(annualized)}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Downgrade Table -->
    <div class="table-container">
      <div class="table-title">📉 하향 조정 시 수익률 (직전 대비 목표가 하향, Short Position 참고)</div>
      <table>
        <thead>
          <tr>
            <th>보유 기간</th>
            <th>평균 수익률</th>
            <th>표준편차</th>
            <th>승률</th>
            <th>데이터 수</th>
            <th>일평균 수익</th>
            <th>연환산</th>
          </tr>
        </thead>
        <tbody>
          ${horizons.map(h => {
            const key = `D${h}`;
            const stats = downgradeStats[key];
            const dailyReturn = stats.mean ? stats.mean / h : null;
            const annualized = dailyReturn ? dailyReturn * 252 : null;
            
            return `
              <tr>
                <td><strong>D+${h}</strong></td>
                <td class="${stats.mean >= 0 ? 'positive' : 'negative'}">${formatPct(stats.mean)}</td>
                <td>${formatPct(stats.std)}</td>
                <td>${formatPct(stats.winRate)}</td>
                <td>${formatNum(stats.count)}</td>
                <td class="${dailyReturn >= 0 ? 'positive' : 'negative'}">${formatPct(dailyReturn)}</td>
                <td class="${annualized >= 0 ? 'positive' : 'negative'}"><strong>${formatPct(annualized)}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateEfficiencyHTML(results) {
  const { analystPattern, upgradeOptimal, downgradeOptimal } = results;
  if (!analystPattern) return '<p>데이터를 불러오는 중 오류가 발생했습니다.</p>';
  
  const { upgradeStats, downgradeStats, horizons, counts } = analystPattern;
  
  const formatPct = (val) => val !== null && val !== undefined 
    ? `${(val * 100).toFixed(2)}%` 
    : '-';
  
  // Calculate efficiency for all horizons
  const efficiencyData = horizons.map(h => {
    const upStats = upgradeStats[`D${h}`];
    const downStats = downgradeStats[`D${h}`];
    
    const upEfficiency = upStats.mean && upStats.count >= 30 ? (upStats.mean / h) * 252 : null;
    const downEfficiency = downStats.mean && downStats.count >= 30 ? (downStats.mean / h) * 252 : null;
    
    return {
      horizon: h,
      upgrade: {
        raw: upStats.mean,
        efficiency: upEfficiency,
        winRate: upStats.winRate,
        count: upStats.count
      },
      downgrade: {
        raw: downStats.mean,
        efficiency: downEfficiency,
        winRate: downStats.winRate,
        count: downStats.count
      }
    };
  });
  
  // Find max efficiency for bar scaling
  const maxEfficiency = Math.max(
    ...efficiencyData.map(d => Math.abs(d.upgrade.efficiency || 0)),
    ...efficiencyData.map(d => Math.abs(d.downgrade.efficiency || 0))
  );
  
  const formatNum = (val) => val !== null && val !== undefined 
    ? val.toLocaleString() 
    : '-';
  
  return `
    <div class="header">
      <h1>⚡ 거래 효율성 분석</h1>
      <p>보유 기간 대비 수익률을 연환산하여 가장 효율적인 거래 전략을 찾습니다.</p>
    </div>
    
    <div class="info-box">
      <h4>📐 효율성 계산 공식</h4>
      <p>
        <strong>일평균 수익률</strong> = 평균 수익률 / 보유일수<br>
        <strong>연환산 수익률</strong> = 일평균 수익률 × 252 (연간 거래일)<br><br>
        예시: D+1에서 1.5% 수익 → 연환산 378% vs D+14에서 5% 수익 → 연환산 90%<br>
        <strong>짧은 보유 기간의 높은 수익률이 장기 보유보다 효율적일 수 있습니다.</strong><br><br>
        📊 데이터: 상향 ${formatNum(counts?.upgrade)}건, 하향 ${formatNum(counts?.downgrade)}건
      </p>
    </div>
    
    <div class="table-container">
      <div class="table-title">📊 보유 기간별 효율성 비교 (직전 목표가 대비 변동 방향 기준)</div>
      <table>
        <thead>
          <tr>
            <th>보유 기간</th>
            <th colspan="3" style="text-align: center; background: rgba(0,212,170,0.1);">📈 상향 (직전 대비 ↑)</th>
            <th colspan="3" style="text-align: center; background: rgba(255,71,87,0.1);">📉 하향 (직전 대비 ↓)</th>
          </tr>
          <tr>
            <th></th>
            <th>수익률</th>
            <th>효율성</th>
            <th>승률</th>
            <th>수익률</th>
            <th>효율성</th>
            <th>승률</th>
          </tr>
        </thead>
        <tbody>
          ${efficiencyData.map(d => {
            const isUpOptimal = upgradeOptimal && d.horizon === upgradeOptimal.horizon;
            const isDownOptimal = downgradeOptimal && d.horizon === downgradeOptimal.horizon;
            
            return `
              <tr>
                <td><strong>D+${d.horizon}</strong></td>
                <td class="${d.upgrade.raw >= 0 ? 'positive' : 'negative'}">${formatPct(d.upgrade.raw)}</td>
                <td class="${isUpOptimal ? 'highlight' : ''} ${d.upgrade.efficiency >= 0 ? 'positive' : 'negative'}">
                  <strong>${formatPct(d.upgrade.efficiency)}</strong>
                  ${isUpOptimal ? ' ⭐' : ''}
                </td>
                <td>${formatPct(d.upgrade.winRate)}</td>
                <td class="${d.downgrade.raw >= 0 ? 'positive' : 'negative'}">${formatPct(d.downgrade.raw)}</td>
                <td class="${isDownOptimal ? 'highlight' : ''} ${d.downgrade.efficiency >= 0 ? 'positive' : 'negative'}">
                  <strong>${formatPct(d.downgrade.efficiency)}</strong>
                  ${isDownOptimal ? ' ⭐' : ''}
                </td>
                <td>${formatPct(d.downgrade.winRate)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <p style="margin-top: 16px; font-size: 12px; color: var(--text-secondary);">
        ⭐ = 해당 방향에서 가장 효율적인 보유 기간 (최소 30개 데이터 필요)
      </p>
    </div>
    
    <!-- Visual Efficiency Comparison -->
    <div class="strategy-card" style="margin-top: 24px;">
      <div class="table-title" style="margin-bottom: 24px;">📊 효율성 시각화 (상향 조정 기준)</div>
      ${efficiencyData.filter(d => d.upgrade.efficiency !== null).map(d => {
        const efficiency = d.upgrade.efficiency || 0;
        const width = Math.min(100, Math.abs(efficiency / maxEfficiency) * 100);
        const isPositive = efficiency >= 0;
        const barClass = efficiency > 0.5 ? 'high' : efficiency > 0 ? 'medium' : 'low';
        
        return `
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>D+${d.horizon}</span>
              <span class="${isPositive ? 'positive' : 'negative'}">${formatPct(efficiency)}</span>
            </div>
            <div class="efficiency-bar">
              <div class="efficiency-fill ${barClass}" style="width: ${width}%;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function registerPatternEndpoint(app, requireAuth) {
  if (requireAuth) {
    app.get('/pattern', requireAuth, patternHandler);
  } else {
    app.get('/pattern', patternHandler);
  }
  console.log('  GET /pattern - Pattern analysis dashboard');
}

