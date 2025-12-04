/**
 * GET /control - Configuration Management Page
 * POST /control/save - Save configuration to files
 * POST /control/updateHolidays - Update market holidays from FMP API
 * POST /control/saveEnvVars - Save encrypted environment variables
 * GET /control/getEnvVar - Get decrypted environment variable
 *
 * Authentication: Requires session-based login (handled by requireAuth middleware)
 */

import APP_CONFIG from '../../config/appConfig.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateHolidaysFromAPI } from '../../services/tradingDayService.js';
import { 
  saveEncryptedEnv, 
  getDecryptedEnvVar, 
  getEncryptedEnvKeys,
  loadEncryptedEnv
} from '../../lib/envEncryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATHS = {
  appConfig: path.join(__dirname, '../../config/appConfig.js'),
  apiList: path.join(__dirname, '../../../docs/ApiList.json'),
  evMethod: path.join(__dirname, '../../../docs/evMethod.json')
};

// Load API config files
async function loadApiList() {
  try {
    const content = await fs.readFile(PATHS.apiList, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load ApiList.json:', error.message);
    return null;
  }
}

async function loadEvMethod() {
  try {
    const content = await fs.readFile(PATHS.evMethod, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load evMethod.json:', error.message);
    return null;
  }
}

// Save configuration handler
export async function saveConfigHandler(req, res) {
  // Authentication is handled by requireAuth middleware in index.js

  try {
    const { appConfig, apiList, evMethod } = req.body;
    const results = { success: [], errors: [] };

    // Save appConfig.js
    if (appConfig) {
      try {
        const configContent = generateAppConfigFile(appConfig);
        await fs.writeFile(PATHS.appConfig, configContent, 'utf-8');
        results.success.push('appConfig.js');
      } catch (error) {
        results.errors.push({ file: 'appConfig.js', error: error.message });
      }
    }

    // Save ApiList.json
    if (apiList) {
      try {
        await fs.writeFile(PATHS.apiList, JSON.stringify(apiList, null, 2), 'utf-8');
        results.success.push('ApiList.json');
      } catch (error) {
        results.errors.push({ file: 'ApiList.json', error: error.message });
      }
    }

    // Save evMethod.json
    if (evMethod) {
      try {
        await fs.writeFile(PATHS.evMethod, JSON.stringify(evMethod, null, 2), 'utf-8');
        results.success.push('evMethod.json');
      } catch (error) {
        results.errors.push({ file: 'evMethod.json', error: error.message });
      }
    }

    if (results.errors.length > 0) {
      return res.status(207).json({
        message: 'Partial save completed',
        results,
        note: 'Restart server to apply changes'
      });
    }

    res.json({
      message: 'Configuration saved successfully',
      results,
      note: 'Restart server to apply changes'
    });
  } catch (error) {
    console.error('Save config error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Save encrypted environment variables handler
export async function saveEnvVarsHandler(req, res) {
  // Authentication check (from body or query)
  const apiKey = req.body?.api_key || req.query?.api_key;
  const validKey = process.env.CONTROL_API_KEY || process.env.FMP_API_KEY;
  
  if (!validKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized. API key required.' });
  }

  try {
    const { envVars } = req.body;
    
    if (!envVars || typeof envVars !== 'object') {
      return res.status(400).json({ error: 'envVars object required' });
    }

    await saveEncryptedEnv(envVars);
    
    res.json({
      success: true,
      message: `${Object.keys(envVars).length}개의 환경변수가 암호화되어 저장되었습니다.`,
      note: '서버를 재시작해야 변경사항이 적용됩니다.'
    });
  } catch (error) {
    console.error('Save env vars error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get decrypted environment variable handler
export async function getEnvVarHandler(req, res) {
  // Authentication is handled by requireAuth middleware in index.js

  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ error: 'key query parameter required' });
    }

    const value = await getDecryptedEnvVar(key);
    
    if (value === null) {
      return res.status(404).json({ error: `Environment variable '${key}' not found` });
    }
    
    res.json({ key, value });
  } catch (error) {
    console.error('Get env var error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Generate environment variables HTML section
async function generateEnvVarsHtml() {
  try {
    const encryptedVars = await loadEncryptedEnv();
    const keys = Object.keys(encryptedVars);
    
    if (keys.length === 0) {
      return '<p style="color: #888; padding: 16px;">저장된 환경변수가 없습니다. 아래에서 추가하세요.</p>';
    }
    
    let html = '<div class="env-vars-list">';
    
    for (const key of keys) {
      const isSensitive = /KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL/i.test(key);
      const escapedKey = key.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const inputType = isSensitive ? 'password' : 'text';
      const placeholder = isSensitive ? '********' : '[암호화됨]';
      
      html += '<div class="env-var-row" data-env-key="' + escapedKey + '">' +
        '<div class="env-var-key">' + escapedKey + '</div>' +
        '<div class="env-var-value">' +
          '<input type="' + inputType + '" class="config-input env-input" ' +
            'data-env-key="' + escapedKey + '" placeholder="' + placeholder + ' (새 값 입력 시 교체)">' +
          (isSensitive ? '<button class="btn-icon" data-action="reveal" data-env-key="' + escapedKey + '" title="값 복사">👁️</button>' : '') +
          '<button class="btn-icon btn-delete" data-action="delete" data-env-key="' + escapedKey + '" title="삭제">🗑️</button>' +
        '</div>' +
      '</div>';
    }
    
    html += '</div>';
    return html;
  } catch (error) {
    return '<p class="error">환경변수 로드 실패: ' + error.message + '</p>';
  }
}

// Generate appConfig.js file content
function generateAppConfigFile(config) {
  return `/**
 * Central Application Configuration
 * Auto-generated by Control Panel
 * Generated at: ${new Date().toISOString()}
 */

// ============================================
// 1. SCHEDULER SETTINGS
// ============================================
export const SCHEDULER = ${JSON.stringify(config.SCHEDULER || APP_CONFIG.SCHEDULER, null, 2)};

// ============================================
// 2. BATCH PROCESSING SETTINGS
// ============================================
export const BATCH = ${JSON.stringify(config.BATCH || APP_CONFIG.BATCH, null, 2)};

// ============================================
// 3. API RATE LIMITS
// ============================================
export const RATE_LIMIT = ${JSON.stringify(config.RATE_LIMIT || APP_CONFIG.RATE_LIMIT, null, 2)};

// ============================================
// 3-1. ADAPTIVE RATE LIMITING
// ============================================
export const ADAPTIVE_RATE = ${JSON.stringify(config.ADAPTIVE_RATE || APP_CONFIG.ADAPTIVE_RATE, null, 2)};

// ============================================
// 4. DATABASE QUERY LIMITS
// ============================================
export const DB_LIMITS = ${JSON.stringify(config.DB_LIMITS || APP_CONFIG.DB_LIMITS, null, 2)};

// ============================================
// 5. CACHE SETTINGS
// ============================================
export const CACHE = {
  SYMBOL_CACHE_DAYS: ${config.CACHE?.SYMBOL_CACHE_DAYS || APP_CONFIG.CACHE.SYMBOL_CACHE_DAYS},
  SYMBOL_CACHE_MS: ${config.CACHE?.SYMBOL_CACHE_DAYS || APP_CONFIG.CACHE.SYMBOL_CACHE_DAYS} * 24 * 60 * 60 * 1000
};

// ============================================
// 6. PRICE TREND HORIZONS
// ============================================
export const PRICE_TREND = ${JSON.stringify(config.PRICE_TREND || APP_CONFIG.PRICE_TREND, null, 2)};

// ============================================
// 6-1. RETURN CAP SETTINGS (for Dashboard/Control UI)
// ============================================
export const RETURN_CAP = ${JSON.stringify(config.RETURN_CAP || APP_CONFIG.RETURN_CAP, null, 2)};

// ============================================
// 7. TABLE NAMES
// ============================================
export const TABLES = ${JSON.stringify(config.TABLES || APP_CONFIG.TABLES, null, 2)};

// ============================================
// 7-1. MARKET HOLIDAYS SETTINGS
// ============================================
export const MARKET_HOLIDAYS = ${JSON.stringify(config.MARKET_HOLIDAYS || APP_CONFIG.MARKET_HOLIDAYS, null, 2)};

// ============================================
// 8. API ENDPOINTS
// ============================================
export const ENDPOINTS = ${JSON.stringify(config.ENDPOINTS || APP_CONFIG.ENDPOINTS, null, 2)};

// ============================================
// EXPORT ALL CONFIG
// ============================================
export const APP_CONFIG = {
  SCHEDULER,
  BATCH,
  RATE_LIMIT,
  ADAPTIVE_RATE,
  DB_LIMITS,
  CACHE,
  PRICE_TREND,
  RETURN_CAP,
  TABLES,
  MARKET_HOLIDAYS,
  ENDPOINTS
};

export default APP_CONFIG;
`;
}

// Generate editable API service cards
function generateApiServicesHtml(apiList) {
  if (!apiList) return '<p class="error">ApiList.json을 로드할 수 없습니다.</p>';

  const renderService = (serviceConfig, category, path) => {
    if (!serviceConfig || !serviceConfig.id) return '';
    
    let fieldMapRows = '';
    if (serviceConfig.fieldMap) {
      const entries = Object.entries(serviceConfig.fieldMap).filter(([key]) => key !== 'Description');
      fieldMapRows = entries.map(([key, value], idx) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
        return '<tr>' +
          '<td><input type="text" class="field-input" data-path="' + path + '.fieldMap.' + key + '.key" value="' + key + '"></td>' +
          '<td><input type="text" class="field-input" data-path="' + path + '.fieldMap.' + key + '.value" value="' + valueStr + '"></td>' +
          '</tr>';
      }).join('');
    }

    return '<div class="api-service-card" data-service-path="' + path + '">' +
      '<div class="service-header">' +
        '<div>' +
          '<span class="service-id">' + serviceConfig.id + '</span>' +
          '<span class="service-category">' + category + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="config-row">' +
        '<span class="config-key">id</span>' +
        '<input type="text" class="config-input api-field" data-path="' + path + '.id" value="' + serviceConfig.id + '">' +
      '</div>' +
      '<div class="config-row">' +
        '<span class="config-key">API</span>' +
        '<input type="text" class="config-input api-field" style="width: 100%; text-align: left;" data-path="' + path + '.API" value="' + (serviceConfig.API || '') + '">' +
      '</div>' +
      (fieldMapRows ? 
        '<div class="fieldmap-section">' +
          '<h5>fieldMap</h5>' +
          '<table class="field-map-table">' +
            '<thead><tr><th>코드 변수</th><th>API 응답 키</th></tr></thead>' +
            '<tbody>' + fieldMapRows + '</tbody>' +
          '</table>' +
        '</div>' : '') +
      '</div>';
  };

  const processCategory = (obj, basePath = '', categoryPath = '') => {
    let html = '';
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'function' || key === 'Description') continue;
      
      const currentPath = basePath ? basePath + '.' + key : key;
      
      if (value && typeof value === 'object') {
        if (value['service-FMP']) {
          html += renderService(value['service-FMP'], categoryPath || key, currentPath + '.service-FMP');
        } else if (!value.id && !value.API) {
          html += processCategory(value, currentPath, categoryPath ? categoryPath + ' > ' + key : key);
        }
      }
    }
    return html;
  };

  return processCategory(apiList);
}

// Generate metrics HTML with editing
function generateMetricsHtml(evMethod) {
  if (!evMethod) return '<p class="error">evMethod.json을 로드할 수 없습니다.</p>';

  let html = '';

  // Aggregations
  if (evMethod.aggregations) {
    html += '<h4 id="aggregations">집계 함수 (Aggregations)</h4>';
    html += '<div class="metrics-grid">';
    for (const [id, agg] of Object.entries(evMethod.aggregations)) {
      if (id === 'description') continue;
      const basePath = 'aggregations.' + id;
      html += '<div class="metric-card">' +
        '<div class="metric-header">' +
          '<span class="metric-id">' + (agg.id || id) + '</span>' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">description</span>' +
          '<input type="text" class="config-input ev-field" style="width: 100%;" data-path="' + basePath + '.description" value="' + (agg.description || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">formula</span>' +
          '<input type="text" class="config-input ev-field" style="width: 100%;" data-path="' + basePath + '.formula" value="' + (agg.formula || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">input</span>' +
          '<input type="text" class="config-input ev-field" data-path="' + basePath + '.input" value="' + (agg.input || '') + '">' +
        '</div>' +
      '</div>';
    }
    html += '</div>';
  }

  // Quantitative Metrics
  if (evMethod.metrics && evMethod.metrics.getQuantitiveValuation) {
    html += '<h4 id="quantitative-metrics">정량 지표 (Quantitative Metrics)</h4>';
    html += '<div class="metrics-grid">';
    for (const [id, metric] of Object.entries(evMethod.metrics.getQuantitiveValuation)) {
      const basePath = 'metrics.getQuantitiveValuation.' + id;
      html += '<div class="metric-card wide">' +
        '<div class="metric-header">' +
          '<span class="metric-id">' + (metric.id || id) + '</span>' +
          '<span class="metric-name">' + (metric.displayName || id) + '</span>' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">displayName</span>' +
          '<input type="text" class="config-input ev-field" data-path="' + basePath + '.displayName" value="' + (metric.displayName || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">formula</span>' +
          '<input type="text" class="config-input ev-field" style="width: 100%;" data-path="' + basePath + '.formula" value="' + (metric.formula || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<p class="metric-desc">' + (metric.description || '') + '</p>' +
      '</div>';
    }
    html += '</div>';
  }

  // Qualitative Metrics
  if (evMethod.metrics && evMethod.metrics.getQualativeValuation) {
    html += '<h4 id="qualitative-metrics">정성 지표 (Qualitative Metrics)</h4>';
    html += '<div class="metrics-grid">';
    for (const [id, metric] of Object.entries(evMethod.metrics.getQualativeValuation)) {
      const basePath = 'metrics.getQualativeValuation.' + id;
      html += '<div class="metric-card wide">' +
        '<div class="metric-header">' +
          '<span class="metric-id">' + (metric.id || id) + '</span>' +
          '<span class="metric-name">' + (metric.displayName || id) + '</span>' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">displayName</span>' +
          '<input type="text" class="config-input ev-field" data-path="' + basePath + '.displayName" value="' + (metric.displayName || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<div class="config-row">' +
          '<span class="config-key">formula</span>' +
          '<input type="text" class="config-input ev-field" style="width: 100%;" data-path="' + basePath + '.formula" value="' + (metric.formula || '').replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<p class="metric-desc">' + (metric.description || '') + '</p>' +
      '</div>';
    }
    html += '</div>';
  }

  return html;
}

// Generate table rows HTML
function generateTableRows(tables) {
  return Object.entries(tables).map(([key, value]) => {
    return '<div class="config-row"><span class="config-key">' + key + '</span><input type="text" class="config-input" data-key="TABLES.' + key + '" value="' + value + '"></div>';
  }).join('');
}

export default async function controlPage(req, res) {
  // Authentication is handled by requireAuth middleware in index.js

  const apiList = await loadApiList();
  const evMethod = await loadEvMethod();
  const apiServicesHtml = generateApiServicesHtml(apiList);
  const metricsHtml = generateMetricsHtml(evMethod);
  const tableRowsHtml = generateTableRows(APP_CONFIG.TABLES);
  const envVarsHtml = await generateEnvVarsHtml();

  // Serialize current data for JavaScript
  const apiListJson = JSON.stringify(apiList || {});
  const evMethodJson = JSON.stringify(evMethod || {});

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Control Panel - 설정 관리</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      font-family: 'Noto Sans KR', sans-serif;
      line-height: 1.7;
      color: #111;
      background: #999;
    }
    .page-wrapper { display: flex; min-height: 100vh; }
    .toc-sidebar {
      width: 280px;
      background: #2b2b2b;
      color: #e0e0e0;
      position: fixed;
      top: 60px; left: 0;
      height: calc(100vh - 60px);
      overflow-y: auto;
      padding: 24px 16px;
      border-right: 1px solid #1a1a1a;
      z-index: 1000;
      scrollbar-width: none;
    }
    .toc-sidebar::-webkit-scrollbar { display: none; }
    .toc-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #3a3a3a;
    }
    .toc-list { list-style: none; }
    .toc-item { margin-bottom: 4px; }
    .toc-link {
      display: block;
      text-decoration: none;
      color: #e0e0e0;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    .toc-link:hover { background: #3a3a3a; color: #fff; }
    .toc-link.active { background: #0066cc; color: #fff; }
    .toc-link.level-2 { padding-left: 24px; font-size: 0.85rem; color: #c0c0c0; }

    /* Status Widget in Sidebar */
    .sidebar-status-widget {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #3a3a3a;
    }
    .status-widget-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #999999;
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
      color: #c0c0c0;
    }
    .status-widget-stat strong {
      color: #ffffff;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .content-wrapper {
      margin-left: 280px;
      flex: 1;
      background: #999;
      padding: 32px;
      min-height: calc(100vh - 60px);
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #f3f3f3;
      padding: 32px 32px 40px;
      border-radius: 6px;
      border: 1px solid #dedede;
    }
    h1 {
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ddd;
    }
    h2 { font-size: 1.3rem; margin-bottom: 12px; margin-top: 30px; }
    h4 { font-size: 0.96rem; margin-top: 16px; margin-bottom: 8px; color: #333; }
    h5 { font-size: 0.85rem; margin-top: 12px; margin-bottom: 6px; color: #555; }
    .section-intro {
      font-size: 0.95rem;
      color: #444;
      padding: 14px 16px;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e3e3e3;
      margin-bottom: 28px;
    }
    .section-block {
      border: 1px solid #dddddd;
      border-radius: 6px;
      padding: 20px;
      background: #ffffff;
      margin-bottom: 24px;
    }
    .section-block > h2 {
      margin-top: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e3e3e3;
    }
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .config-card {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
    }
    .config-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    .config-card-title { font-weight: 600; font-size: 0.95rem; }
    .priority-badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;
    }
    .priority-high { background: #ffebee; color: #c62828; }
    .priority-medium { background: #fff8e1; color: #f57f17; }
    .priority-low { background: #e8f5e9; color: #2e7d32; }
    .config-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      flex-wrap: wrap;
      gap: 8px;
    }
    .config-row:last-child { border-bottom: none; }
    .config-key {
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
      color: #0066cc;
      min-width: 180px;
    }
    .config-input, .field-input {
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
      background: #fff;
      border: 1px solid #ccc;
      padding: 4px 10px;
      border-radius: 4px;
      width: 150px;
      text-align: right;
    }
    .config-input:focus, .field-input:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 2px rgba(0,102,204,0.2);
    }
    .config-desc { font-size: 0.75rem; color: #888; margin-top: 2px; }
    .api-services-list { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
    .api-service-card {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 16px;
    }
    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    .service-id {
      font-family: ui-monospace, monospace;
      font-size: 0.9rem;
      font-weight: 600;
      color: #0066cc;
    }
    .service-category {
      font-size: 0.75rem;
      color: #888;
      background: #eee;
      padding: 2px 8px;
      border-radius: 10px;
      margin-left: 8px;
    }
    .fieldmap-section { margin-top: 12px; }
    .field-map-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      margin-top: 8px;
    }
    .field-map-table th {
      background: #f0f0f0;
      padding: 6px 10px;
      text-align: left;
      font-weight: 500;
    }
    .field-map-table td { padding: 4px 6px; }
    .field-map-table .field-input { width: 100%; text-align: left; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .metric-card {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 14px 16px;
    }
    .metric-card.wide { grid-column: span 2; }
    @media (max-width: 800px) { .metric-card.wide { grid-column: span 1; } }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .metric-id {
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
      font-weight: 600;
      color: #0066cc;
    }
    .metric-name { font-size: 0.8rem; color: #666; }
    .metric-desc { font-size: 0.8rem; color: #666; margin-top: 8px; }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-primary { background: #0066cc; color: #fff; }
    .btn-primary:hover { background: #0052a3; }
    .btn-save { background: #2e7d32; color: #fff; }
    .btn-save:hover { background: #1b5e20; }
    .btn-reset { background: #757575; color: #fff; }
    .btn-reset:hover { background: #616161; }
    .action-bar {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      position: sticky;
      bottom: 24px;
    }
    .toast {
      position: fixed;
      bottom: 24px; right: 24px;
      padding: 12px 24px;
      background: #333;
      color: #fff;
      border-radius: 6px;
      font-size: 0.9rem;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s;
      z-index: 9999;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.success { background: #2e7d32; }
    .toast.error { background: #c62828; }
    .toc-toggle {
      display: none;
      position: fixed;
      top: 16px; left: 16px;
      z-index: 1001;
      background: #2b2b2b;
      color: #fff;
      border: none;
      padding: 10px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2rem;
    }
    @media (max-width: 1024px) {
      .toc-sidebar { transform: translateX(-100%); transition: transform 0.3s; }
      .toc-sidebar.open { transform: translateX(0); }
      .content-wrapper { margin-left: 0; }
      .toc-toggle { display: block; }
    }
    @media (max-width: 768px) {
      .config-grid, .metrics-grid { grid-template-columns: 1fr; }
    }
    .error { color: #c62828; padding: 16px; background: #ffebee; border-radius: 4px; }
    .note {
      padding: 10px 12px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      background: #fafafa;
      margin: 10px 0 16px;
      font-size: 0.94rem;
    }
    code {
      font-family: ui-monospace, monospace;
      background: #f5f5f5;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.88rem;
    }
    .save-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 8px;
    }
    .save-indicator.modified { background: #f57f17; }
    .save-indicator.saved { background: #2e7d32; }
    
    /* Environment Variables Styles */
    .env-vars-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }
    .env-var-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      gap: 12px;
    }
    .env-var-key {
      font-family: ui-monospace, monospace;
      font-size: 0.9rem;
      font-weight: 600;
      color: #0066cc;
      min-width: 200px;
    }
    .env-var-value {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .env-var-value .env-input {
      flex: 1;
      min-width: 200px;
      text-align: left;
    }
    .btn-icon {
      background: none;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .btn-icon:hover {
      background: #f0f0f0;
      border-color: #ccc;
    }
    .btn-icon.btn-delete:hover {
      background: #ffebee;
      border-color: #c62828;
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

    .top-nav-toggle-main {
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

      .top-nav-toggle-main {
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

    .page-wrapper {
      margin-top: 0;
    }

    .toc-sidebar {
      top: 60px;
      height: calc(100vh - 60px);
    }

    .toc-toggle {
      top: 76px;
    }
  </style>
</head>
<body>
  <!-- Top Navigation -->
  <nav class="top-nav">
    <a href="/" class="top-nav-brand">📊 Financial API</a>
    <button class="top-nav-toggle-main" onclick="document.querySelector('.top-nav-links').classList.toggle('open')">☰</button>
    <div class="top-nav-links">
      <a href="/apiguide" class="top-nav-link">API Guide</a>
      <a href="/control" class="top-nav-link active">Control</a>
      <a href="/tracker" class="top-nav-link">Tracker</a>
      <a href="/proceeding" class="top-nav-link">Proceeding</a>
      <a href="/dashboard" class="top-nav-link">Dashboard</a>
      <a href="/pattern" class="top-nav-link">Pattern</a>
      <div class="top-nav-right">
        <span class="top-nav-user">👤 ${req.user.username}</span>
        <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
        <a href="/" class="top-nav-link">🏠 Home</a>
      </div>
    </div>
  </nav>

  <button class="toc-toggle" onclick="document.querySelector('.toc-sidebar').classList.toggle('open')">☰</button>

  <div class="page-wrapper">
    <nav class="toc-sidebar">
      <div class="toc-title">Control Panel</div>
      <ul class="toc-list">
        <li class="toc-item"><a href="#overview" class="toc-link">📋 개요</a></li>
        <li class="toc-item"><a href="#env-vars" class="toc-link">🔐 환경변수</a></li>
        <li class="toc-item"><a href="#scheduler" class="toc-link">⏰ 스케줄러</a></li>
        <li class="toc-item"><a href="#batch" class="toc-link">📦 배치 처리</a></li>
        <li class="toc-item"><a href="#rate-limit" class="toc-link">🚦 Rate Limit</a></li>
        <li class="toc-item"><a href="#adaptive-rate" class="toc-link">⚡ Adaptive Rate</a></li>
        <li class="toc-item"><a href="#db-limits" class="toc-link">🗄️ DB Limit</a></li>
        <li class="toc-item"><a href="#cache" class="toc-link">💾 캐시</a></li>
        <li class="toc-item"><a href="#price-trend" class="toc-link">📈 Price Trend</a></li>
        <li class="toc-item"><a href="#tables" class="toc-link">📋 테이블</a></li>
        <li class="toc-item"><a href="#symbol-cache" class="toc-link">🔤 심볼 캐시</a></li>
        <li class="toc-item"><a href="#api-services" class="toc-link">🔗 API 서비스</a></li>
        <li class="toc-item"><a href="#aggregations" class="toc-link level-2">집계 함수</a></li>
        <li class="toc-item"><a href="#quantitative-metrics" class="toc-link level-2">정량 지표</a></li>
        <li class="toc-item"><a href="#qualitative-metrics" class="toc-link level-2">정성 지표</a></li>
      </ul>

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
    </nav>

    <div class="content-wrapper">
      <div class="container">
        <h1 id="overview">⚙️ Control Panel - 설정 관리 <span class="save-indicator" id="saveIndicator"></span></h1>

        <div class="section-intro">
          <strong>설정 관리 페이지</strong><br>
          모든 설정을 수정하고 <strong>💾 설정 저장</strong> 버튼을 클릭하면 파일에 반영됩니다.<br>
          저장 후 서버를 재시작해야 변경사항이 적용됩니다.<br>
          <strong>저장 대상:</strong> <code>appConfig.js</code>, <code>ApiList.json</code>, <code>evMethod.json</code>
        </div>

        <!-- 기능 안내 박스 -->
        <div class="section-block" style="background: linear-gradient(135deg, rgba(0, 102, 204, 0.1), rgba(46, 125, 50, 0.1)); border-color: #0066cc; margin-top: 24px;">
          <h2 style="color: #0066cc; margin-bottom: 12px;">📚 Control Panel 기능 안내</h2>
          <p style="line-height: 1.7; margin-bottom: 16px;">
            <strong>Control Panel</strong>은 API 설정, 환경변수, 스케줄러, 배치 처리, Rate Limit 등 시스템의 모든 설정을 관리하는 중앙 제어 페이지입니다.
          </p>
          
          <div style="padding-left: 16px;">
            <p style="margin-bottom: 12px; font-weight: 600;">🔐 환경변수 (암호화)</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>AES-256-GCM 암호화</strong>: FMP_API_KEY, CONTROL_API_KEY, SUPABASE 정보 등 민감한 데이터를 암호화하여 저장</li>
              <li><strong>안전한 관리</strong>: config/env.encrypted.json에 암호화된 상태로 저장</li>
              <li><strong>실시간 조회</strong>: 👁️ 버튼으로 복호화된 값 확인 (마스킹 처리)</li>
              <li><strong>추가/수정/삭제</strong>: 환경변수를 브라우저에서 직접 관리</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">⏰ 스케줄러</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>Cron 표현식</strong>: 주기적으로 실행할 작업의 스케줄 설정</li>
              <li><strong>시간대 설정</strong>: 미국 시장 시간(America/New_York) 기준 스케줄 관리</li>
              <li><strong>작업 유형</strong>: Price Tracker 업데이트, 캐시 정리, 데이터 백업 등</li>
              <li><strong>활성화/비활성화</strong>: 개별 스케줄 작업을 켜고 끌 수 있음</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">📦 배치 처리</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>동시 처리 수</strong>: 한 번에 몇 개의 요청을 병렬로 처리할지 설정</li>
              <li><strong>배치 크기</strong>: 대량 데이터를 몇 개씩 묶어서 처리할지 결정</li>
              <li><strong>재시도 정책</strong>: 실패 시 몇 번까지 재시도할지, 간격은 얼마나 둘지 설정</li>
              <li><strong>타임아웃</strong>: 요청이 얼마나 오래 걸리면 실패로 처리할지 지정</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">🚦 Rate Limit</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>FMP API 제한</strong>: 분당/일당 호출 횟수 제한 설정</li>
              <li><strong>자동 조절</strong>: Rate Limit 도달 시 자동으로 요청 속도 감소</li>
              <li><strong>우선순위</strong>: 중요한 요청과 일반 요청의 우선순위 관리</li>
              <li><strong>모니터링</strong>: 현재 사용량과 남은 할당량 실시간 확인</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">💾 DB Limit (Supabase)</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>테이블별 용량</strong>: 각 테이블의 최대 행 수 또는 용량 제한</li>
              <li><strong>자동 정리</strong>: 오래된 데이터 자동 삭제 정책</li>
              <li><strong>백업 설정</strong>: 중요 데이터 백업 주기 및 보관 기간</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">💰 캐시 관리</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>캐시 TTL</strong>: 캐시 데이터 유효 시간 설정</li>
              <li><strong>캐시 크기</strong>: 메모리에 저장할 캐시 최대 크기</li>
              <li><strong>캐시 갱신</strong>: 언제 캐시를 자동으로 갱신할지 설정</li>
              <li><strong>수동 정리</strong>: 특정 캐시 또는 전체 캐시 즉시 삭제</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">📊 Price Trend 설정</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>추적 기간</strong>: D+1 ~ D+N까지 몇 일을 추적할지 설정</li>
              <li><strong>업데이트 주기</strong>: 매일 자동 업데이트 시간 지정</li>
              <li><strong>데이터 소스</strong>: FMP API 엔드포인트 및 파라미터 설정</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">🧪 테이블 (데이터베이스)</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>테이블 이름</strong>: Supabase의 테이블명 매핑</li>
              <li><strong>스키마 확인</strong>: 각 테이블의 컬럼 구조 및 인덱스</li>
              <li><strong>접근 권한</strong>: 테이블별 읽기/쓰기 권한 설정</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">📝 심볼 캐시</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px;">
              <li><strong>티커 목록</strong>: 거래 가능한 모든 티커의 메타데이터 캐시</li>
              <li><strong>자동 갱신</strong>: 정기적으로 FMP에서 최신 티커 목록 가져오기</li>
              <li><strong>검색 최적화</strong>: 티커 검색 속도 향상을 위한 인덱싱</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600;">🛠️ API 서비스</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8;">
              <li><strong>엔드포인트 설정</strong>: 각 API 엔드포인트의 활성화 여부</li>
              <li><strong>파라미터 검증</strong>: 필수/선택 파라미터 설정</li>
              <li><strong>응답 형식</strong>: JSON, NDJSON 등 출력 형식 지정</li>
            </ul>
            
            <p style="font-size: 0.85rem; color: #666666; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
              <strong>💡 저장 방법</strong>: 모든 설정을 수정한 후 상단 또는 하단의 <strong>💾 설정 저장</strong> 버튼을 클릭하세요. 
              저장 후 반드시 <strong>서버를 재시작</strong>해야 변경사항이 적용됩니다.<br><br>
              <strong>⚠️ 중요</strong>: 환경변수는 즉시 저장되지만, appConfig.js 변경사항은 서버 재시작 전까지 반영되지 않습니다.
            </p>
          </div>
        </div>

        <!-- Action Bar (Top) -->
        <div class="action-bar" style="position: static; margin-bottom: 20px;">
          <button class="btn btn-save" onclick="saveAllConfig()">💾 설정 저장</button>
          <button class="btn btn-reset" onclick="resetConfig()">↺ 새로고침</button>
          <button class="btn btn-primary" onclick="exportConfig()">📤 내보내기</button>
        </div>

        <!-- Environment Variables Management -->
        <section class="section-block">
          <h2 id="env-vars">🔐 환경변수 및 API 키 관리 <span class="priority-badge priority-high">높음</span></h2>
          <div class="note">
            <strong>암호화 저장:</strong> 모든 환경변수는 AES-256-GCM으로 암호화되어 <code>config/env.encrypted.json</code>에 저장됩니다.<br>
            민감한 키(KEY, SECRET, PASSWORD 포함)는 자동으로 마스킹됩니다. 👁️ 버튼으로 값을 클립보드에 복사할 수 있습니다.
          </div>
          
          <h4>현재 저장된 환경변수</h4>
          <div id="envVarsContainer">
            ${envVarsHtml}
          </div>
          
          <h4 style="margin-top: 20px;">➕ 새 환경변수 추가</h4>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row">
                <div><span class="config-key">키 (KEY)</span></div>
                <input type="text" id="newEnvKey" class="config-input" style="width: 200px; text-align: left;" placeholder="FMP_API_KEY">
              </div>
              <div class="config-row">
                <div><span class="config-key">값 (VALUE)</span></div>
                <input type="password" id="newEnvValue" class="config-input" style="width: 300px; text-align: left;" placeholder="값 입력">
              </div>
              <div class="config-row">
                <button class="btn btn-primary" onclick="addNewEnvVar()">➕ 추가</button>
              </div>
            </div>
          </div>
          
          <div class="action-bar" style="position: static; margin-top: 20px;">
            <button class="btn btn-save" onclick="saveEnvVars()">💾 환경변수 저장</button>
            <span id="envSaveStatus" style="margin-left: 12px; font-size: 0.9rem;"></span>
          </div>
        </section>

        <!-- Scheduler Settings -->
        <section class="section-block">
          <h2 id="scheduler">⏰ 스케줄러 설정 <span class="priority-badge priority-high">높음</span></h2>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">Analyst Log 자동 갱신</span>
              </div>
              <div class="config-row">
                <div><span class="config-key">ANALYST_REFRESH_CRON</span><div class="config-desc">Cron 표현식</div></div>
                <input type="text" class="config-input" data-key="SCHEDULER.ANALYST_REFRESH_CRON" value="${APP_CONFIG.SCHEDULER.ANALYST_REFRESH_CRON}">
              </div>
              <div class="config-row">
                <div><span class="config-key">TIMEZONE</span><div class="config-desc">타임존</div></div>
                <input type="text" class="config-input" data-key="SCHEDULER.TIMEZONE" value="${APP_CONFIG.SCHEDULER.TIMEZONE}">
              </div>
              <div class="config-row">
                <div><span class="config-key">ENABLED</span></div>
                <select class="config-input" data-key="SCHEDULER.ENABLED">
                  <option value="true" ${APP_CONFIG.SCHEDULER.ENABLED ? 'selected' : ''}>true</option>
                  <option value="false" ${!APP_CONFIG.SCHEDULER.ENABLED ? 'selected' : ''}>false</option>
                </select>
              </div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">📅 휴장일 관리 (Market Holidays)</span>
              </div>
              <div class="note" style="margin-bottom: 15px;">
                <strong>거래일 계산:</strong> D+N은 거래일 기준으로 계산됩니다. 주말과 휴장일은 자동으로 건너뜁니다.
                <br>예: 금요일 매수 → D+1 = 월요일, D+2 = 화요일
              </div>
              <div class="config-row">
                <div><span class="config-key">DEFAULT_EXCHANGE</span><div class="config-desc">기본 거래소</div></div>
                <input type="text" class="config-input" data-key="MARKET_HOLIDAYS.DEFAULT_EXCHANGE" value="${APP_CONFIG.MARKET_HOLIDAYS?.DEFAULT_EXCHANGE || 'NASDAQ'}">
              </div>
              <div class="config-row">
                <div><span class="config-key">UPDATE_ON_STARTUP</span><div class="config-desc">서버 시작 시 자동 업데이트</div></div>
                <select class="config-input" data-key="MARKET_HOLIDAYS.UPDATE_ON_STARTUP">
                  <option value="true" ${APP_CONFIG.MARKET_HOLIDAYS?.UPDATE_ON_STARTUP !== false ? 'selected' : ''}>true</option>
                  <option value="false" ${APP_CONFIG.MARKET_HOLIDAYS?.UPDATE_ON_STARTUP === false ? 'selected' : ''}>false</option>
                </select>
              </div>
              <div class="config-row">
                <div><span class="config-key">수동 업데이트</span><div class="config-desc">FMP API에서 휴장일 정보 가져오기</div></div>
                <button class="btn btn-primary" onclick="updateHolidays()" id="updateHolidaysBtn">🔄 휴장일 업데이트</button>
              </div>
              <div id="holidaysStatus" style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted);"></div>
            </div>
          </div>
        </section>

        <!-- Return Cap Settings -->
        <section class="section-block">
          <h2 id="return-cap">📊 수익률 상한/하한 설정 <span class="priority-badge priority-high">높음</span></h2>
          <div class="note">
            <strong>동적 Cap 적용:</strong> DB에는 순수 수익률(종가 기준)만 저장됩니다.<br>
            Dashboard와 Control 페이지에서 아래 설정값을 기준으로 실시간 변환하여 표시합니다.<br>
            최적의 익절/손절 기준을 찾기 위해 값을 조절하며 분석할 수 있습니다.
          </div>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row">
                <div><span class="config-key">MAX_CAP_PCT</span><div class="config-desc">익절 상한 (예: 0.20 = 20%)</div></div>
                <input type="number" step="0.01" class="config-input" data-key="RETURN_CAP.MAX_CAP_PCT" value="${APP_CONFIG.RETURN_CAP?.MAX_CAP_PCT || 0.20}">
              </div>
              <div class="config-row">
                <div><span class="config-key">LOW_CAP_PCT</span><div class="config-desc">손절 하한 (예: 0.05 = 5%)</div></div>
                <input type="number" step="0.01" class="config-input" data-key="RETURN_CAP.LOW_CAP_PCT" value="${APP_CONFIG.RETURN_CAP?.LOW_CAP_PCT || 0.05}">
              </div>
              <div class="config-row">
                <div><span class="config-key">ENABLED</span><div class="config-desc">Cap 적용 활성화</div></div>
                <select class="config-input" data-key="RETURN_CAP.ENABLED">
                  <option value="true" ${APP_CONFIG.RETURN_CAP?.ENABLED !== false ? 'selected' : ''}>true</option>
                  <option value="false" ${APP_CONFIG.RETURN_CAP?.ENABLED === false ? 'selected' : ''}>false</option>
                </select>
              </div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">💡 Cap 계산 방식</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6;">
                <p><strong>Long 포지션:</strong></p>
                <ul style="margin-left: 20px; margin-bottom: 10px;">
                  <li>high ≥ 진입가 × (1 + MAX_CAP) → 시가 청산</li>
                  <li>low ≤ 진입가 × (1 - LOW_CAP) → 시가 청산</li>
                  <li>그 외 → 종가 청산</li>
                </ul>
                <p><strong>Short 포지션:</strong></p>
                <ul style="margin-left: 20px;">
                  <li>low ≤ 진입가 × (1 - MAX_CAP) → 시가 청산</li>
                  <li>high ≥ 진입가 × (1 + LOW_CAP) → 시가 청산</li>
                  <li>그 외 → 종가 청산</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- Batch Processing -->
        <section class="section-block">
          <h2 id="batch">📦 배치 처리 <span class="priority-badge priority-high">높음</span></h2>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row">
                <div><span class="config-key">PRICE_TARGET_BATCH_SIZE</span><div class="config-desc">동시 API 호출 수</div></div>
                <input type="number" class="config-input" data-key="BATCH.PRICE_TARGET_BATCH_SIZE" value="${APP_CONFIG.BATCH.PRICE_TARGET_BATCH_SIZE}">
              </div>
              <div class="config-row">
                <div><span class="config-key">PRICE_TARGET_BATCH_DELAY_MS</span><div class="config-desc">배치 간 딜레이 (ms)</div></div>
                <input type="number" class="config-input" data-key="BATCH.PRICE_TARGET_BATCH_DELAY_MS" value="${APP_CONFIG.BATCH.PRICE_TARGET_BATCH_DELAY_MS}">
              </div>
              <div class="config-row">
                <div><span class="config-key">DB_UPSERT_BATCH_SIZE</span><div class="config-desc">DB 저장 배치 크기</div></div>
                <input type="number" class="config-input" data-key="BATCH.DB_UPSERT_BATCH_SIZE" value="${APP_CONFIG.BATCH.DB_UPSERT_BATCH_SIZE}">
              </div>
              <div class="config-row">
                <div><span class="config-key">FMP_PARALLEL_BATCH_SIZE</span></div>
                <input type="number" class="config-input" data-key="BATCH.FMP_PARALLEL_BATCH_SIZE" value="${APP_CONFIG.BATCH.FMP_PARALLEL_BATCH_SIZE}">
              </div>
            </div>
          </div>
        </section>

        <!-- Rate Limits -->
        <section class="section-block">
          <h2 id="rate-limit">🚦 API Rate Limit <span class="priority-badge priority-medium">중간</span></h2>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row">
                <div><span class="config-key">FMP_REQUESTS_PER_MINUTE</span></div>
                <input type="number" class="config-input" data-key="RATE_LIMIT.FMP_REQUESTS_PER_MINUTE" value="${APP_CONFIG.RATE_LIMIT.FMP_REQUESTS_PER_MINUTE}">
              </div>
              <div class="config-row">
                <div><span class="config-key">FMP_WINDOW_MS</span></div>
                <input type="number" class="config-input" data-key="RATE_LIMIT.FMP_WINDOW_MS" value="${APP_CONFIG.RATE_LIMIT.FMP_WINDOW_MS}">
              </div>
              <div class="config-row">
                <div><span class="config-key">API_TIMEOUT_MS</span></div>
                <input type="number" class="config-input" data-key="RATE_LIMIT.API_TIMEOUT_MS" value="${APP_CONFIG.RATE_LIMIT.API_TIMEOUT_MS}">
              </div>
              <div class="config-row">
                <div><span class="config-key">MAX_RETRIES</span></div>
                <input type="number" class="config-input" data-key="RATE_LIMIT.MAX_RETRIES" value="${APP_CONFIG.RATE_LIMIT.MAX_RETRIES}">
              </div>
              <div class="config-row">
                <div><span class="config-key">INTER_REQUEST_DELAY_MS</span></div>
                <input type="number" class="config-input" data-key="RATE_LIMIT.INTER_REQUEST_DELAY_MS" value="${APP_CONFIG.RATE_LIMIT.INTER_REQUEST_DELAY_MS}">
              </div>
            </div>
          </div>
        </section>

        <!-- Adaptive Rate Limiting -->
        <section class="section-block">
          <h2 id="adaptive-rate">⚡ Adaptive Rate Limiting <span class="priority-badge priority-high">높음</span></h2>
          <div class="note">
            <strong>동적 속도 조절:</strong> Rate 사용률에 따라 배치 크기와 딜레이를 자동 조절합니다.<br>
            사용률이 낮으면 빠르게, 높으면 안전하게 처리하여 Rate Limit(250 req/min)을 최대한 활용합니다.
          </div>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">임계값 (Thresholds)</span>
              </div>
              <div class="config-row">
                <div><span class="config-key">AGGRESSIVE_THRESHOLD</span><div class="config-desc">&lt; 이 값이면 최대 속도</div></div>
                <input type="number" step="0.01" class="config-input" data-key="ADAPTIVE_RATE.AGGRESSIVE_THRESHOLD" value="${APP_CONFIG.ADAPTIVE_RATE?.AGGRESSIVE_THRESHOLD || 0.3}">
              </div>
              <div class="config-row">
                <div><span class="config-key">FAST_THRESHOLD</span></div>
                <input type="number" step="0.01" class="config-input" data-key="ADAPTIVE_RATE.FAST_THRESHOLD" value="${APP_CONFIG.ADAPTIVE_RATE?.FAST_THRESHOLD || 0.5}">
              </div>
              <div class="config-row">
                <div><span class="config-key">MODERATE_THRESHOLD</span></div>
                <input type="number" step="0.01" class="config-input" data-key="ADAPTIVE_RATE.MODERATE_THRESHOLD" value="${APP_CONFIG.ADAPTIVE_RATE?.MODERATE_THRESHOLD || 0.7}">
              </div>
              <div class="config-row">
                <div><span class="config-key">CAUTIOUS_THRESHOLD</span><div class="config-desc">&gt; 이 값이면 Critical 모드</div></div>
                <input type="number" step="0.01" class="config-input" data-key="ADAPTIVE_RATE.CAUTIOUS_THRESHOLD" value="${APP_CONFIG.ADAPTIVE_RATE?.CAUTIOUS_THRESHOLD || 0.85}">
              </div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">배치 크기 (Batch Sizes)</span>
              </div>
              <div class="config-row">
                <div><span class="config-key">AGGRESSIVE_BATCH_SIZE</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.AGGRESSIVE_BATCH_SIZE" value="${APP_CONFIG.ADAPTIVE_RATE?.AGGRESSIVE_BATCH_SIZE || 10}">
              </div>
              <div class="config-row">
                <div><span class="config-key">FAST_BATCH_SIZE</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.FAST_BATCH_SIZE" value="${APP_CONFIG.ADAPTIVE_RATE?.FAST_BATCH_SIZE || 8}">
              </div>
              <div class="config-row">
                <div><span class="config-key">MODERATE_BATCH_SIZE</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.MODERATE_BATCH_SIZE" value="${APP_CONFIG.ADAPTIVE_RATE?.MODERATE_BATCH_SIZE || 5}">
              </div>
              <div class="config-row">
                <div><span class="config-key">CAUTIOUS_BATCH_SIZE</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.CAUTIOUS_BATCH_SIZE" value="${APP_CONFIG.ADAPTIVE_RATE?.CAUTIOUS_BATCH_SIZE || 3}">
              </div>
              <div class="config-row">
                <div><span class="config-key">CRITICAL_BATCH_SIZE</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.CRITICAL_BATCH_SIZE" value="${APP_CONFIG.ADAPTIVE_RATE?.CRITICAL_BATCH_SIZE || 2}">
              </div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">딜레이 (Delays in ms)</span>
              </div>
              <div class="config-row">
                <div><span class="config-key">AGGRESSIVE_DELAY_MS</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.AGGRESSIVE_DELAY_MS" value="${APP_CONFIG.ADAPTIVE_RATE?.AGGRESSIVE_DELAY_MS || 50}">
              </div>
              <div class="config-row">
                <div><span class="config-key">FAST_DELAY_MS</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.FAST_DELAY_MS" value="${APP_CONFIG.ADAPTIVE_RATE?.FAST_DELAY_MS || 100}">
              </div>
              <div class="config-row">
                <div><span class="config-key">MODERATE_DELAY_MS</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.MODERATE_DELAY_MS" value="${APP_CONFIG.ADAPTIVE_RATE?.MODERATE_DELAY_MS || 300}">
              </div>
              <div class="config-row">
                <div><span class="config-key">CAUTIOUS_DELAY_MS</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.CAUTIOUS_DELAY_MS" value="${APP_CONFIG.ADAPTIVE_RATE?.CAUTIOUS_DELAY_MS || 500}">
              </div>
              <div class="config-row">
                <div><span class="config-key">CRITICAL_DELAY_MS</span></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.CRITICAL_DELAY_MS" value="${APP_CONFIG.ADAPTIVE_RATE?.CRITICAL_DELAY_MS || 1000}">
              </div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">로깅</span>
              </div>
              <div class="config-row">
                <div><span class="config-key">LOG_INTERVAL</span><div class="config-desc">N번 호출마다 로그 출력</div></div>
                <input type="number" class="config-input" data-key="ADAPTIVE_RATE.LOG_INTERVAL" value="${APP_CONFIG.ADAPTIVE_RATE?.LOG_INTERVAL || 10}">
              </div>
            </div>
          </div>
        </section>

        <!-- DB Query Limits -->
        <section class="section-block">
          <h2 id="db-limits">🗄️ DB 쿼리 Limit <span class="priority-badge priority-medium">중간</span></h2>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row"><div><span class="config-key">SYMBOL_CACHE</span></div><input type="number" class="config-input" data-key="DB_LIMITS.SYMBOL_CACHE" value="${APP_CONFIG.DB_LIMITS.SYMBOL_CACHE}"></div>
              <div class="config-row"><div><span class="config-key">ANALYST_RECORDS</span></div><input type="number" class="config-input" data-key="DB_LIMITS.ANALYST_RECORDS" value="${APP_CONFIG.DB_LIMITS.ANALYST_RECORDS}"></div>
              <div class="config-row"><div><span class="config-key">ANALYST_LOG</span></div><input type="number" class="config-input" data-key="DB_LIMITS.ANALYST_LOG" value="${APP_CONFIG.DB_LIMITS.ANALYST_LOG}"></div>
              <div class="config-row"><div><span class="config-key">TRADES</span></div><input type="number" class="config-input" data-key="DB_LIMITS.TRADES" value="${APP_CONFIG.DB_LIMITS.TRADES}"></div>
              <div class="config-row"><div><span class="config-key">MODEL_SUMMARIES</span></div><input type="number" class="config-input" data-key="DB_LIMITS.MODEL_SUMMARIES" value="${APP_CONFIG.DB_LIMITS.MODEL_SUMMARIES}"></div>
            </div>
          </div>
        </section>

        <!-- Cache Settings -->
        <section class="section-block">
          <h2 id="cache">💾 캐시 설정 <span class="priority-badge priority-low">낮음</span></h2>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row">
                <div><span class="config-key">SYMBOL_CACHE_DAYS</span><div class="config-desc">심볼 캐시 유효 기간 (일)</div></div>
                <input type="number" class="config-input" data-key="CACHE.SYMBOL_CACHE_DAYS" value="${APP_CONFIG.CACHE.SYMBOL_CACHE_DAYS}">
              </div>
            </div>
          </div>
        </section>

        <!-- Symbol Cache Management -->
        <section class="section-block">
          <h2 id="symbol-cache">🔤 심볼 캐시 관리 <span class="priority-badge priority-medium">중간</span></h2>
          <div class="note">
            <strong>심볼 캐시:</strong> 거래 가능한 주식 목록을 저장합니다. 다른 API에서 티커 유효성 검증, 이벤트 필터링 등에 활용됩니다.<br>
            캐시 유효기간(${APP_CONFIG.CACHE.SYMBOL_CACHE_DAYS}일)이 지나면 자동으로 갱신되지만, 필요시 수동으로 갱신할 수 있습니다.
          </div>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">📊 캐시 상태</span>
              </div>
              <div id="symbolCacheStatus" style="padding: 10px 0; color: #666;">
                <em>로딩 중...</em>
              </div>
              <div class="config-row">
                <div><span class="config-key">캐시 조회</span><div class="config-desc">현재 캐시된 심볼 목록 확인</div></div>
                <button class="btn btn-primary" onclick="window.open('/symbolCache?limit=100', '_blank')">📋 심볼 목록</button>
              </div>
              <div class="config-row">
                <div><span class="config-key">통계 조회</span><div class="config-desc">거래소별, 섹터별 분포 확인</div></div>
                <button class="btn btn-primary" onclick="window.open('/symbolCache/stats', '_blank')">📈 통계 보기</button>
              </div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">🔄 캐시 갱신</span>
              </div>
              <div class="config-row">
                <div><span class="config-key">일반 갱신</span><div class="config-desc">유효기간 지났을 때만 갱신</div></div>
                <button class="btn btn-primary" onclick="refreshSymbolCache(false)" id="refreshSymbolCacheBtn">🔄 갱신 확인</button>
              </div>
              <div class="config-row">
                <div><span class="config-key">강제 갱신</span><div class="config-desc">유효기간 무시하고 즉시 갱신</div></div>
                <button class="btn btn-save" onclick="refreshSymbolCache(true)" id="forceRefreshSymbolCacheBtn">⚡ 강제 갱신</button>
              </div>
              <div id="symbolCacheRefreshStatus" style="margin-top: 10px; font-size: 0.85rem; color: #666;"></div>
            </div>
            <div class="config-card">
              <div class="config-card-header">
                <span class="config-card-title">🔍 티커 검색</span>
              </div>
              <div class="config-row">
                <input type="text" id="tickerSearchInput" class="config-input" style="width: 120px; text-align: left;" placeholder="AAPL">
                <button class="btn btn-primary" onclick="searchTicker()">검색</button>
              </div>
              <div id="tickerSearchResult" style="margin-top: 10px; font-size: 0.85rem;"></div>
            </div>
          </div>
        </section>

        <!-- Price Trend -->
        <section class="section-block">
          <h2 id="price-trend">📈 Price Trend (애널리스트 가격 추이) <span class="priority-badge priority-medium">중간</span></h2>
          <div class="note" style="margin-bottom: 16px;">
            <strong>⚠️ 중요:</strong> 이 설정은 <code>/refreshAnalystLog</code> 실행 시 <code>analyst_records</code> 테이블의 <code>price_trend</code> 컬럼에 수집되는 D+N 일수를 결정합니다.<br>
            설정 변경 후 저장하면 다음 refreshAnalystLog 실행 시 새로운 일수가 추가로 수집됩니다. (기존 데이터는 유지됨)<br>
            <strong>Pattern 페이지</strong>에서 이 데이터를 기반으로 애널리스트 목표가 방향별 수익률을 분석합니다.
          </div>
          <div class="config-grid">
            <div class="config-card">
              <div class="config-row">
                <div>
                  <span class="config-key">HORIZONS</span>
                  <div class="config-desc">D+N 추적 일수 (쉼표 구분). 예: 1, 2, 3, 7, 14, 30, 60, 180, 365</div>
                </div>
                <input type="text" class="config-input" style="width: 300px;" data-key="PRICE_TREND.HORIZONS" value="${APP_CONFIG.PRICE_TREND.HORIZONS.join(', ')}">
              </div>
              <div class="config-row">
                <div>
                  <span class="config-key">PRICE_FETCH_WINDOW_DAYS</span>
                  <div class="config-desc">가격 조회 시 날짜 범위 (주말/휴일 대비)</div>
                </div>
                <input type="number" class="config-input" data-key="PRICE_TREND.PRICE_FETCH_WINDOW_DAYS" value="${APP_CONFIG.PRICE_TREND.PRICE_FETCH_WINDOW_DAYS}">
              </div>
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 0.85rem; color: #8b949e;">
            <strong>현재 설정된 일수:</strong> ${APP_CONFIG.PRICE_TREND.HORIZONS.map(h => 'D+' + h).join(', ')}<br>
            <strong>사용처:</strong> analyst_records.price_trend, Pattern 페이지 분석, generateRating API
          </div>
        </section>

        <!-- Table Names -->
        <section class="section-block">
          <h2 id="tables">📋 테이블 이름 <span class="priority-badge priority-low">낮음</span></h2>
          <div class="config-grid">
            <div class="config-card">${tableRowsHtml}</div>
          </div>
        </section>

        <!-- API Services Section -->
        <section class="section-block">
          <h2 id="api-services">🔗 API 서비스 매핑 (ApiList.json)</h2>
          <div class="note">
            <strong>fieldMap:</strong> 코드 변수명 ↔ API 응답 키 매핑. 수정 후 저장하면 ApiList.json에 반영됩니다.
          </div>
          <div class="api-services-list">${apiServicesHtml}</div>
        </section>

        <!-- Valuation Methods Section -->
        <section class="section-block">
          <h2>📊 밸류에이션 계산 (evMethod.json)</h2>
          ${metricsHtml}
        </section>

        <!-- Action Bar (Bottom) -->
        <div class="action-bar">
          <button class="btn btn-save" onclick="saveAllConfig()">💾 설정 저장</button>
          <button class="btn btn-reset" onclick="resetConfig()">↺ 새로고침</button>
          <button class="btn btn-primary" onclick="exportConfig()">📤 내보내기</button>
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    // Store original data
    var originalApiList = ${apiListJson};
    var originalEvMethod = ${evMethodJson};
    var isModified = false;

    function markModified() {
      isModified = true;
      document.getElementById('saveIndicator').className = 'save-indicator modified';
    }

    // Add change listeners
    document.querySelectorAll('input, select').forEach(function(el) {
      el.addEventListener('change', markModified);
      el.addEventListener('input', markModified);
    });

    function showToast(message, type) {
      var toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast show ' + (type || 'success');
      setTimeout(function() { toast.className = 'toast'; }, 4000);
    }

    function collectAppConfig() {
      var config = {};
      document.querySelectorAll('.config-input[data-key]').forEach(function(input) {
        var key = input.dataset.key;
        var value = input.value;
        
        if (input.type === 'number') {
          value = parseInt(value, 10);
        } else if (input.tagName === 'SELECT') {
          value = value === 'true';
        } else if (key === 'PRICE_TREND.HORIZONS') {
          value = value.split(',').map(function(v) { return parseInt(v.trim(), 10); });
        }
        
        var keys = key.split('.');
        var obj = config;
        for (var i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
      });
      return config;
    }

    function collectApiList() {
      var apiList = JSON.parse(JSON.stringify(originalApiList));
      
      document.querySelectorAll('.api-field').forEach(function(input) {
        var path = input.dataset.path;
        if (!path) return;
        setNestedValue(apiList, path, input.value);
      });
      
      return apiList;
    }

    function collectEvMethod() {
      var evMethod = JSON.parse(JSON.stringify(originalEvMethod));
      
      document.querySelectorAll('.ev-field').forEach(function(input) {
        var path = input.dataset.path;
        if (!path) return;
        setNestedValue(evMethod, path, input.value);
      });
      
      return evMethod;
    }

    function setNestedValue(obj, path, value) {
      var keys = path.split('.');
      var current = obj;
      for (var i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }

    function saveAllConfig() {
      var appConfig = collectAppConfig();
      var apiList = collectApiList();
      var evMethod = collectEvMethod();
      
      // Get API key from URL
      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('api_key');

      showToast('저장 중...', 'success');

      fetch('/control/save?api_key=' + encodeURIComponent(apiKey || ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appConfig: appConfig, apiList: apiList, evMethod: evMethod })
      })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.error) {
          showToast('저장 실패: ' + data.error, 'error');
        } else {
          isModified = false;
          document.getElementById('saveIndicator').className = 'save-indicator saved';
          showToast('✅ ' + data.message + ' - 서버 재시작 필요', 'success');
        }
      })
      .catch(function(error) {
        showToast('저장 실패: ' + error.message, 'error');
      });
    }

    function resetConfig() {
      if (isModified && !confirm('저장하지 않은 변경사항이 있습니다. 새로고침하시겠습니까?')) {
        return;
      }
      location.reload();
    }

    function exportConfig() {
      var data = {
        appConfig: collectAppConfig(),
        apiList: collectApiList(),
        evMethod: collectEvMethod()
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'config-export-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('설정이 내보내기되었습니다.', 'success');
    }

    function updateHolidays() {
      var btn = document.getElementById('updateHolidaysBtn');
      var status = document.getElementById('holidaysStatus');
      
      // Get API key from URL
      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('api_key');
      
      btn.disabled = true;
      btn.textContent = '⏳ 업데이트 중...';
      status.textContent = 'FMP API에서 휴장일 정보를 가져오는 중...';
      
      fetch('/control/updateHolidays?api_key=' + encodeURIComponent(apiKey || ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        btn.disabled = false;
        btn.textContent = '🔄 휴장일 업데이트';
        
        if (data.error) {
          status.innerHTML = '❌ 업데이트 실패: ' + data.error;
          status.style.color = 'var(--error)';
        } else {
          status.innerHTML = '✅ ' + data.count + '개의 휴장일 정보가 업데이트되었습니다. (' + new Date().toLocaleString() + ')';
          status.style.color = 'var(--success)';
          showToast('휴장일 정보가 업데이트되었습니다', 'success');
        }
      })
      .catch(function(error) {
        btn.disabled = false;
        btn.textContent = '🔄 휴장일 업데이트';
        status.innerHTML = '❌ 오류: ' + error.message;
        status.style.color = 'var(--error)';
      });
    }

    // Symbol Cache Functions
    function loadSymbolCacheStatus() {
      var statusDiv = document.getElementById('symbolCacheStatus');
      
      fetch('/symbolCache/stats')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data.error) {
            statusDiv.innerHTML = '<span style="color: #c62828;">❌ 캐시 비어있음 - 갱신이 필요합니다</span>';
          } else {
            var stats = data.statistics;
            var exchanges = Object.entries(stats.byExchange).slice(0, 3).map(function(e) { return e[0] + ': ' + e[1]; }).join(', ');
            statusDiv.innerHTML = 
              '<div style="margin-bottom: 8px;"><strong>총 심볼:</strong> ' + stats.totalSymbols.toLocaleString() + '개</div>' +
              '<div style="margin-bottom: 8px;"><strong>거래소:</strong> ' + exchanges + '</div>' +
              '<div><strong>섹터:</strong> ' + Object.keys(stats.bySector).length + '개</div>';
          }
        })
        .catch(function(error) {
          statusDiv.innerHTML = '<span style="color: #c62828;">❌ 상태 조회 실패: ' + error.message + '</span>';
        });
    }

    function refreshSymbolCache(force) {
      var btn = force ? document.getElementById('forceRefreshSymbolCacheBtn') : document.getElementById('refreshSymbolCacheBtn');
      var status = document.getElementById('symbolCacheRefreshStatus');
      var originalText = btn.textContent;
      
      // Get API key from URL
      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('api_key');
      
      btn.disabled = true;
      btn.textContent = '⏳ 갱신 중...';
      status.textContent = 'FMP API에서 심볼 목록을 가져오는 중...';
      status.style.color = '#666';
      
      var url = '/refreshSymbolCache';
      var params = [];
      if (force) params.push('force=true');
      if (apiKey) params.push('api_key=' + encodeURIComponent(apiKey));
      if (params.length > 0) url += '?' + params.join('&');
      
      fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
          btn.disabled = false;
          btn.textContent = originalText;
          
          if (data.error) {
            status.innerHTML = '❌ 갱신 실패: ' + data.error;
            status.style.color = '#c62828';
          } else if (data.meta.action === 'skipped') {
            status.innerHTML = '⏭️ 캐시가 아직 유효합니다 (' + data.meta.cacheAge + ' 경과)<br>' +
              '<small>심볼 수: ' + data.meta.symbolCount.toLocaleString() + '개</small>';
            status.style.color = '#f57f17';
            showToast('캐시가 아직 유효합니다', 'success');
          } else {
            status.innerHTML = '✅ ' + data.meta.symbolCount.toLocaleString() + '개 심볼 갱신 완료 (' + data.meta.duration + ')';
            status.style.color = '#2e7d32';
            showToast('심볼 캐시가 갱신되었습니다', 'success');
            loadSymbolCacheStatus(); // Refresh status display
          }
        })
        .catch(function(error) {
          btn.disabled = false;
          btn.textContent = originalText;
          status.innerHTML = '❌ 오류: ' + error.message;
          status.style.color = '#c62828';
        });
    }

    function searchTicker() {
      var input = document.getElementById('tickerSearchInput');
      var result = document.getElementById('tickerSearchResult');
      var ticker = input.value.trim().toUpperCase();
      
      if (!ticker) {
        result.innerHTML = '<span style="color: #f57f17;">티커를 입력하세요</span>';
        return;
      }
      
      result.innerHTML = '<em>검색 중...</em>';
      
      fetch('/symbolCache/check/' + ticker)
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data.found) {
            var s = data.symbol;
            result.innerHTML = 
              '<div style="color: #2e7d32; margin-bottom: 8px;">✅ <strong>' + s.symbol + '</strong> 존재</div>' +
              '<div style="font-size: 0.8rem;">' +
                '<div>' + (s.name || '-') + '</div>' +
                '<div>거래소: ' + (s.exchange || '-') + '</div>' +
                '<div>섹터: ' + (s.sector || '-') + '</div>' +
              '</div>';
          } else {
            result.innerHTML = '<span style="color: #c62828;">❌ <strong>' + ticker + '</strong> 캐시에 없음</span>';
          }
        })
        .catch(function(error) {
          result.innerHTML = '<span style="color: #c62828;">❌ 검색 실패: ' + error.message + '</span>';
        });
    }

    // ===== Environment Variables Functions =====
    
    // Store for tracking env var changes
    var envVarsToSave = {};
    
    function addNewEnvVar() {
      var keyInput = document.getElementById('newEnvKey');
      var valueInput = document.getElementById('newEnvValue');
      
      if (!keyInput || !valueInput) {
        showToast('입력 필드를 찾을 수 없습니다', 'error');
        return;
      }
      
      var key = keyInput.value.trim().toUpperCase();
      var value = valueInput.value.trim();
      
      if (!key) {
        showToast('키를 입력하세요', 'error');
        return;
      }
      if (!value) {
        showToast('값을 입력하세요', 'error');
        return;
      }
      
      // Add to tracking
      envVarsToSave[key] = value;
      
      // Add to UI
      var container = document.getElementById('envVarsContainer');
      var isSensitive = /KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL/i.test(key);
      var inputType = isSensitive ? 'password' : 'text';
      var escapedKey = key.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      
      var newRow = document.createElement('div');
      newRow.className = 'env-var-row';
      newRow.setAttribute('data-env-key', escapedKey);
      newRow.innerHTML = 
        '<div class="env-var-key">' + escapedKey + '</div>' +
        '<div class="env-var-value">' +
          '<input type="' + inputType + '" class="config-input env-input" ' +
            'data-env-key="' + escapedKey + '" value="' + value.replace(/"/g, '&quot;') + '">' +
          (isSensitive ? '<button class="btn-icon" data-action="reveal" data-env-key="' + escapedKey + '" title="값 복사">👁️</button>' : '') +
          '<button class="btn-icon btn-delete" data-action="delete" data-env-key="' + escapedKey + '" title="삭제">🗑️</button>' +
        '</div>';
      
      // Check if container has "no env vars" message
      var noVarsMsg = container.querySelector('p');
      if (noVarsMsg) {
        container.innerHTML = '<div class="env-vars-list"></div>';
      }
      
      var list = container.querySelector('.env-vars-list');
      if (!list) {
        list = document.createElement('div');
        list.className = 'env-vars-list';
        container.appendChild(list);
      }
      list.appendChild(newRow);
      
      // Clear inputs
      keyInput.value = '';
      valueInput.value = '';
      
      showToast('환경변수가 추가되었습니다. 저장 버튼을 눌러 저장하세요.', 'success');
      markModified();
    }
    window.addNewEnvVar = addNewEnvVar;
    
    function deleteEnvVar(key) {
      if (!confirm('환경변수 "' + key + '"를 삭제하시겠습니까?')) {
        return;
      }
      
      // Remove from UI
      var row = document.querySelector('.env-var-row[data-env-key="' + key + '"]');
      if (row) {
        row.remove();
      }
      
      // Mark as deleted (empty string)
      envVarsToSave[key] = '';
      
      showToast('환경변수가 삭제되었습니다. 저장 버튼을 눌러 저장하세요.', 'success');
      markModified();
    }
    window.deleteEnvVar = deleteEnvVar;
    
    function revealEnvVar(key) {
      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('api_key');
      
      fetch('/control/getEnvVar?key=' + encodeURIComponent(key) + '&api_key=' + encodeURIComponent(apiKey))
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data.error) {
            showToast('값 조회 실패: ' + data.error, 'error');
          } else {
            // Copy to clipboard
            navigator.clipboard.writeText(data.value).then(function() {
              showToast('✅ 값이 클립보드에 복사되었습니다 (10초간 유효)', 'success');
            }).catch(function() {
              // Fallback for older browsers
              var textarea = document.createElement('textarea');
              textarea.value = data.value;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              showToast('✅ 값이 클립보드에 복사되었습니다', 'success');
            });
          }
        })
        .catch(function(error) {
          showToast('값 조회 실패: ' + error.message, 'error');
        });
    }
    window.revealEnvVar = revealEnvVar;
    
    function saveEnvVars() {
      var status = document.getElementById('envSaveStatus');
      status.textContent = '저장 중...';
      status.style.color = '#666';
      
      // Collect all env vars from inputs
      var envVars = {};
      document.querySelectorAll('.env-input[data-env-key]').forEach(function(input) {
        var key = input.getAttribute('data-env-key');
        var value = input.value.trim();
        if (value) {
          envVars[key] = value;
        }
      });
      
      // Merge with tracked changes (for deleted items)
      for (var key in envVarsToSave) {
        if (envVarsToSave[key] === '') {
          delete envVars[key]; // Remove deleted items
        }
      }
      
      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('api_key');
      
      fetch('/control/saveEnvVars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envVars: envVars,
          api_key: apiKey
        })
      })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.error) {
          status.innerHTML = '❌ 저장 실패: ' + data.error;
          status.style.color = '#c62828';
          showToast('환경변수 저장 실패', 'error');
        } else {
          status.innerHTML = '✅ ' + data.message;
          status.style.color = '#2e7d32';
          showToast('환경변수가 저장되었습니다. 서버를 재시작하세요.', 'success');
          envVarsToSave = {}; // Reset tracking
        }
      })
      .catch(function(error) {
        status.innerHTML = '❌ 오류: ' + error.message;
        status.style.color = '#c62828';
        showToast('환경변수 저장 실패', 'error');
      });
    }
    window.saveEnvVars = saveEnvVars;
    
    // Event delegation for env var buttons
    document.addEventListener('click', function(e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      
      var action = target.getAttribute('data-action');
      var key = target.getAttribute('data-env-key');
      
      if (action === 'reveal' && key) {
        revealEnvVar(key);
      } else if (action === 'delete' && key) {
        deleteEnvVar(key);
      }
    });

    // Load symbol cache status on page load
    document.addEventListener('DOMContentLoaded', function() {
      loadSymbolCacheStatus();
    });

    // Handle Enter key in ticker search
    var tickerSearchInput = document.getElementById('tickerSearchInput');
    if (tickerSearchInput) {
      tickerSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchTicker();
        }
      });
    }

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', function(e) {
      if (isModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
