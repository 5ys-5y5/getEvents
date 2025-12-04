/**
 * GET /tracker - Price Tracker Input Page
 * A web interface to submit trades to POST /priceTracker endpoint
 * Supports CSV, JSON, TSV file upload and direct text input
 *
 * Authentication: Requires session-based login (handled by requireAuth middleware)
 */

export default function trackerPage(req, res) {
  // Authentication is handled by requireAuth middleware in index.js
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Tracker - 거래 등록</title>
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
      --text-bright: #111111;    /* Bright text (same as main) */
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

    @media (max-width: 768px) {
      .main-grid {
        grid-template-columns: 1fr;
      }

      .content-wrapper {
        padding: 16px;
      }
    }
    
    header {
      margin-bottom: 32px;
    }
    
    h1 {
      font-size: 1.8rem;
      font-weight: 600;
      color: var(--text-bright);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    h1 .icon { font-size: 1.5rem; }
    
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    
    @media (max-width: 900px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    
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
    
    .file-drop-zone .icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }
    
    .file-drop-zone p {
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    .file-drop-zone .formats {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    
    .file-drop-zone .formats code {
      background: var(--bg-input);
      padding: 2px 6px;
      border-radius: 4px;
      margin: 0 2px;
    }
    
    .file-input {
      display: none;
    }
    
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
      padding: 4px;
    }
    
    /* Text Input */
    .text-input-wrapper {
      position: relative;
    }
    
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
    
    .text-input::placeholder {
      color: var(--text-muted);
    }
    
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
    .preview-section {
      margin-top: 24px;
    }
    
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .preview-count {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .preview-count strong {
      color: var(--accent);
    }
    
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
    
    .preview-table tr:last-child td {
      border-bottom: none;
    }
    
    .preview-table tr:hover td {
      background: rgba(88, 166, 255, 0.05);
    }
    
    .preview-table .position-long { color: var(--success); }
    .preview-table .position-short { color: var(--error); }
    .preview-table .ticker { font-family: 'JetBrains Mono', monospace; font-weight: 500; }
    .preview-table .model { color: var(--accent); }
    
    .preview-empty {
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
    }
    
    /* Buttons */
    .btn-group {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    
    .btn {
      padding: 12px 24px;
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
    
    .btn-primary:hover:not(:disabled) {
      background: var(--accent-hover);
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: var(--bg-input);
      color: var(--text);
      border: 1px solid var(--border);
    }
    
    .btn-secondary:hover {
      background: var(--border);
    }
    
    /* Results */
    .results-section {
      margin-top: 24px;
      display: none;
    }
    
    .results-section.show { display: block; }
    
    .results-summary {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    .result-stat {
      padding: 12px 20px;
      background: var(--bg-input);
      border-radius: 6px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    
    .result-stat:hover {
      background: rgba(88, 166, 255, 0.1);
    }
    
    .result-stat.active {
      border-color: var(--accent);
    }
    
    .result-stat .value {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .result-stat .label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    
    .result-stat.success .value { color: var(--success); }
    .result-stat.success.active { border-color: var(--success); }
    .result-stat.updated .value { color: var(--warning); }
    .result-stat.updated.active { border-color: var(--warning); }
    .result-stat.error .value { color: var(--error); }
    .result-stat.error.active { border-color: var(--error); }
    .result-stat.skipped .value { color: #6b7280; }
    .result-stat.skipped.active { border-color: #6b7280; }
    .result-stat.total .value { color: var(--accent); }
    
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
    
    .result-item:last-child { border-bottom: none; }
    
    .result-item:hover {
      background: rgba(88, 166, 255, 0.05);
    }
    
    .result-item-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .result-item .status-icon {
      font-size: 1.2rem;
    }
    
    .result-item.success .status-icon { color: var(--success); }
    .result-item.updated .status-icon { color: var(--warning); }
    .result-item.error .status-icon { color: var(--error); }
    .result-item.skipped .status-icon { color: #6b7280; }
    
    .result-item .trade-info {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    
    .result-item .error-msg {
      font-size: 0.8rem;
      color: var(--error);
    }
    
    .result-item .expand-icon {
      font-size: 0.9rem;
      color: var(--text-muted);
      transition: transform 0.2s;
    }
    
    .result-item.expanded .expand-icon {
      transform: rotate(180deg);
    }
    
    .result-item-details {
      display: none;
      margin-top: 12px;
      padding: 12px;
      background: var(--bg-input);
      border-radius: 6px;
      font-size: 0.85rem;
    }
    
    .result-item.expanded .result-item-details {
      display: block;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid var(--border);
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      color: var(--text-muted);
    }
    
    .detail-value {
      font-family: 'JetBrains Mono', monospace;
    }
    
    .detail-value.success { color: var(--success); }
    .detail-value.error { color: var(--error); }
    .detail-value.warning { color: var(--warning); }
    
    .filter-active-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    /* Loading */
    .loading-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(13, 17, 23, 0.9);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    
    .loading-overlay.show { display: flex; }
    
    .loading-content {
      text-align: center;
    }
    
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Format Guide */
    .format-guide {
      margin-top: 24px;
    }
    
    .format-guide h3 {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    
    .format-example {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      overflow-x: auto;
    }
    
    .format-example .comment {
      color: var(--text-muted);
    }
    
    .format-example .highlight {
      color: var(--accent);
    }
    
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
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--error); }
    
    /* Progress Bar */
    .progress-container {
      width: 100%;
      max-width: 400px;
      margin: 20px 0;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--bg);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--accent), var(--success));
      transition: width 0.3s ease;
    }
    
    .progress-text {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .progress-stats {
      display: flex;
      gap: 20px;
      margin: 15px 0;
      font-size: 0.9rem;
    }
    
    .progress-stats .stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .progress-stats .stat.success { color: var(--success); }
    .progress-stats .stat.skipped { color: var(--warning, #f59e0b); }
    .progress-stats .stat.failed { color: var(--error); }
    
    .btn-cancel {
      margin-top: 15px;
      background: var(--error);
      color: white;
      border: none;
      padding: 10px 30px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;
    }
    
    .btn-cancel:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    
    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 500px;
      width: 90%;
    }
    
    /* Check Progress (Real-time) */
    .check-progress {
      width: 100%;
      margin: 20px 0;
      padding: 20px;
      background: var(--bg);
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    
    .check-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .check-progress-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }
    
    .check-progress-count {
      font-size: 0.9rem;
      color: var(--accent);
      font-weight: 600;
    }
    
    .check-progress-current {
      text-align: center;
      margin-top: 8px;
      font-size: 0.85rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .check-live-stats {
      display: flex;
      gap: 16px;
      margin-top: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .check-live-stats .stat {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    /* Check Summary */
    .check-summary {
      width: 100%;
      margin: 20px 0;
      padding: 20px;
      background: var(--bg);
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    
    .check-summary h3 {
      margin: 0 0 15px 0;
      font-size: 1rem;
      color: var(--text);
    }
    
    .check-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    
    .check-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 8px;
      border-radius: 8px;
      background: var(--bg-card);
    }
    
    .check-item .icon { font-size: 1.5rem; }
    .check-item .count { font-size: 1.8rem; font-weight: bold; margin: 5px 0; }
    .check-item .label { font-size: 0.75rem; color: var(--text-muted); text-align: center; }
    
    .check-item.skip { border-left: 3px solid #6b7280; }
    .check-item.partial { border-left: 3px solid var(--warning, #f59e0b); }
    .check-item.new { border-left: 3px solid var(--success); }
    .check-item.invalid { border-left: 3px solid var(--error); }
    
    .api-estimate {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid var(--border);
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    
    .api-estimate strong {
      color: var(--accent);
      font-size: 1.1rem;
    }
    
    .overlay-buttons {
      display: flex;
      gap: 12px;
      margin-top: 15px;
    }
    
    .btn-primary {
      background: var(--success);
      color: white;
      border: none;
      padding: 10px 30px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;
    }
    
    .btn-primary:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    
    .spinner.hidden { display: none; }

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
      <a href="/control" class="top-nav-link">Control</a>
      <a href="/tracker" class="top-nav-link active">Tracker</a>
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

  <!-- Mobile TOC Toggle Button -->
  <button class="toc-toggle" onclick="document.querySelector('.toc-sidebar').classList.toggle('open')" style="display: none; position: fixed; top: 76px; left: 16px; z-index: 1001; background: #2b2b2b; color: #fff; border: none; padding: 10px 14px; border-radius: 4px; cursor: pointer; font-size: 1.2rem;">☰</button>

  <div class="page-wrapper">
    <!-- Sidebar -->
    <aside class="toc-sidebar">
      <div class="toc-title">Price Tracker</div>
      <ul class="toc-list">
        <li class="toc-item"><a href="#upload" class="toc-link">📁 File Upload</a></li>
        <li class="toc-item"><a href="#input" class="toc-link">✏️ Direct Input</a></li>
        <li class="toc-item"><a href="#guide" class="toc-link">📋 Format Guide</a></li>
        <li class="toc-item"><a href="#preview" class="toc-link">👁️ Preview</a></li>
        <li class="toc-item"><a href="#results" class="toc-link">📊 Results</a></li>
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
          <h1><span class="icon">📊</span> Price Tracker</h1>
          <p class="subtitle">거래 데이터를 등록하고 D+1 ~ D+14 성과를 추적합니다</p>
        </header>

        <!-- 기능 안내 박스 -->
        <div style="background: linear-gradient(135deg, rgba(0, 102, 204, 0.1), rgba(46, 125, 50, 0.1)); border: 1px solid #0066cc; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: #0066cc;">📚 Tracker 페이지 기능 안내</h4>
          <p style="font-size: 0.9rem; line-height: 1.7; margin-bottom: 16px; color: #111111;">
            <strong>Price Tracker</strong>는 거래 데이터를 등록하고 D+1부터 D+14까지의 가격 추이를 자동으로 추적하는 도구입니다.
          </p>
          
          <div style="padding-left: 16px;">
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📁 파일 업로드</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>지원 형식</strong>: CSV, TSV, JSON, TXT (탭 구분 텍스트)</li>
              <li><strong>드래그 앤 드롭</strong>: 파일을 박스에 드래그하거나 클릭하여 선택</li>
              <li><strong>자동 파싱</strong>: 파일 형식을 자동 감지하여 데이터 추출</li>
              <li><strong>필수 컬럼</strong>: position (long/short), modelName, ticker, purchaseDate</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">✏️ 직접 입력</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>탭 구분 형식</strong>: 엑셀에서 복사한 데이터를 바로 붙여넣기 가능</li>
              <li><strong>헤더 자동 감지</strong>: 첫 줄을 헤더로 인식하거나 생략 가능</li>
              <li><strong>실시간 검증</strong>: 입력하면서 즉시 포맷 오류 확인</li>
              <li><strong>예시 제공</strong>: placeholder에 입력 형식 샘플 표시</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">👁️ 미리보기</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>데이터 검증</strong>: 등록 전 모든 거래 데이터 확인</li>
              <li><strong>오류 표시</strong>: 잘못된 형식이나 누락된 정보 강조</li>
              <li><strong>편집 가능</strong>: 미리보기에서 직접 수정 후 전송</li>
              <li><strong>건수 표시</strong>: 총 몇 건의 거래가 등록되는지 확인</li>
            </ul>
            
            <p style="margin-bottom: 12px; font-weight: 600; color: #111111;">📊 결과 표시</p>
            <ul style="list-style: disc; padding-left: 20px; line-height: 1.8; margin-bottom: 16px; color: #111111;">
              <li><strong>전송 결과</strong>: 성공/실패/업데이트/스킵된 거래 수 통계</li>
              <li><strong>상세 로그</strong>: 각 거래의 처리 결과 메시지</li>
              <li><strong>Price Trend</strong>: 등록 완료 즉시 price_trend 필드 생성 시작</li>
              <li><strong>자동 추적</strong>: 매일 자동으로 D+1 ~ D+14 가격 데이터 업데이트</li>
            </ul>
            
            <p style="font-size: 0.85rem; color: #666666; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
              <strong>💡 데이터 형식</strong>: <br>
              • position: "long" 또는 "short"<br>
              • modelName: 모델 구분자 (예: MODEL-1, MODEL-2)<br>
              • ticker: 종목 코드 (예: AAPL, MSFT)<br>
              • purchaseDate: YYYY-MM-DD 형식 (예: 2025-11-20)<br><br>
              등록된 데이터는 <strong>Dashboard</strong>에서 분석 가능하며, <strong>Proceeding</strong>에서 일괄 처리할 수 있습니다.
            </p>
          </div>
        </div>
    
    <div class="main-grid">
      <!-- Left: Input Section -->
      <div class="input-section">
        <!-- File Upload -->
        <div class="card">
          <h2 class="card-title">📁 파일 업로드</h2>
          
          <div class="file-drop-zone" id="dropZone">
            <div class="icon">📄</div>
            <p>파일을 드래그하거나 클릭하여 선택</p>
            <div class="formats">
              지원 형식: <code>.csv</code> <code>.tsv</code> <code>.json</code> <code>.txt</code>
            </div>
          </div>
          <input type="file" id="fileInput" class="file-input" accept=".csv,.tsv,.json,.txt">
          
          <div class="file-info" id="fileInfo">
            <span class="name" id="fileName"></span>
            <span class="size" id="fileSize"></span>
            <button class="remove" id="removeFile">×</button>
          </div>
        </div>
        
        <!-- Text Input -->
        <div class="card" style="margin-top: 16px;">
          <h2 class="card-title">✏️ 직접 입력 <span class="badge">탭 구분</span></h2>
          
          <div class="text-input-wrapper">
            <textarea 
              class="text-input" 
              id="textInput" 
              placeholder="position&#9;modelName&#9;ticker&#9;purchaseDate
long&#9;MODEL-1&#9;AAPL&#9;2025-11-20
short&#9;MODEL-2&#9;MSFT&#9;2025-11-21"
            ></textarea>
          </div>
          <p class="input-hint">
            형식: <code>position</code> <code>modelName</code> <code>ticker</code> <code>purchaseDate</code> (탭으로 구분)
          </p>
        </div>
        
        <!-- Format Guide -->
        <div class="card format-guide" style="margin-top: 16px;">
          <h3>📋 입력 형식 가이드</h3>
          <div class="format-example">
            <div class="comment"># TSV / 탭 구분 텍스트</div>
            <div><span class="highlight">long</span>	MODEL-1	AAPL	2025-11-20</div>
            <div><span class="highlight">short</span>	MODEL-2	MSFT	2025-11-21</div>
            <br>
            <div class="comment"># CSV (쉼표 구분)</div>
            <div>long,MODEL-1,GOOGL,2025-11-22</div>
            <br>
            <div class="comment"># JSON</div>
            <div>[{"position":"long","modelName":"MODEL-1","ticker":"NVDA","purchaseDate":"2025-11-23"}]</div>
          </div>
        </div>
      </div>
      
      <!-- Right: Preview & Results -->
      <div class="output-section">
        <!-- Preview -->
        <div class="card preview-section">
          <div class="preview-header">
            <h2 class="card-title">👁️ 미리보기</h2>
            <span class="preview-count"><strong id="previewCount">0</strong>건</span>
          </div>
          
          <div class="preview-table-wrapper">
            <table class="preview-table" id="previewTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Position</th>
                  <th>Model</th>
                  <th>Ticker</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody id="previewBody">
                <tr>
                  <td colspan="5" class="preview-empty">데이터를 입력하면 여기에 표시됩니다</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="btn-group">
            <button class="btn btn-primary" id="submitBtn" disabled>
              🚀 전송하기
            </button>
            <button class="btn btn-secondary" id="clearBtn">
              🗑️ 초기화
            </button>
          </div>
        </div>
        
        <!-- Results -->
        <div class="card results-section" id="resultsSection">
          <h2 class="card-title">📈 실행 결과</h2>
          
          <div class="results-summary">
            <div class="result-stat total" data-filter="all" onclick="filterResults('all')">
              <div class="value" id="resultTotal">0</div>
              <div class="label">전체</div>
            </div>
            <div class="result-stat success" data-filter="success" onclick="filterResults('success')">
              <div class="value" id="resultSuccess">0</div>
              <div class="label">성공</div>
            </div>
            <div class="result-stat updated" data-filter="updated" onclick="filterResults('updated')">
              <div class="value" id="resultUpdated">0</div>
              <div class="label">업데이트</div>
            </div>
            <div class="result-stat skipped" data-filter="skipped" onclick="filterResults('skipped')">
              <div class="value" id="resultSkipped">0</div>
              <div class="label">스킵</div>
            </div>
            <div class="result-stat error" data-filter="error" onclick="filterResults('error')">
              <div class="value" id="resultFailed">0</div>
              <div class="label">실패</div>
            </div>
          </div>
          
          <div class="filter-active-hint" id="filterHint" style="display: none;">
            필터: <strong id="filterLabel">전체</strong> 표시 중 - <a href="#" onclick="filterResults('all'); return false;">전체 보기</a>
          </div>
          
          <div class="results-details" id="resultsDetails"></div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Loading Overlay with Progress -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-content">
      <div class="spinner" id="loadingSpinner"></div>
      <p id="loadingText">거래 데이터 처리 중...</p>
      
      <!-- Check Phase Progress -->
      <div class="check-progress" id="checkProgress" style="display: none;">
        <div class="check-progress-header">
          <span class="check-progress-title">🔍 DB 중복 확인 중</span>
          <span class="check-progress-count" id="checkProgressCount">0/0</span>
        </div>
        <div class="progress-bar" style="margin: 12px 0;">
          <div class="progress-fill" id="checkProgressFill" style="width: 0%;"></div>
        </div>
        <div class="check-progress-current" id="checkProgressCurrent" style="font-size: 0.85rem; color: var(--text-muted);">
          준비 중...
        </div>
        <div class="check-live-stats" style="display: flex; gap: 16px; margin-top: 12px; justify-content: center;">
          <span class="stat skip" style="color: #8b949e;">⏭️ <span id="checkLiveSkip">0</span></span>
          <span class="stat partial" style="color: #f0883e;">🔄 <span id="checkLivePartial">0</span></span>
          <span class="stat new" style="color: #3fb950;">🆕 <span id="checkLiveNew">0</span></span>
          <span class="stat invalid" style="color: #f85149;">❌ <span id="checkLiveInvalid">0</span></span>
        </div>
      </div>
      
      <!-- Check Phase Summary (shown after check complete) -->
      <div class="check-summary" id="checkSummary" style="display: none;">
        <h3>📋 DB 중복 확인 완료</h3>
        <div class="check-grid">
          <div class="check-item skip">
            <span class="icon">⏭️</span>
            <span class="count" id="checkSkip">0</span>
            <span class="label">완료 (스킵)</span>
          </div>
          <div class="check-item partial">
            <span class="icon">🔄</span>
            <span class="count" id="checkPartial">0</span>
            <span class="label">일부 업데이트</span>
          </div>
          <div class="check-item new">
            <span class="icon">🆕</span>
            <span class="count" id="checkNew">0</span>
            <span class="label">신규</span>
          </div>
          <div class="check-item invalid">
            <span class="icon">❌</span>
            <span class="count" id="checkInvalid">0</span>
            <span class="label">유효하지 않음</span>
          </div>
        </div>
        <div class="api-estimate">
          <span>예상 API 호출 수: <strong id="estimatedApiCalls">0</strong>회</span>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="progress-container" id="progressContainer" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text">
          <span id="progressCount">0/0</span>
          <span id="progressPercent">0%</span>
        </div>
      </div>
      <div class="progress-stats" id="progressStats" style="display: none;">
        <span class="stat success">✅ <span id="progressSuccess">0</span></span>
        <span class="stat skipped">⏭️ <span id="progressSkipped">0</span></span>
        <span class="stat failed">❌ <span id="progressFailed">0</span></span>
      </div>
      
      <!-- Buttons -->
      <div class="overlay-buttons" id="overlayButtons">
        <button class="btn btn-primary" id="proceedBtn" style="display: none;">▶️ 진행하기</button>
        <button class="btn btn-cancel" id="cancelBtn">⏹️ 취소</button>
      </div>
    </div>
  </div>

      </div> <!-- /container -->
    </div> <!-- /content-wrapper -->
  </div> <!-- /page-wrapper -->

  <!-- Toast -->
  <div class="toast" id="toast"></div>

  <script>
    // State
    let parsedTrades = [];
    let isCancelled = false;
    let abortController = null;
    
    // Elements
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
    const cancelBtn = document.getElementById('cancelBtn');
    const progressFill = document.getElementById('progressFill');
    const progressCount = document.getElementById('progressCount');
    const progressPercent = document.getElementById('progressPercent');
    const progressSuccess = document.getElementById('progressSuccess');
    const progressSkipped = document.getElementById('progressSkipped');
    const progressFailed = document.getElementById('progressFailed');
    const loadingText = document.getElementById('loadingText');
    const clearBtn = document.getElementById('clearBtn');
    const resultsSection = document.getElementById('resultsSection');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toast = document.getElementById('toast');
    
    // File Drop Zone
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file);
    });
    
    removeFile.addEventListener('click', () => {
      fileInput.value = '';
      fileInfo.classList.remove('show');
      updatePreview([]);
    });
    
    // Text Input
    textInput.addEventListener('input', () => {
      const text = textInput.value.trim();
      if (text) {
        const trades = parseTSV(text);
        updatePreview(trades);
      } else {
        updatePreview([]);
      }
    });
    
    // Handle File
    function handleFile(file) {
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);
      fileInfo.classList.add('show');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        let trades = [];
        
        if (file.name.endsWith('.json')) {
          trades = parseJSON(content);
        } else if (file.name.endsWith('.csv')) {
          trades = parseCSV(content);
        } else {
          trades = parseTSV(content);
        }
        
        // Also populate text input
        textInput.value = tradesToTSV(trades);
        updatePreview(trades);
      };
      reader.readAsText(file);
    }
    
    // Date format converter: M/D, M/DD, MM/D, MM/DD -> YYYY-MM-DD
    function normalizeDate(dateStr) {
      if (!dateStr) return dateStr;
      const trimmed = dateStr.trim();
      
      // Already in YYYY-MM-DD format
      if (/^\\d{4}-\\d{2}-\\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      
      // M/D or M/DD or MM/D or MM/DD format (assume current year)
      const slashMatch = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})$/);
      if (slashMatch) {
        const month = slashMatch[1].padStart(2, '0');
        const day = slashMatch[2].padStart(2, '0');
        const year = new Date().getFullYear();
        return \`\${year}-\${month}-\${day}\`;
      }
      
      // M/D/YY or M/D/YYYY format
      const fullMatch = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2,4})$/);
      if (fullMatch) {
        const month = fullMatch[1].padStart(2, '0');
        const day = fullMatch[2].padStart(2, '0');
        let year = fullMatch[3];
        if (year.length === 2) {
          year = (parseInt(year) > 50 ? '19' : '20') + year;
        }
        return \`\${year}-\${month}-\${day}\`;
      }
      
      return trimmed;
    }
    
    // Parsers
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
      } catch (e) {
        showToast('JSON 파싱 오류: ' + e.message, 'error');
        return [];
      }
    }
    
    function tradesToTSV(trades) {
      return trades.map(t => 
        [t.position, t.modelName, t.ticker, t.purchaseDate].join('\\t')
      ).join('\\n');
    }
    
    // Update Preview
    function updatePreview(trades) {
      parsedTrades = trades;
      previewCount.textContent = trades.length;
      submitBtn.disabled = trades.length === 0;
      
      if (trades.length === 0) {
        previewBody.innerHTML = '<tr><td colspan="5" class="preview-empty">데이터를 입력하면 여기에 표시됩니다</td></tr>';
        return;
      }
      
      previewBody.innerHTML = trades.map((t, i) => \`
        <tr>
          <td>\${i + 1}</td>
          <td class="position-\${t.position}">\${t.position}</td>
          <td class="model">\${t.modelName}</td>
          <td class="ticker">\${t.ticker}</td>
          <td>\${t.purchaseDate}</td>
        </tr>
      \`).join('');
    }
    
    // Additional elements for check phase
    const checkSummary = document.getElementById('checkSummary');
    const progressContainer = document.getElementById('progressContainer');
    const progressStats = document.getElementById('progressStats');
    const proceedBtn = document.getElementById('proceedBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // State for check results
    let checkResults = null;
    let tradesToProcess = [];
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
      isCancelled = true;
      if (abortController) {
        abortController.abort();
      }
      loadingOverlay.classList.remove('show');
      resetOverlay();
      showToast('취소되었습니다', 'error');
    });
    
    // Proceed button (after check phase)
    proceedBtn.addEventListener('click', async () => {
      console.log('[Tracker] Proceed button clicked, tradesToProcess:', tradesToProcess.length);
      
      if (tradesToProcess.length === 0) {
        showToast('처리할 거래가 없습니다', 'error');
        loadingOverlay.classList.remove('show');
        return;
      }
      
      // Hide check summary, show progress
      checkSummary.style.display = 'none';
      proceedBtn.style.display = 'none';
      loadingSpinner.classList.remove('hidden');
      progressContainer.style.display = 'block';
      progressStats.style.display = 'flex';
      
      console.log('[Tracker] Starting processTradesPhase...');
      await processTradesPhase();
      console.log('[Tracker] processTradesPhase completed');
    });
    
    // Update progress UI
    function updateProgress(current, total, succeeded, skipped, failed) {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      progressFill.style.width = percent + '%';
      progressCount.textContent = current + '/' + total;
      progressPercent.textContent = percent + '%';
      progressSuccess.textContent = succeeded;
      progressSkipped.textContent = skipped;
      progressFailed.textContent = failed;
    }
    
    // Update check phase progress UI
    function updateCheckProgress(current, total, currentTicker, stats) {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      document.getElementById('checkProgressFill').style.width = percent + '%';
      document.getElementById('checkProgressCount').textContent = current + '/' + total + ' (' + percent + '%)';
      document.getElementById('checkProgressCurrent').textContent = currentTicker ? 
        '확인 중: ' + currentTicker : '완료';
      document.getElementById('checkLiveSkip').textContent = stats.skip || 0;
      document.getElementById('checkLivePartial').textContent = stats.partial || 0;
      document.getElementById('checkLiveNew').textContent = stats.new || 0;
      document.getElementById('checkLiveInvalid').textContent = stats.invalid || 0;
    }
    
    // Reset overlay UI
    function resetOverlay() {
      progressFill.style.width = '0%';
      progressCount.textContent = '0/0';
      progressPercent.textContent = '0%';
      progressSuccess.textContent = '0';
      progressSkipped.textContent = '0';
      progressFailed.textContent = '0';
      loadingText.textContent = 'DB 중복 확인 중...';
      cancelBtn.disabled = false;
      checkSummary.style.display = 'none';
      document.getElementById('checkProgress').style.display = 'none';
      progressContainer.style.display = 'none';
      progressStats.style.display = 'none';
      proceedBtn.style.display = 'none';
      loadingSpinner.classList.remove('hidden');
      isCancelled = false;
      checkResults = null;
      tradesToProcess = [];
    }
    
    // Submit - Two-phase: Check then Process
    // OPTIMIZED: Single API call for all trades (server does bulk lookup)
    submitBtn.addEventListener('click', async () => {
      if (parsedTrades.length === 0) return;
      
      resetOverlay();
      loadingOverlay.classList.add('show');
      
      // Show check progress UI
      const checkProgressEl = document.getElementById('checkProgress');
      checkProgressEl.style.display = 'block';
      loadingSpinner.classList.add('hidden');
      
      const total = parsedTrades.length;
      const stats = { skip: 0, partial: 0, new: 0, invalid: 0 };
      
      // Initial progress
      updateCheckProgress(0, total, '전체 데이터 로딩 중...', stats);
      loadingText.textContent = \`DB 중복 확인 중... (0/\${total})\`;
      
      try {
        // Phase 1: Single API call for ALL trades (optimized bulk check)
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
        
        // Update stats from response
        if (checkData.summary) {
          stats.skip = checkData.summary.skip || 0;
          stats.partial = checkData.summary.partial || 0;
          stats.new = checkData.summary.new || 0;
          stats.invalid = checkData.summary.invalid || 0;
        }
        
        // Final progress update
        updateCheckProgress(total, total, null, stats);
        
        // Show performance info
        const perfInfo = checkData.performance ? 
          \` (\${checkData.performance.totalMs}ms, \${checkData.performance.tradesPerSecond} trades/sec)\` : '';
        loadingText.textContent = 'DB 중복 확인 완료' + perfInfo;
        
        console.log(\`[check] Completed in \${checkTime}ms\`, checkData.performance);
        
        checkResults = checkData;
        
        // Update check summary UI
        document.getElementById('checkSkip').textContent = stats.skip;
        document.getElementById('checkPartial').textContent = stats.partial;
        document.getElementById('checkNew').textContent = stats.new;
        document.getElementById('checkInvalid').textContent = stats.invalid;
        document.getElementById('estimatedApiCalls').textContent = checkData.summary?.estimatedApiCalls || 0;
        
        // Filter trades that need processing (new or partial)
        tradesToProcess = (checkData.results || [])
          .filter(r => r.status === 'new' || r.status === 'partial')
          .map(r => r.trade);
        
        // Hide check progress, show check summary
        checkProgressEl.style.display = 'none';
        checkSummary.style.display = 'block';
        
        if (tradesToProcess.length > 0) {
          loadingText.textContent = \`\${tradesToProcess.length}건의 거래를 처리합니다\`;
          proceedBtn.style.display = 'inline-block';
        } else {
          loadingText.textContent = '모든 거래가 이미 완료되었습니다';
          // Auto close after 2 seconds
          setTimeout(() => {
            loadingOverlay.classList.remove('show');
            // Show results with skip info
            showCheckResults(checkResults);
          }, 2000);
        }
        
      } catch (error) {
        if (error.name === 'AbortError') return;
        showToast('중복 확인 실패: ' + error.message, 'error');
        loadingOverlay.classList.remove('show');
      }
    });
    
    // Phase 2: Process trades that need API calls
    async function processTradesPhase() {
      console.log('[Tracker] processTradesPhase started');
      const results = [];
      let succeeded = 0;
      let skipped = 0;
      let failed = 0;
      const total = tradesToProcess.length;
      console.log('[Tracker] Total trades to process:', total);
      
      // Add skipped trades from check phase to results
      if (checkResults?.results) {
        for (const r of checkResults.results) {
          if (r.status === 'skip') {
            results.push({
              index: r.index,
              status: 200,
              trade: r.trade,
              skipped: true,
              message: r.reason
            });
            skipped++;
          } else if (r.status === 'invalid') {
            results.push({
              index: r.index,
              status: 400,
              trade: r.trade,
              error: { code: 'INVALID', message: r.reason }
            });
            failed++;
          }
        }
      }
      
      try {
        console.log('[Tracker] Starting fetch loop for', tradesToProcess.length, 'trades');
        
        for (let i = 0; i < tradesToProcess.length; i++) {
          if (isCancelled) {
            showToast(\`취소됨: \${i}건 처리 완료\`, 'error');
            break;
          }
          
          const trade = tradesToProcess[i];
          console.log('[Tracker] Processing', i + 1, '/', total, ':', trade.ticker);
          loadingText.textContent = \`API 호출 중: \${trade.ticker} (\${i + 1}/\${total})\`;
          
          try {
            abortController = new AbortController();
            // skipValidation=true since we already validated in check phase
            console.log('[Tracker] Fetching /priceTracker for', trade.ticker);
            const response = await fetch('/priceTracker?skipValidation=true', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([trade]),
              signal: abortController.signal
            });
            
            console.log('[Tracker] Response status:', response.status);
            const data = await response.json();
            const result = data.results?.[0];
            
            if (result) {
              results.push(result);
              if (result.status === 200 || result.status === 201) {
                succeeded++;
                console.log('[Tracker]', trade.ticker, 'succeeded');
              } else {
                failed++;
                console.log('[Tracker]', trade.ticker, 'failed:', result.error);
              }
            }
          } catch (error) {
            console.error('[Tracker] Fetch error:', error);
            if (error.name === 'AbortError') break;
            results.push({
              index: i,
              status: 500,
              trade,
              error: { code: 'NETWORK_ERROR', message: error.message }
            });
            failed++;
          }
          
          updateProgress(i + 1, total, succeeded, skipped, failed);
        }
        
        if (!isCancelled) {
          showResults({ results, summary: { total: parsedTrades.length, succeeded, skipped, failed } });
          showToast(\`처리 완료: \${succeeded}건 성공, \${skipped}건 스킵, \${failed}건 실패\`, succeeded > 0 ? 'success' : 'error');
        } else {
          showResults({ results, summary: { total: results.length, succeeded, skipped, failed } });
        }
      } catch (error) {
        showToast('요청 실패: ' + error.message, 'error');
      } finally {
        loadingOverlay.classList.remove('show');
        isCancelled = false;
        abortController = null;
      }
    }
    
    // Show check-only results (when all trades are skipped)
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
      
      // Count by type
      let skippedCount = 0, errorCount = 0;
      results.forEach(r => {
        if (r.skipped) skippedCount++;
        else errorCount++;
      });
      
      document.getElementById('resultTotal').textContent = results.length;
      document.getElementById('resultSuccess').textContent = 0;
      document.getElementById('resultUpdated').textContent = 0;
      document.getElementById('resultSkipped').textContent = skippedCount;
      document.getElementById('resultFailed').textContent = errorCount;
      
      // Reset filter
      currentFilter = 'all';
      document.querySelectorAll('.result-stat').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === 'all');
      });
      document.getElementById('filterHint').style.display = 'none';
      
      renderResultItems(results);
    }
    
    // Store all results for filtering
    let allResults = [];
    let currentFilter = 'all';
    
    // Classify result type
    function classifyResult(r) {
      if (r.skipped) return 'skipped';
      if (r.status === 200 || r.status === 201) {
        // Check if it was an update (date adjusted or partial update)
        if (r.data?.meta?.dateAdjusted || r.updated) {
          return 'updated';
        }
        return 'success';
      }
      return 'error';
    }
    
    // Filter results
    function filterResults(filter) {
      currentFilter = filter;
      
      // Update active state on stats
      document.querySelectorAll('.result-stat').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === filter);
      });
      
      // Show/hide filter hint
      const filterHint = document.getElementById('filterHint');
      const filterLabel = document.getElementById('filterLabel');
      if (filter === 'all') {
        filterHint.style.display = 'none';
      } else {
        filterHint.style.display = 'block';
        const labels = { success: '성공', updated: '업데이트', skipped: '스킵', error: '실패' };
        filterLabel.textContent = labels[filter] || filter;
      }
      
      // Filter and render
      const filtered = filter === 'all' 
        ? allResults 
        : allResults.filter(r => classifyResult(r) === filter);
      
      renderResultItems(filtered);
    }
    window.filterResults = filterResults;
    
    // Toggle result item expansion
    function toggleResultItem(element) {
      element.classList.toggle('expanded');
    }
    window.toggleResultItem = toggleResultItem;
    
    // Render result items
    function renderResultItems(results) {
      const detailsHtml = results.map((r, idx) => {
        const type = classifyResult(r);
        const trade = r.trade || {};
        const icons = { success: '✅', updated: '🔄', skipped: '⏭️', error: '❌' };
        const icon = icons[type] || '❓';
        
        // Build details content
        let detailsContent = '';
        
        // Status info
        detailsContent += '<div class="detail-row"><span class="detail-label">상태</span><span class="detail-value ' + type + '">' + 
          (type === 'success' ? '성공' : type === 'updated' ? '업데이트됨' : type === 'skipped' ? '스킵됨' : '실패') + '</span></div>';
        
        // HTTP Status
        if (r.status) {
          detailsContent += '<div class="detail-row"><span class="detail-label">HTTP 상태</span><span class="detail-value">' + r.status + '</span></div>';
        }
        
        // Date adjustment info
        if (r.data?.meta?.dateAdjusted) {
          detailsContent += '<div class="detail-row"><span class="detail-label">날짜 조정</span><span class="detail-value warning">예 (' + r.data.meta.adjustmentReason + ')</span></div>';
          detailsContent += '<div class="detail-row"><span class="detail-label">원래 날짜</span><span class="detail-value">' + r.data.meta.originalPurchaseDate + '</span></div>';
          detailsContent += '<div class="detail-row"><span class="detail-label">조정된 날짜</span><span class="detail-value">' + r.data.meta.adjustedPurchaseDate + '</span></div>';
          if (r.data.meta.weekendRecommendation) {
            detailsContent += '<div class="detail-row"><span class="detail-label">주말 추천</span><span class="detail-value warning">예 (필터링 대상)</span></div>';
          }
        }
        
        // Skip/Error reason
        if (r.message) {
          detailsContent += '<div class="detail-row"><span class="detail-label">사유</span><span class="detail-value">' + r.message + '</span></div>';
        }
        if (r.error) {
          detailsContent += '<div class="detail-row"><span class="detail-label">오류 코드</span><span class="detail-value error">' + (r.error.code || 'UNKNOWN') + '</span></div>';
          detailsContent += '<div class="detail-row"><span class="detail-label">오류 메시지</span><span class="detail-value error">' + (r.error.message || '-') + '</span></div>';
        }
        
        // Price info (for success/updated)
        if (r.data?.currentPrice) {
          detailsContent += '<div class="detail-row"><span class="detail-label">현재가</span><span class="detail-value">$' + r.data.currentPrice.toFixed(2) + '</span></div>';
        }
        
        // Price history summary
        if (r.data?.priceHistory) {
          const filledCount = r.data.priceHistory.filter(p => p && (p.close || p.price)).length;
          detailsContent += '<div class="detail-row"><span class="detail-label">가격 이력</span><span class="detail-value">' + filledCount + '/14 일 수집됨</span></div>';
        }
        
        // Returns summary (Pure returns only - Cap is calculated dynamically in Dashboard)
        if (r.data?.returns) {
          detailsContent += '<div class="detail-row" style="margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px;"><span class="detail-label" style="font-weight: 600;">📊 수익률 (순수)</span><span class="detail-value"></span></div>';
          
          const pureD7 = r.data.returns[6]?.cumulativeReturn;
          const pureD14 = r.data.returns[13]?.cumulativeReturn;
          const formatPct = (v) => v !== null && v !== undefined ? (v * 100).toFixed(2) + '%' : '-';
          const getClass = (v) => v >= 0 ? 'success' : 'error';
          detailsContent += '<div class="detail-row"><span class="detail-label">D+7</span><span class="detail-value ' + getClass(pureD7) + '">' + formatPct(pureD7) + '</span></div>';
          detailsContent += '<div class="detail-row"><span class="detail-label">D+14</span><span class="detail-value ' + getClass(pureD14) + '">' + formatPct(pureD14) + '</span></div>';
          
          detailsContent += '<div class="detail-row" style="margin-top: 4px;"><span class="detail-label" style="color: var(--text-muted); font-size: 0.75rem;">💡 Cap 적용 수익률은 Dashboard에서 확인하세요</span></div>';
        }
        
        return \`
          <div class="result-item \${type}" onclick="toggleResultItem(this)" data-type="\${type}">
            <div class="result-item-header">
              <span class="status-icon">\${icon}</span>
              <div class="trade-info">
                \${trade.position || '-'} | \${trade.modelName || '-'} | \${trade.ticker || '-'} | \${trade.purchaseDate || '-'}
              </div>
              <span class="expand-icon">▼</span>
            </div>
            <div class="result-item-details">
              \${detailsContent}
            </div>
          </div>
        \`;
      }).join('');
      
      document.getElementById('resultsDetails').innerHTML = detailsHtml || '<p class="preview-empty">결과 없음</p>';
    }
    
    // Show Results
    function showResults(data) {
      resultsSection.classList.add('show');
      
      const results = data.results || [];
      allResults = results;
      
      // Count by type
      let successCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0;
      results.forEach(r => {
        const type = classifyResult(r);
        if (type === 'success') successCount++;
        else if (type === 'updated') updatedCount++;
        else if (type === 'skipped') skippedCount++;
        else errorCount++;
      });
      
      document.getElementById('resultTotal').textContent = results.length;
      document.getElementById('resultSuccess').textContent = successCount;
      document.getElementById('resultUpdated').textContent = updatedCount;
      document.getElementById('resultSkipped').textContent = skippedCount;
      document.getElementById('resultFailed').textContent = errorCount;
      
      // Reset filter to all
      currentFilter = 'all';
      document.querySelectorAll('.result-stat').forEach(el => {
        el.classList.toggle('active', el.dataset.filter === 'all');
      });
      document.getElementById('filterHint').style.display = 'none';
      
      renderResultItems(results);
    }
    
    // Clear
    clearBtn.addEventListener('click', () => {
      textInput.value = '';
      fileInput.value = '';
      fileInfo.classList.remove('show');
      updatePreview([]);
      resultsSection.classList.remove('show');
    });
    
    // Utils
    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }
    
    function showToast(message, type = 'success') {
      toast.textContent = message;
      toast.className = 'toast show ' + type;
      setTimeout(() => { toast.className = 'toast'; }, 4000);
    }
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

