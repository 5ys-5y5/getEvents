/**
 * GET /proceeding - Unified Proceeding Page
 * Combines Price Tracker and Analyst operations with real-time status monitoring
 *
 * Authentication: Requires session-based login (handled by requireAuth middleware)
 */

export default function proceedingPage(req, res) {
  // Authentication is handled by requireAuth middleware in index.js
  
  const apiKey = req.query.api_key || '';
  
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proceeding - 작업 관리</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      height: 100%;
    }

    :root {
      /* Light theme matching apiGuide */
      --bg-dark: #999999;        /* Page background */
      --bg-card: #ffffff;        /* Content boxes */
      --bg-input: #fafafa;       /* Input fields */
      --border: #dddddd;         /* Borders */
      --border-focus: #0066cc;   /* Focus state */
      --text: #111111;           /* Main text */
      --text-muted: #666666;     /* Secondary text */
      --text-bright: #111111;    /* Bright text */
      --accent: #0066cc;         /* Accent color */
      --accent-hover: #0052a3;   /* Hover state */
      --success: #2e7d32;        /* Success */
      --error: #c62828;          /* Error */
      --warning: #f57f17;        /* Warning */
    }

    body {
      font-family: 'Noto Sans KR', 'Noto Sans', sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.7;
    }

    /* Layout with sidebar */
    .page-wrapper {
      display: flex;
      min-height: 100vh;
    }

    .toc-sidebar {
      width: 280px;
      background: #2b2b2b;
      color: #e0e0e0;
      position: fixed;
      top: 60px;
      left: 0;
      height: calc(100vh - 60px);
      overflow-y: auto;
      padding: 24px 16px;
      border-right: 1px solid #1a1a1a;
      z-index: 1000;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .toc-sidebar::-webkit-scrollbar {
      display: none;
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

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-item {
      margin-bottom: 4px;
    }

    .toc-link {
      display: block;
      padding: 8px 12px;
      color: #c0c0c0;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .toc-link:hover {
      background: #3a3a3a;
      color: #ffffff;
    }

    .toc-link.active {
      background: #0066cc;
      color: #ffffff;
    }

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
      animation: spin-widget 1s linear infinite;
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

    @keyframes spin-widget {
      to { transform: rotate(360deg); }
    }

    .content-wrapper {
      margin-left: 280px;
      flex: 1;
      background: #999999;
      padding: 32px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #f3f3f3;
      padding: 32px 32px 40px;
      border-radius: 6px;
      border: 1px solid #dedede;
    }

    .toc-toggle {
      display: none;
    }

    @media (max-width: 1024px) {
      .toc-sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s;
      }

      .toc-sidebar.open {
        transform: translateX(0);
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
      }

      .content-wrapper {
        margin-left: 0;
      }

      .toc-toggle {
        display: block;
      }
    }
    
    /* Header */
    header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    
    h1 {
      font-size: 1.6rem;
      font-weight: 600;
      color: var(--text-bright);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 4px;
    }
    
    /* ==================== STATUS PANEL (상단 고정 상태창 - 항상 표시) ==================== */
    .status-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    .status-panel.running .status-panel-header {
      background: linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(63, 185, 80, 0.1));
    }
    
    .status-panel.idle .status-panel-header {
      background: var(--bg-input);
    }
    
    .status-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(88, 166, 255, 0.1), rgba(63, 185, 80, 0.05));
      border-bottom: 1px solid var(--border);
    }
    
    .status-panel-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: var(--text-bright);
    }
    
    .status-panel-title .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .status-panel-actions {
      display: flex;
      gap: 8px;
    }
    
    .status-panel-body {
      padding: 16px;
    }
    
    /* Progress Section */
    .status-progress {
      margin-bottom: 12px;
    }
    
    .status-progress-bar {
      height: 8px;
      background: var(--bg-input);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .status-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--success));
      transition: width 0.3s ease;
      width: 0%;
    }
    
    .status-progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    /* Stats Grid */
    .status-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--bg-input);
      border-radius: 8px;
    }
    
    .status-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
    }
    
    .status-stat.skip { color: #8b949e; }
    .status-stat.partial { color: var(--warning); }
    .status-stat.new { color: var(--success); }
    .status-stat.invalid { color: var(--error); }
    .status-stat.success { color: var(--success); }
    .status-stat.error { color: var(--error); }
    .status-stat.info { color: var(--accent); }
    
    /* Check Summary in Status Panel */
    .status-check-summary {
      display: none;
      padding: 12px;
      background: var(--bg-input);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    
    .status-check-summary.show { display: block; }
    
    .status-check-summary h4 {
      margin-bottom: 10px;
      font-size: 0.9rem;
      color: var(--text-bright);
    }
    
    .check-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .check-summary-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      background: var(--bg-card);
      border-radius: 6px;
      border-left: 3px solid var(--border);
    }
    
    .check-summary-item.skip { border-left-color: #8b949e; }
    .check-summary-item.partial { border-left-color: var(--warning); }
    .check-summary-item.new { border-left-color: var(--success); }
    .check-summary-item.invalid { border-left-color: var(--error); }
    
    .check-summary-item .icon { font-size: 1.2rem; }
    .check-summary-item .count { font-size: 1.4rem; font-weight: bold; }
    .check-summary-item .label { font-size: 0.7rem; color: var(--text-muted); }
    
    .api-estimate-info {
      text-align: center;
      padding: 8px;
      background: rgba(88, 166, 255, 0.1);
      border-radius: 6px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .api-estimate-info strong {
      color: var(--accent);
      font-size: 1rem;
    }
    
    /* Action Buttons in Status Panel */
    .status-action-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 12px;
    }
    
    /* Log Console */
    .status-log {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 6px;
      max-height: 150px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
    }
    
    .status-log-entry {
      padding: 4px 10px;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 8px;
    }
    
    .status-log-entry:last-child { border-bottom: none; }
    
    .status-log-entry .time {
      color: var(--text-muted);
      flex-shrink: 0;
    }
    
    .status-log-entry .msg { flex: 1; }
    .status-log-entry.success .msg { color: var(--success); }
    .status-log-entry.error .msg { color: var(--error); }
    .status-log-entry.warning .msg { color: var(--warning); }
    .status-log-entry.info .msg { color: var(--accent); }
    
    /* Main Tabs */
    .main-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    
    .main-tab {
      padding: 10px 20px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .main-tab:hover {
      background: var(--bg-card);
      color: var(--text);
    }
    
    .main-tab.active {
      background: rgba(88, 166, 255, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .main-tab .badge {
      background: var(--accent);
      color: var(--bg-dark);
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 8px;
    }
    
    /* Tab Content */
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 24px;
    }
    
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-bright);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .card-title .badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;
      background: var(--accent);
      color: var(--bg-dark);
    }
    
    /* Grid */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    @media (max-width: 900px) {
      .main-grid { grid-template-columns: 1fr; }
      .check-summary-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    /* File Upload */
    .file-drop-zone {
      border: 2px dashed var(--border);
      border-radius: 6px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 16px;
    }
    
    .file-drop-zone:hover,
    .file-drop-zone.dragover {
      border-color: var(--accent);
      background: rgba(88, 166, 255, 0.05);
    }
    
    .file-drop-zone .icon { font-size: 2.5rem; margin-bottom: 12px; }
    .file-drop-zone p { color: var(--text-muted); margin-bottom: 8px; }
    .file-drop-zone .formats { font-size: 0.8rem; color: var(--text-muted); }
    .file-drop-zone .formats code {
      background: var(--bg-input);
      padding: 2px 6px;
      border-radius: 4px;
      margin: 0 2px;
    }
    
    .file-input { display: none; }
    
    .file-info {
      display: none;
      padding: 12px;
      background: var(--bg-input);
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }
    
    .file-info.show { display: flex; align-items: center; gap: 12px; }
    .file-info .name { flex: 1; color: var(--accent); font-family: 'JetBrains Mono', monospace; }
    .file-info .size { color: var(--text-muted); }
    .file-info .remove {
      background: none;
      border: none;
      color: var(--error);
      cursor: pointer;
      font-size: 1.2rem;
    }
    
    /* Text Input */
    .text-input {
      width: 100%;
      height: 200px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      resize: vertical;
      line-height: 1.5;
    }
    
    .text-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    
    .text-input::placeholder { color: var(--text-muted); }
    
    .input-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 8px;
    }
    
    .input-hint code {
      background: var(--bg-input);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    /* Preview Table */
    .preview-section { margin-top: 24px; }
    
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .preview-count { font-size: 0.85rem; color: var(--text-muted); }
    .preview-count strong { color: var(--accent); }
    
    .preview-table-wrapper {
      max-height: 300px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    
    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    
    .preview-table th,
    .preview-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .preview-table th {
      background: var(--bg-input);
      color: var(--text-muted);
      font-weight: 500;
      position: sticky;
      top: 0;
    }
    
    .preview-table tr:hover td { background: rgba(88, 166, 255, 0.05); }
    .preview-table .position-long { color: var(--success); }
    .preview-table .position-short { color: var(--error); }
    .preview-table .ticker { font-family: 'JetBrains Mono', monospace; font-weight: 500; }
    .preview-table .model { color: var(--accent); }
    .preview-empty { padding: 40px; text-align: center; color: var(--text-muted); }
    
    /* Buttons */
    .btn-group { display: flex; gap: 12px; margin-top: 20px; }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-primary {
      background: var(--accent);
      color: var(--bg-dark);
    }
    
    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-secondary {
      background: var(--bg-input);
      color: var(--text);
      border: 1px solid var(--border);
    }
    
    .btn-secondary:hover { background: var(--border); }
    
    .btn-success {
      background: var(--success);
      color: white;
    }
    
    .btn-success:hover { opacity: 0.9; }
    
    .btn-danger {
      background: var(--error);
      color: white;
    }
    
    .btn-danger:hover { opacity: 0.9; }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
    }
    
    /* Results */
    .results-section { margin-top: 24px; display: none; }
    .results-section.show { display: block; }
    
    .results-summary { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    
    .result-stat {
      padding: 12px 20px;
      background: var(--bg-input);
      border-radius: 6px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    
    .result-stat:hover { background: rgba(88, 166, 255, 0.1); }
    .result-stat.active { border-color: var(--accent); }
    .result-stat .value { font-size: 1.5rem; font-weight: 600; }
    .result-stat .label { font-size: 0.8rem; color: var(--text-muted); }
    .result-stat.success .value { color: var(--success); }
    .result-stat.updated .value { color: var(--warning); }
    .result-stat.error .value { color: var(--error); }
    .result-stat.skipped .value { color: #6b7280; }
    .result-stat.total .value { color: var(--accent); }
    
    .filter-active-hint { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
    
    .results-details {
      max-height: 500px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    
    .result-item {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .result-item:hover { background: rgba(88, 166, 255, 0.05); }
    .result-item-header { display: flex; align-items: center; gap: 12px; }
    .result-item .status-icon { font-size: 1.2rem; }
    .result-item.success .status-icon { color: var(--success); }
    .result-item.updated .status-icon { color: var(--warning); }
    .result-item.error .status-icon { color: var(--error); }
    .result-item.skipped .status-icon { color: #6b7280; }
    .result-item .trade-info { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
    .result-item .expand-icon { font-size: 0.9rem; color: var(--text-muted); transition: transform 0.2s; }
    .result-item.expanded .expand-icon { transform: rotate(180deg); }
    
    .result-item-details {
      display: none;
      margin-top: 12px;
      padding: 12px;
      background: var(--bg-input);
      border-radius: 6px;
      font-size: 0.85rem;
    }
    
    .result-item.expanded .result-item-details { display: block; }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid var(--border);
    }
    
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: var(--text-muted); }
    .detail-value { font-family: 'JetBrains Mono', monospace; }
    .detail-value.success { color: var(--success); }
    .detail-value.error { color: var(--error); }
    .detail-value.warning { color: var(--warning); }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.9rem;
      z-index: 1001;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s;
    }
    
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--error); }
    
    /* Format Guide */
    .format-guide { margin-top: 24px; }
    .format-guide h3 { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px; }
    
    .format-example {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      overflow-x: auto;
    }
    
    .format-example .comment { color: var(--text-muted); }
    .format-example .highlight { color: var(--accent); }
    
    /* Analyst Section */
    .analyst-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    
    .analyst-action-card {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      transition: all 0.2s;
    }
    
    .analyst-action-card:hover {
      border-color: var(--accent);
      background: rgba(88, 166, 255, 0.05);
    }
    
    .analyst-action-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .analyst-action-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    
    .analyst-action-icon.price-target { background: rgba(88, 166, 255, 0.15); }
    .analyst-action-icon.frame { background: rgba(210, 153, 34, 0.15); }
    .analyst-action-icon.quote { background: rgba(63, 185, 80, 0.15); }
    .analyst-action-icon.rating { background: rgba(136, 87, 215, 0.15); }
    
    .analyst-action-title { font-weight: 600; color: var(--text-bright); }
    .analyst-action-desc { font-size: 0.85rem; color: var(--text-muted); }
    
    .analyst-action-options { margin: 12px 0; display: flex; flex-wrap: wrap; gap: 8px; }
    
    .option-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .option-checkbox input { accent-color: var(--accent); }
    
    .analyst-action-btn { width: 100%; margin-top: 12px; }
    
    /* Analyst Form Styles */
    .analyst-form-group {
      margin-bottom: 16px;
    }
    
    .analyst-form-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-bright);
      margin-bottom: 8px;
    }
    
    .analyst-form-label .label-icon {
      font-size: 1rem;
    }
    
    .analyst-form-label .label-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 400;
    }
    
    .analyst-form-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    
    .analyst-form-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    .analyst-form-input::placeholder {
      color: var(--text-muted);
    }
    
    .analyst-checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    
    .analyst-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .analyst-checkbox:hover {
      border-color: var(--accent);
      background: rgba(88, 166, 255, 0.05);
    }
    
    .analyst-checkbox:has(input:checked) {
      border-color: var(--accent);
      background: rgba(88, 166, 255, 0.1);
    }
    
    .analyst-checkbox input {
      margin-top: 2px;
      accent-color: var(--accent);
    }
    
    .analyst-checkbox .checkbox-icon {
      font-size: 1.2rem;
    }
    
    .analyst-checkbox .checkbox-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .analyst-checkbox .checkbox-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-bright);
    }
    
    .analyst-checkbox .checkbox-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .request-preview {
      padding: 10px 12px;
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: var(--accent);
      word-break: break-all;
      overflow-x: auto;
    }
    
    .analyst-info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: rgba(88, 166, 255, 0.1);
      border: 1px solid rgba(88, 166, 255, 0.2);
      border-radius: 8px;
    }
    
    .analyst-info-box .info-icon {
      font-size: 1.5rem;
    }
    
    .analyst-info-box .info-title {
      font-weight: 600;
      color: var(--text-bright);
      margin-bottom: 4px;
    }
    
    .analyst-info-box .info-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .quick-actions {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    
    .quick-actions h4 {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    
    .quick-action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
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
      z-index: 2000;
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
  </style>
</head>
<body>
  <!-- Top Navigation -->
  <nav class="top-nav">
    <a href="/" class="top-nav-brand">📊 Financial API</a>
    <button class="top-nav-toggle" onclick="document.querySelector('.top-nav-links').classList.toggle('open')">☰</button>
    <div class="top-nav-links">
      <a href="/apiguide" class="top-nav-link">API Guide</a>
      <a href="/control?api_key=${apiKey}" class="top-nav-link">Control</a>
      <a href="/tracker?api_key=${apiKey}" class="top-nav-link">Tracker</a>
      <a href="/proceeding?api_key=${apiKey}" class="top-nav-link active">Proceeding</a>
      <a href="/dashboard?api_key=${apiKey}" class="top-nav-link">Dashboard</a>
      <a href="/pattern?api_key=${apiKey}" class="top-nav-link">Pattern</a>
      <a href="/" class="top-nav-link" style="margin-left: auto;">🏠 Home</a>
    </div>
  </nav>

  <!-- Mobile TOC Toggle Button -->
  <button class="toc-toggle" onclick="document.querySelector('.toc-sidebar').classList.toggle('open')" style="display: none; position: fixed; top: 76px; left: 16px; z-index: 1001; background: #2b2b2b; color: #fff; border: none; padding: 10px 14px; border-radius: 4px; cursor: pointer; font-size: 1.2rem;">☰</button>

  <div class="page-wrapper">
    <!-- Sidebar -->
    <aside class="toc-sidebar">
      <div class="toc-title">Proceeding</div>
      <ul class="toc-list">
        <li class="toc-item"><a href="#status" class="toc-link">⚡ Status Monitor</a></li>
        <li class="toc-item"><a href="#tracker" class="toc-link">📊 Price Tracker</a></li>
        <li class="toc-item"><a href="#analyst" class="toc-link">⭐ Analyst Operations</a></li>
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
    </aside>

    <!-- Main Content -->
    <div class="content-wrapper">
      <div class="container">
        <header>
          <h1>⚡ Proceeding</h1>
          <p class="subtitle">작업 관리 및 실행 모니터링</p>
        </header>

        <!-- 기능 안내 박스 -->
        <div style="background: linear-gradient(135deg, rgba(0, 102, 204, 0.1), rgba(46, 125, 50, 0.1)); border: 1px solid #0066cc; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: #0066cc;">📚 Proceeding 페이지 기능 안내</h4>
          <p style="font-size: 0.9rem; line-height: 1.7; margin-bottom: 16px; color: #111111;">
            <strong>Proceeding</strong>은 등록된 거래 데이터의 price_trend를 일괄 업데이트하거나 애널리스트 데이터를 처리하는 작업 관리 페이지입니다.
          </p>
          
          <div style="padding-left: 16px;">
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📊 Price Tracker 작업</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>자동 조회</strong>: 버튼 클릭 시 price_trend가 비어있거나 업데이트가 필요한 거래 자동 검색</li>
              <li><strong>미리보기 테이블</strong>: 처리될 거래 목록과 현재 상태 확인 (Position, Model, Ticker, Date, 현재 D+14 여부)</li>
              <li><strong>일괄 전송</strong>: 선택된 거래들의 D+1 ~ D+14 가격 데이터를 FMP API로부터 가져와서 price_trend 필드 업데이트</li>
              <li><strong>실시간 진행률</strong>: 상단 Status Panel에서 현재 진행 상황, 성공/실패 건수, 예상 완료 시간 표시</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">⭐ Analyst Operations 작업</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>자동 조회</strong>: price_trend가 비어있는 애널리스트 레코드 검색</li>
              <li><strong>발표일 기준</strong>: published_date를 기준으로 D+1 ~ D+365 가격 추적</li>
              <li><strong>대량 처리</strong>: 수천 건의 애널리스트 데이터를 배치로 처리</li>
              <li><strong>진행 모니터링</strong>: 처리 속도, ETA, 성공/스킵/업데이트 건수 실시간 확인</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📈 Status Panel (상단 고정)</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>대기/실행 상태</strong>: 현재 작업 상태 및 진행률 바 표시</li>
              <li><strong>진행/취소 버튼</strong>: 작업 시작 및 중단 제어</li>
              <li><strong>통계 카운터</strong>: ⏭️ 스킵, 🔄 업데이트, 🆕 신규, ❌ 무효 건수</li>
              <li><strong>실시간 로그</strong>: 각 거래의 처리 결과 메시지 스트리밍</li>
              <li><strong>예상 완료 시간 (ETA)</strong>: 현재 속도 기반 작업 완료 예상 시간</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">🔄 처리 결과 유형</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>🆕 신규 (New)</strong>: price_trend가 완전히 비어있어서 새로 생성</li>
              <li><strong>🔄 업데이트 (Partial)</strong>: 일부 날짜 데이터가 추가/수정됨</li>
              <li><strong>⏭️ 스킵 (Skip)</strong>: 이미 모든 데이터가 완전하여 건너뜀</li>
              <li><strong>❌ 무효 (Invalid)</strong>: 티커를 찾을 수 없거나 API 오류로 실패</li>
            </ul>
            
            <p style="font-size: 0.85rem; color: #666666; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
              <strong>💡 사용 시나리오</strong>:<br>
              1. <strong>Tracker</strong>에서 거래 등록 → 2. <strong>Proceeding</strong>에서 price_trend 일괄 생성 → 3. <strong>Dashboard</strong>에서 성과 분석<br><br>
              <strong>⚠️ Rate Limit 주의</strong>: FMP API 호출 제한을 피하기 위해 자동으로 요청 속도를 조절합니다. 대량 처리 시 시간이 소요될 수 있습니다.
            </p>
          </div>
        </div>
    
    <!-- ==================== STATUS PANEL (상단 고정 상태창 - 항상 표시) ==================== -->
    <div class="status-panel idle" id="statusPanel">
      <div class="status-panel-header">
        <div class="status-panel-title">
          <div class="spinner" id="statusSpinner" style="display:none;"></div>
          <span id="statusTitle">⏸️ 대기 중 - 작업을 시작하세요</span>
        </div>
        <div class="status-panel-actions">
          <button class="btn btn-success btn-sm" id="statusProceedBtn" style="display:none;">▶️ 진행</button>
          <button class="btn btn-danger btn-sm" id="statusCancelBtn" style="display:none;">⏹️ 취소</button>
        </div>
      </div>
      
      <div class="status-panel-body">
        <!-- Progress Bar -->
        <div class="status-progress">
          <div class="status-progress-bar">
            <div class="status-progress-fill" id="statusProgressFill"></div>
          </div>
          <div class="status-progress-info">
            <span id="statusProgressText">0/0 (0%)</span>
            <span id="statusEta">예상 완료: 계산 중...</span>
          </div>
        </div>
        
        <!-- Live Stats -->
        <div class="status-stats" id="statusStats">
          <span class="status-stat skip">⏭️ 스킵: <strong id="statSkip">0</strong></span>
          <span class="status-stat partial">🔄 업데이트: <strong id="statPartial">0</strong></span>
          <span class="status-stat new">🆕 신규: <strong id="statNew">0</strong></span>
          <span class="status-stat invalid">❌ 무효: <strong id="statInvalid">0</strong></span>
        </div>
        
        <!-- Check Summary (체크 완료 후 표시) -->
        <div class="status-check-summary" id="statusCheckSummary">
          <h4>📋 DB 중복 확인 완료</h4>
          <div class="check-summary-grid">
            <div class="check-summary-item skip"><span class="icon">⏭️</span><span class="count" id="summarySkip">0</span><span class="label">완료 (스킵)</span></div>
            <div class="check-summary-item partial"><span class="icon">🔄</span><span class="count" id="summaryPartial">0</span><span class="label">업데이트 필요</span></div>
            <div class="check-summary-item new"><span class="icon">🆕</span><span class="count" id="summaryNew">0</span><span class="label">신규</span></div>
            <div class="check-summary-item invalid"><span class="icon">❌</span><span class="count" id="summaryInvalid">0</span><span class="label">유효하지 않음</span></div>
          </div>
          <div class="api-estimate-info">
            예상 API 호출 수: <strong id="summaryApiCalls">0</strong>회
          </div>
        </div>
        
        <!-- Log Console -->
        <div class="status-log" id="statusLog"></div>
      </div>
    </div>
    
    <!-- Main Tabs -->
    <div class="main-tabs">
      <button class="main-tab active" data-tab="tracker">📊 Tracker <span class="badge">거래 등록</span></button>
      <button class="main-tab" data-tab="analyst">📈 Analyst <span class="badge">데이터 갱신</span></button>
    </div>
    
    <!-- Tracker Tab -->
    <div class="tab-content active" id="trackerTab">
      <div class="main-grid">
        <div class="input-section">
          <div class="card">
            <h2 class="card-title">📁 파일 업로드</h2>
            <div class="file-drop-zone" id="dropZone">
              <div class="icon">📄</div>
              <p>파일을 드래그하거나 클릭하여 선택</p>
              <div class="formats">지원 형식: <code>.csv</code> <code>.tsv</code> <code>.json</code> <code>.txt</code></div>
            </div>
            <input type="file" id="fileInput" class="file-input" accept=".csv,.tsv,.json,.txt">
            <div class="file-info" id="fileInfo">
              <span class="name" id="fileName"></span>
              <span class="size" id="fileSize"></span>
              <button class="remove" id="removeFile">×</button>
            </div>
          </div>
          
          <div class="card" style="margin-top: 16px;">
            <h2 class="card-title">✏️ 직접 입력 <span class="badge">탭 구분</span></h2>
            <textarea class="text-input" id="textInput" placeholder="position&#9;modelName&#9;ticker&#9;purchaseDate
long&#9;MODEL-1&#9;AAPL&#9;2025-11-20
short&#9;MODEL-2&#9;MSFT&#9;2025-11-21"></textarea>
            <p class="input-hint">형식: <code>position</code> <code>modelName</code> <code>ticker</code> <code>purchaseDate</code> (탭으로 구분)</p>
          </div>
          
          <div class="card format-guide" style="margin-top: 16px;">
            <h3>📋 입력 형식 가이드</h3>
            <div class="format-example">
              <div class="comment"># TSV / 탭 구분 텍스트</div>
              <div><span class="highlight">long</span>	MODEL-1	AAPL	2025-11-20</div>
              <div><span class="highlight">short</span>	MODEL-2	MSFT	2025-11-21</div>
            </div>
          </div>
        </div>
        
        <div class="output-section">
          <div class="card preview-section">
            <div class="preview-header">
              <h2 class="card-title">👁️ 미리보기</h2>
              <span class="preview-count"><strong id="previewCount">0</strong>건</span>
            </div>
            <div class="preview-table-wrapper">
              <table class="preview-table" id="previewTable">
                <thead><tr><th>#</th><th>Position</th><th>Model</th><th>Ticker</th><th>Date</th></tr></thead>
                <tbody id="previewBody"><tr><td colspan="5" class="preview-empty">데이터를 입력하면 여기에 표시됩니다</td></tr></tbody>
              </table>
            </div>
            <div class="btn-group">
              <button class="btn btn-primary" id="submitBtn" disabled>🚀 전송하기</button>
              <button class="btn btn-secondary" id="clearBtn">🗑️ 초기화</button>
            </div>
          </div>
          
          <div class="card results-section" id="resultsSection">
            <h2 class="card-title">📈 실행 결과</h2>
            <div class="results-summary">
              <div class="result-stat total" data-filter="all" onclick="filterResults('all')"><div class="value" id="resultTotal">0</div><div class="label">전체</div></div>
              <div class="result-stat success" data-filter="success" onclick="filterResults('success')"><div class="value" id="resultSuccess">0</div><div class="label">성공</div></div>
              <div class="result-stat updated" data-filter="updated" onclick="filterResults('updated')"><div class="value" id="resultUpdated">0</div><div class="label">업데이트</div></div>
              <div class="result-stat skipped" data-filter="skipped" onclick="filterResults('skipped')"><div class="value" id="resultSkipped">0</div><div class="label">스킵</div></div>
              <div class="result-stat error" data-filter="error" onclick="filterResults('error')"><div class="value" id="resultFailed">0</div><div class="label">실패</div></div>
            </div>
            <div class="filter-active-hint" id="filterHint" style="display: none;">필터: <strong id="filterLabel">전체</strong> 표시 중 - <a href="#" onclick="filterResults('all'); return false;">전체 보기</a></div>
            <div class="results-details" id="resultsDetails"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Analyst Tab -->
    <div class="tab-content" id="analystTab">
      <div class="main-grid">
        <!-- refreshAnalystLog 엔드포인트 -->
        <div class="card">
          <h2 class="card-title">🔄 refreshAnalystLog</h2>
          <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.85rem;">
            애널리스트 데이터를 갱신합니다. 선택한 옵션에 따라 실행됩니다.
          </p>
          
          <!-- Tickers Input -->
          <div class="analyst-form-group">
            <label class="analyst-form-label">
              <span class="label-icon">🏷️</span> tickers
              <span class="label-hint">(공란 = 전체)</span>
            </label>
            <input type="text" class="analyst-form-input" id="analystTickers" placeholder="AAPL, MSFT, GOOGL (쉼표로 구분)">
          </div>
          
          <!-- Checkbox Options -->
          <div class="analyst-form-group">
            <label class="analyst-form-label"><span class="label-icon">⚙️</span> 실행 옵션</label>
            <div class="analyst-checkbox-grid">
              <label class="analyst-checkbox">
                <input type="checkbox" id="optPriceTarget">
                <span class="checkbox-icon">🎯</span>
                <span class="checkbox-content">
                  <span class="checkbox-title">priceTarget</span>
                  <span class="checkbox-desc">목표가 데이터 수집</span>
                </span>
              </label>
              <label class="analyst-checkbox">
                <input type="checkbox" id="optFrame">
                <span class="checkbox-icon">📊</span>
                <span class="checkbox-content">
                  <span class="checkbox-title">frame</span>
                  <span class="checkbox-desc">priceTrend 프레임 생성</span>
                </span>
              </label>
              <label class="analyst-checkbox">
                <input type="checkbox" id="optQuote">
                <span class="checkbox-icon">💹</span>
                <span class="checkbox-content">
                  <span class="checkbox-title">quote</span>
                  <span class="checkbox-desc">가격 데이터 채우기</span>
                </span>
              </label>
              <label class="analyst-checkbox">
                <input type="checkbox" id="optTest">
                <span class="checkbox-icon">🧪</span>
                <span class="checkbox-content">
                  <span class="checkbox-title">test</span>
                  <span class="checkbox-desc">테스트 모드 (10개만)</span>
                </span>
              </label>
              <label class="analyst-checkbox">
                <input type="checkbox" id="optGenerateRating">
                <span class="checkbox-icon">⭐</span>
                <span class="checkbox-content">
                  <span class="checkbox-title">generateRating</span>
                  <span class="checkbox-desc">완료 후 등급 생성</span>
                </span>
              </label>
              <label class="analyst-checkbox">
                <input type="checkbox" id="optSetAll">
                <span class="checkbox-icon">🔄</span>
                <span class="checkbox-content">
                  <span class="checkbox-title">setAll</span>
                  <span class="checkbox-desc">기존 값도 모두 덮어쓰기</span>
                </span>
              </label>
            </div>
          </div>
          
          <!-- Request Preview -->
          <div class="analyst-form-group">
            <label class="analyst-form-label"><span class="label-icon">🔗</span> 요청 미리보기</label>
            <div class="request-preview" id="refreshRequestPreview">/refreshAnalystLog</div>
          </div>
          
          <button class="btn btn-primary" id="runRefreshAnalystLog" style="width:100%;">▶️ refreshAnalystLog 실행</button>
        </div>
        
        <!-- generateRating 엔드포인트 -->
        <div class="card">
          <h2 class="card-title">⭐ generateRating</h2>
          <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.85rem;">
            기존 애널리스트 데이터를 기반으로 등급을 계산합니다. (API 호출 없음)
          </p>
          
          <div class="analyst-info-box">
            <div class="info-icon">💡</div>
            <div class="info-content">
              <div class="info-title">파라미터 없음</div>
              <div class="info-desc">이 엔드포인트는 추가 파라미터 없이 DB의 기존 데이터를 사용하여 등급을 계산합니다.</div>
            </div>
          </div>
          
          <!-- Request Preview -->
          <div class="analyst-form-group" style="margin-top: 16px;">
            <label class="analyst-form-label"><span class="label-icon">🔗</span> 요청 미리보기</label>
            <div class="request-preview">/generateRating</div>
          </div>
          
          <button class="btn btn-primary" id="runGenerateRating" style="width:100%;">▶️ generateRating 실행</button>
          
          <!-- Quick Actions -->
          <div class="quick-actions">
            <h4>⚡ 빠른 실행</h4>
            <div class="quick-action-buttons">
              <button class="btn btn-secondary btn-sm" id="quickPriceTarget">🎯 Price Target만</button>
              <button class="btn btn-secondary btn-sm" id="quickFrame">📊 Frame만</button>
              <button class="btn btn-secondary btn-sm" id="quickQuote">💹 Quote만</button>
              <button class="btn btn-secondary btn-sm" id="quickAll">🔄 전체 갱신</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
      </div> <!-- /container -->
    </div> <!-- /content-wrapper -->
  </div> <!-- /page-wrapper -->

  <div class="toast" id="toast"></div>
  
  <script>
    const API_KEY = '${apiKey}';
    
    // ==================== STATUS PANEL CONTROLLER ====================
    const statusPanel = document.getElementById('statusPanel');
    const statusTitle = document.getElementById('statusTitle');
    const statusSpinner = document.getElementById('statusSpinner');
    const statusProgressFill = document.getElementById('statusProgressFill');
    const statusProgressText = document.getElementById('statusProgressText');
    const statusEta = document.getElementById('statusEta');
    const statusLog = document.getElementById('statusLog');
    const statusProceedBtn = document.getElementById('statusProceedBtn');
    const statusCancelBtn = document.getElementById('statusCancelBtn');
    const statusCheckSummary = document.getElementById('statusCheckSummary');
    
    let taskStartTime = null;
    let currentPhase = 'idle'; // idle, checking, waiting, processing
    
    function showStatusPanel(title) {
      statusPanel.classList.remove('idle');
      statusPanel.classList.add('running');
      statusTitle.textContent = title;
      statusSpinner.style.display = 'block';
      statusCancelBtn.style.display = 'inline-flex';
      statusProgressFill.style.width = '0%';
      statusProgressText.textContent = '0/0 (0%)';
      statusEta.textContent = '예상 완료: 계산 중...';
      statusLog.innerHTML = '';
      statusCheckSummary.classList.remove('show');
      statusProceedBtn.style.display = 'none';
      document.getElementById('statusStats').style.display = 'flex';
      resetStats();
      taskStartTime = Date.now();
    }
    
    function setStatusIdle(title, keepLog = true) {
      statusPanel.classList.remove('running');
      statusPanel.classList.add('idle');
      statusTitle.textContent = title || '⏸️ 대기 중 - 작업을 시작하세요';
      statusSpinner.style.display = 'none';
      statusCancelBtn.style.display = 'none';
      statusProceedBtn.style.display = 'none';
      currentPhase = 'idle';
      if (!keepLog) {
        statusLog.innerHTML = '';
      }
    }
    
    function resetStats() {
      document.getElementById('statSkip').textContent = '0';
      document.getElementById('statPartial').textContent = '0';
      document.getElementById('statNew').textContent = '0';
      document.getElementById('statInvalid').textContent = '0';
    }
    
    function updateStats(stats) {
      document.getElementById('statSkip').textContent = stats.skip || 0;
      document.getElementById('statPartial').textContent = stats.partial || 0;
      document.getElementById('statNew').textContent = stats.new || 0;
      document.getElementById('statInvalid').textContent = stats.invalid || 0;
    }
    
    function updateProgress(current, total, customText = null) {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      statusProgressFill.style.width = percent + '%';
      statusProgressText.textContent = customText || (current + '/' + total + ' (' + percent + '%)');
      
      if (current > 0 && taskStartTime) {
        const elapsed = (Date.now() - taskStartTime) / 1000;
        const rate = current / elapsed;
        const remaining = total - current;
        const etaSec = rate > 0 ? Math.ceil(remaining / rate) : 0;
        if (etaSec > 60) {
          statusEta.textContent = '예상 완료: ' + Math.ceil(etaSec / 60) + '분';
        } else {
          statusEta.textContent = '예상 완료: ' + etaSec + '초';
        }
      }
    }
    
    function addLog(message, type = '') {
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const entry = document.createElement('div');
      entry.className = 'status-log-entry ' + type;
      entry.innerHTML = '<span class="time">' + time + '</span><span class="msg">' + message + '</span>';
      statusLog.appendChild(entry);
      statusLog.scrollTop = statusLog.scrollHeight;
    }
    
    function showCheckSummary(stats, apiCalls) {
      document.getElementById('summarySkip').textContent = stats.skip || 0;
      document.getElementById('summaryPartial').textContent = stats.partial || 0;
      document.getElementById('summaryNew').textContent = stats.new || 0;
      document.getElementById('summaryInvalid').textContent = stats.invalid || 0;
      document.getElementById('summaryApiCalls').textContent = apiCalls || 0;
      statusCheckSummary.classList.add('show');
      document.getElementById('statusStats').style.display = 'none';
    }
    
    // Tab switching
    document.querySelectorAll('.main-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tabId + 'Tab').classList.add('active');
      });
    });
    
    // ==================== TRACKER FUNCTIONALITY ====================
    
    let parsedTrades = [];
    let isCancelled = false;
    let abortController = null;
    let checkResults = null;
    let tradesToProcess = [];
    let allResults = [];
    let currentFilter = 'all';
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFile = document.getElementById('removeFile');
    const textInput = document.getElementById('textInput');
    const previewBody = document.getElementById('previewBody');
    const previewCount = document.getElementById('previewCount');
    const submitBtn = document.getElementById('submitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsSection = document.getElementById('resultsSection');
    const toast = document.getElementById('toast');
    
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
    removeFile.addEventListener('click', () => {
      fileInput.value = '';
      fileInfo.classList.remove('show');
      updatePreview([]);
    });
    
    textInput.addEventListener('input', () => {
      const text = textInput.value.trim();
      updatePreview(text ? parseTSV(text) : []);
    });
    
    function handleFile(file) {
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);
      fileInfo.classList.add('show');
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        let trades = [];
        if (file.name.endsWith('.json')) trades = parseJSON(content);
        else if (file.name.endsWith('.csv')) trades = parseCSV(content);
        else trades = parseTSV(content);
        textInput.value = tradesToTSV(trades);
        updatePreview(trades);
      };
      reader.readAsText(file);
    }
    
    function normalizeDate(dateStr) {
      if (!dateStr) return dateStr;
      const trimmed = dateStr.trim();
      if (/^\\d{4}-\\d{2}-\\d{2}$/.test(trimmed)) return trimmed;
      const slashMatch = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})$/);
      if (slashMatch) {
        const month = slashMatch[1].padStart(2, '0');
        const day = slashMatch[2].padStart(2, '0');
        return new Date().getFullYear() + '-' + month + '-' + day;
      }
      const fullMatch = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2,4})$/);
      if (fullMatch) {
        const month = fullMatch[1].padStart(2, '0');
        const day = fullMatch[2].padStart(2, '0');
        let year = fullMatch[3];
        if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
        return year + '-' + month + '-' + day;
      }
      return trimmed;
    }
    
    function parseTSV(text) {
      const lines = text.trim().split('\\n');
      const trades = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('position')) continue;
        const fields = trimmed.split('\\t');
        if (fields.length >= 4) {
          trades.push({
            position: fields[0].trim().toLowerCase(),
            modelName: fields[1].trim(),
            ticker: fields[2].trim().toUpperCase(),
            purchaseDate: normalizeDate(fields[3])
          });
        }
      }
      return trades;
    }
    
    function parseCSV(text) {
      const lines = text.trim().split('\\n');
      const trades = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('position')) continue;
        const fields = trimmed.split(',');
        if (fields.length >= 4) {
          trades.push({
            position: fields[0].trim().toLowerCase(),
            modelName: fields[1].trim(),
            ticker: fields[2].trim().toUpperCase(),
            purchaseDate: normalizeDate(fields[3])
          });
        }
      }
      return trades;
    }
    
    function parseJSON(text) {
      try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : [data];
        return arr.map(item => ({
          position: (item.position || '').toLowerCase(),
          modelName: item.modelName || '',
          ticker: (item.ticker || '').toUpperCase(),
          purchaseDate: normalizeDate(item.purchaseDate || '')
        }));
      } catch { return []; }
    }
    
    function tradesToTSV(trades) {
      return trades.map(t => [t.position, t.modelName, t.ticker, t.purchaseDate].join('\\t')).join('\\n');
    }
    
    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }
    
    function updatePreview(trades) {
      parsedTrades = trades;
      previewCount.textContent = trades.length;
      submitBtn.disabled = trades.length === 0;
      if (trades.length === 0) {
        previewBody.innerHTML = '<tr><td colspan="5" class="preview-empty">데이터를 입력하면 여기에 표시됩니다</td></tr>';
        return;
      }
      previewBody.innerHTML = trades.map((t, i) => '<tr><td>' + (i + 1) + '</td><td class="position-' + t.position + '">' + t.position + '</td><td class="model">' + t.modelName + '</td><td class="ticker">' + t.ticker + '</td><td>' + t.purchaseDate + '</td></tr>').join('');
    }
    
    function showToast(message, type = 'success') {
      toast.textContent = message;
      toast.className = 'toast show ' + type;
      setTimeout(() => { toast.className = 'toast'; }, 4000);
    }
    
    // Cancel button
    statusCancelBtn.addEventListener('click', () => {
      isCancelled = true;
      if (abortController) abortController.abort();
      addLog('사용자에 의해 취소됨', 'error');
      setStatusIdle('⏹️ 취소됨 - 마지막 작업이 취소되었습니다');
      showToast('취소되었습니다', 'error');
    });
    
    // Proceed button
    statusProceedBtn.addEventListener('click', async () => {
      if (tradesToProcess.length === 0) {
        showToast('처리할 거래가 없습니다', 'error');
        return;
      }
      currentPhase = 'processing';
      statusProceedBtn.style.display = 'none';
      statusCheckSummary.classList.remove('show');
      document.getElementById('statusStats').style.display = 'flex';
      statusTitle.textContent = 'API 호출 중...';
      taskStartTime = Date.now();
      resetStats();
      addLog('API 호출 시작 (' + tradesToProcess.length + '건)', 'info');
      await processTradesPhase();
    });
    
    // Submit - Check Phase
    submitBtn.addEventListener('click', async () => {
      if (parsedTrades.length === 0) return;
      
      isCancelled = false;
      checkResults = null;
      tradesToProcess = [];
      currentPhase = 'checking';
      
      showStatusPanel('🔍 DB 중복 확인 중...');
      addLog('DB 중복 확인 시작 (' + parsedTrades.length + '건)', 'info');
      
      const total = parsedTrades.length;
      const stats = { skip: 0, partial: 0, new: 0, invalid: 0 };
      
      try {
        abortController = new AbortController();
        
        const checkStartTime = Date.now();
        const checkResponse = await fetch('/priceTracker/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedTrades),
          signal: abortController.signal
        });
        
        if (isCancelled) return;
        const checkData = await checkResponse.json();
        const checkTime = Date.now() - checkStartTime;
        
        if (checkData.summary) {
          stats.skip = checkData.summary.skip || 0;
          stats.partial = checkData.summary.partial || 0;
          stats.new = checkData.summary.new || 0;
          stats.invalid = checkData.summary.invalid || 0;
        }
        
        updateStats(stats);
        updateProgress(total, total);
        
        addLog('중복 확인 완료 (' + checkTime + 'ms)', 'success');
        addLog('스킵: ' + stats.skip + ', 업데이트: ' + stats.partial + ', 신규: ' + stats.new + ', 무효: ' + stats.invalid);
        
        checkResults = checkData;
        tradesToProcess = (checkData.results || []).filter(r => r.status === 'new' || r.status === 'partial').map(r => r.trade);
        
        // Show check summary
        showCheckSummary(stats, checkData.summary?.estimatedApiCalls || 0);
        
        if (tradesToProcess.length > 0) {
          currentPhase = 'waiting';
          statusTitle.textContent = '✅ 중복 확인 완료 - ' + tradesToProcess.length + '건 처리 대기';
          statusSpinner.style.display = 'none';
          statusProceedBtn.style.display = 'inline-flex';
          addLog(tradesToProcess.length + '건의 거래가 API 호출 대기 중', 'warning');
        } else {
          statusTitle.textContent = '✅ 모든 거래가 이미 완료됨';
          statusSpinner.style.display = 'none';
          addLog('처리할 거래 없음 - 모두 완료 상태', 'success');
          setStatusIdle('✅ 완료 - 모든 거래가 이미 처리됨');
          showCheckResults(checkResults);
        }
        
      } catch (error) {
        if (error.name === 'AbortError') return;
        addLog('오류: ' + error.message, 'error');
        showToast('중복 확인 실패: ' + error.message, 'error');
        setStatusIdle('❌ 오류 - 중복 확인 실패');
      }
    });
    
    // Process Phase
    async function processTradesPhase() {
      const results = [];
      let succeeded = 0, skipped = 0, failed = 0;
      const total = tradesToProcess.length;
      
      // Add skipped/invalid from check phase
      if (checkResults?.results) {
        for (const r of checkResults.results) {
          if (r.status === 'skip') {
            results.push({ index: r.index, status: 200, trade: r.trade, skipped: true, message: r.reason });
            skipped++;
          } else if (r.status === 'invalid') {
            results.push({ index: r.index, status: 400, trade: r.trade, error: { code: 'INVALID', message: r.reason } });
            failed++;
          }
        }
      }
      
      try {
        for (let i = 0; i < tradesToProcess.length; i++) {
          if (isCancelled) {
            addLog('취소됨: ' + i + '/' + total + '건 처리됨', 'error');
            break;
          }
          
          const trade = tradesToProcess[i];
          updateProgress(i + 1, total);
          addLog('처리 중: ' + trade.ticker + ' (' + (i + 1) + '/' + total + ')');
          
          try {
            abortController = new AbortController();
            const response = await fetch('/priceTracker?skipValidation=true', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([trade]),
              signal: abortController.signal
            });
            const data = await response.json();
            const result = data.results?.[0];
            if (result) {
              results.push(result);
              if (result.status === 200 || result.status === 201) {
                succeeded++;
                addLog('✅ ' + trade.ticker + ' 성공', 'success');
              } else {
                failed++;
                addLog('❌ ' + trade.ticker + ' 실패: ' + (result.error?.message || 'unknown'), 'error');
              }
            }
          } catch (error) {
            if (error.name === 'AbortError') break;
            results.push({ index: i, status: 500, trade, error: { code: 'NETWORK_ERROR', message: error.message } });
            failed++;
            addLog('❌ ' + trade.ticker + ' 네트워크 오류', 'error');
          }
          
          // Update stats display
          document.getElementById('statSkip').textContent = skipped;
          document.getElementById('statNew').textContent = succeeded;
          document.getElementById('statInvalid').textContent = failed;
        }
        
        if (!isCancelled) {
          addLog('완료: ' + succeeded + '건 성공, ' + skipped + '건 스킵, ' + failed + '건 실패', 'success');
          showResults({ results, summary: { total: parsedTrades.length, succeeded, skipped, failed } });
          showToast('처리 완료: ' + succeeded + '건 성공', succeeded > 0 ? 'success' : 'error');
          setStatusIdle('✅ 완료 - ' + succeeded + '건 성공, ' + skipped + '건 스킵, ' + failed + '건 실패');
        } else {
          showResults({ results, summary: { total: results.length, succeeded, skipped, failed } });
          setStatusIdle('⏹️ 취소됨 - ' + succeeded + '건 처리됨');
        }
        
      } catch (error) {
        addLog('오류: ' + error.message, 'error');
        showToast('요청 실패: ' + error.message, 'error');
        setStatusIdle('❌ 오류 - 요청 처리 실패');
      }
    }
    
    function classifyResult(r) {
      if (r.skipped) return 'skipped';
      if (r.status === 200 || r.status === 201) {
        if (r.data?.meta?.dateAdjusted || r.updated) return 'updated';
        return 'success';
      }
      return 'error';
    }
    
    function filterResults(filter) {
      currentFilter = filter;
      document.querySelectorAll('.result-stat').forEach(el => el.classList.toggle('active', el.dataset.filter === filter));
      const filterHint = document.getElementById('filterHint');
      if (filter === 'all') {
        filterHint.style.display = 'none';
      } else {
        filterHint.style.display = 'block';
        const labels = { success: '성공', updated: '업데이트', skipped: '스킵', error: '실패' };
        document.getElementById('filterLabel').textContent = labels[filter] || filter;
      }
      const filtered = filter === 'all' ? allResults : allResults.filter(r => classifyResult(r) === filter);
      renderResultItems(filtered);
    }
    window.filterResults = filterResults;
    
    function toggleResultItem(element) { element.classList.toggle('expanded'); }
    window.toggleResultItem = toggleResultItem;
    
    function renderResultItems(results) {
      const icons = { success: '✅', updated: '🔄', skipped: '⏭️', error: '❌' };
      const html = results.map(r => {
        const type = classifyResult(r);
        const trade = r.trade || {};
        let details = '<div class="detail-row"><span class="detail-label">상태</span><span class="detail-value ' + type + '">' + (type === 'success' ? '성공' : type === 'updated' ? '업데이트됨' : type === 'skipped' ? '스킵됨' : '실패') + '</span></div>';
        if (r.status) details += '<div class="detail-row"><span class="detail-label">HTTP 상태</span><span class="detail-value">' + r.status + '</span></div>';
        if (r.message) details += '<div class="detail-row"><span class="detail-label">사유</span><span class="detail-value">' + r.message + '</span></div>';
        if (r.error) details += '<div class="detail-row"><span class="detail-label">오류</span><span class="detail-value error">' + (r.error.message || '-') + '</span></div>';
        return '<div class="result-item ' + type + '" onclick="toggleResultItem(this)"><div class="result-item-header"><span class="status-icon">' + icons[type] + '</span><div class="trade-info">' + (trade.position || '-') + ' | ' + (trade.modelName || '-') + ' | ' + (trade.ticker || '-') + ' | ' + (trade.purchaseDate || '-') + '</div><span class="expand-icon">▼</span></div><div class="result-item-details">' + details + '</div></div>';
      }).join('');
      document.getElementById('resultsDetails').innerHTML = html || '<p class="preview-empty">결과 없음</p>';
    }
    
    function showCheckResults(checkData) {
      resultsSection.classList.add('show');
      const results = (checkData.results || []).map(r => ({
        status: r.status === 'skip' ? 200 : 400,
        skipped: r.status === 'skip',
        trade: r.trade,
        message: r.reason,
        error: r.status === 'invalid' ? { code: 'INVALID', message: r.reason } : null
      }));
      allResults = results;
      let skippedCount = 0, errorCount = 0;
      results.forEach(r => { if (r.skipped) skippedCount++; else errorCount++; });
      document.getElementById('resultTotal').textContent = results.length;
      document.getElementById('resultSuccess').textContent = 0;
      document.getElementById('resultUpdated').textContent = 0;
      document.getElementById('resultSkipped').textContent = skippedCount;
      document.getElementById('resultFailed').textContent = errorCount;
      currentFilter = 'all';
      document.querySelectorAll('.result-stat').forEach(el => el.classList.toggle('active', el.dataset.filter === 'all'));
      document.getElementById('filterHint').style.display = 'none';
      renderResultItems(results);
    }
    
    function showResults(data) {
      resultsSection.classList.add('show');
      allResults = data.results || [];
      let successCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0;
      allResults.forEach(r => {
        const type = classifyResult(r);
        if (type === 'success') successCount++;
        else if (type === 'updated') updatedCount++;
        else if (type === 'skipped') skippedCount++;
        else errorCount++;
      });
      document.getElementById('resultTotal').textContent = allResults.length;
      document.getElementById('resultSuccess').textContent = successCount;
      document.getElementById('resultUpdated').textContent = updatedCount;
      document.getElementById('resultSkipped').textContent = skippedCount;
      document.getElementById('resultFailed').textContent = errorCount;
      currentFilter = 'all';
      document.querySelectorAll('.result-stat').forEach(el => el.classList.toggle('active', el.dataset.filter === 'all'));
      document.getElementById('filterHint').style.display = 'none';
      renderResultItems(allResults);
    }
    
    clearBtn.addEventListener('click', () => {
      textInput.value = '';
      fileInput.value = '';
      fileInfo.classList.remove('show');
      updatePreview([]);
      resultsSection.classList.remove('show');
    });
    
    // ==================== ANALYST FUNCTIONALITY ====================
    
    // Elements
    const analystTickers = document.getElementById('analystTickers');
    const optPriceTarget = document.getElementById('optPriceTarget');
    const optFrame = document.getElementById('optFrame');
    const optQuote = document.getElementById('optQuote');
    const optTest = document.getElementById('optTest');
    const optGenerateRating = document.getElementById('optGenerateRating');
    const optSetAll = document.getElementById('optSetAll');
    const refreshRequestPreview = document.getElementById('refreshRequestPreview');
    
    // Update request preview
    function updateRefreshPreview() {
      const params = [];
      const tickers = analystTickers.value.trim();
      
      if (tickers) params.push('tickers=' + encodeURIComponent(tickers));
      if (optPriceTarget.checked) params.push('priceTarget=true');
      if (optFrame.checked) params.push('frame=true');
      if (optQuote.checked) params.push('quote=true');
      if (optTest.checked) params.push('test=true');
      if (!optGenerateRating.checked) params.push('generateRating=false');
      if (optSetAll.checked) params.push('setAll=true');
      
      const queryString = params.length > 0 ? '?' + params.join('&') : '';
      refreshRequestPreview.textContent = '/refreshAnalystLog' + queryString;
    }
    
    // Add event listeners for preview update
    analystTickers.addEventListener('input', updateRefreshPreview);
    [optPriceTarget, optFrame, optQuote, optTest, optGenerateRating, optSetAll].forEach(el => {
      el.addEventListener('change', updateRefreshPreview);
    });
    
    async function runAnalystTask(endpoint, title, params = {}) {
      isCancelled = false;
      showStatusPanel(title);
      addLog('작업 시작: ' + title, 'info');
      
      // Log parameters
      const paramStr = Object.entries(params).filter(([k,v]) => v).map(([k,v]) => k + '=' + v).join(', ');
      if (paramStr) addLog('파라미터: ' + paramStr, 'info');
      
      try {
        const url = new URL(endpoint, window.location.origin);
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
        url.searchParams.set('api_key', API_KEY);
        
        addLog('요청: ' + url.pathname + url.search.replace(/api_key=[^&]+/, 'api_key=***'));
        
        let progress = 0;
        const progressInterval = setInterval(() => {
          if (isCancelled) { clearInterval(progressInterval); return; }
          progress = Math.min(progress + Math.random() * 3, 95);
          updateProgress(Math.round(progress), 100, Math.round(progress) + '%');
          
          const elapsed = Math.round((Date.now() - taskStartTime) / 1000);
          if (elapsed % 10 === 0 && elapsed > 0) {
            addLog('진행 중... ' + elapsed + '초 경과');
          }
        }, 1000);
        
        abortController = new AbortController();
        const response = await fetch(url.toString(), { signal: abortController.signal });
        clearInterval(progressInterval);
        
        const data = await response.json();
        updateProgress(100, 100, '100%');
        
        addLog('작업 완료', 'success');
        if (data.message) addLog('메시지: ' + data.message, 'success');
        if (data.duration) addLog('소요 시간: ' + data.duration);
        if (data.steps) {
          data.steps.forEach(step => {
            addLog('  - ' + step.step + ': ' + (step.success ? '✓' : '✗') + (step.duration ? ' (' + step.duration + ')' : ''));
          });
        }
        
        showToast(title.replace('...', '') + ' 완료', 'success');
        setStatusIdle('✅ ' + title.replace('...', '').replace(/^[^ ]+ /, '') + ' 완료');
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          addLog('오류: ' + error.message, 'error');
          showToast('실패: ' + error.message, 'error');
          setStatusIdle('❌ 오류 - ' + error.message);
        } else {
          setStatusIdle('⏹️ 취소됨');
        }
      }
    }
    
    // Main refresh button
    document.getElementById('runRefreshAnalystLog').addEventListener('click', () => {
      const tickers = analystTickers.value.trim();
      const params = {};
      
      if (tickers) params.tickers = tickers;
      if (optPriceTarget.checked) params.priceTarget = 'true';
      if (optFrame.checked) params.frame = 'true';
      if (optQuote.checked) params.quote = 'true';
      if (optTest.checked) params.test = 'true';
      if (!optGenerateRating.checked) params.generateRating = 'false';
      if (optSetAll.checked) params.setAll = 'true';
      
      // Build title based on options
      let title = '🔄 refreshAnalystLog 실행 중...';
      const opts = [];
      if (params.priceTarget) opts.push('PriceTarget');
      if (params.frame) opts.push('Frame');
      if (params.quote) opts.push('Quote');
      if (params.setAll) opts.push('(덮어쓰기)');
      if (opts.length > 0) title = '🔄 ' + opts.join('+') + ' 갱신 중...';
      
      runAnalystTask('/refreshAnalystLog', title, params);
    });
    
    // Generate Rating button
    document.getElementById('runGenerateRating').addEventListener('click', () => {
      runAnalystTask('/generateRating', '⭐ Rating 생성 중...', {});
    });
    
    // Quick action buttons
    document.getElementById('quickPriceTarget').addEventListener('click', () => {
      runAnalystTask('/refreshAnalystLog', '🎯 Price Target 갱신 중...', {
        priceTarget: 'true', generateRating: 'false'
      });
    });
    
    document.getElementById('quickFrame').addEventListener('click', () => {
      runAnalystTask('/refreshAnalystLog', '📊 Frame 초기화 중...', {
        frame: 'true', generateRating: 'false'
      });
    });
    
    document.getElementById('quickQuote').addEventListener('click', () => {
      runAnalystTask('/refreshAnalystLog', '💹 Quote 채우기 중...', {
        quote: 'true', generateRating: 'false'
      });
    });
    
    document.getElementById('quickAll').addEventListener('click', () => {
      runAnalystTask('/refreshAnalystLog', '🔄 전체 갱신 중...', {
        priceTarget: 'true', frame: 'true', quote: 'true', generateRating: 'true'
      });
    });
    
    // Initialize preview
    updateRefreshPreview();
  </script>
</body>
</html>
`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
