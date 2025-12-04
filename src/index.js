import 'dotenv/config';
import express from 'express';
import getEvent from './api/endpoints/getEvent.js';
import getEventLatest from './api/endpoints/getEventLatest.js';
import getValuation from './api/endpoints/getValuation.js';
import refreshAnalystLog from './api/endpoints/refreshAnalystLog.js';
import generateRating from './api/endpoints/generateRating.js';
import homePage from './api/endpoints/home.js';
import apiGuide from './api/endpoints/apiGuide.js';
import controlPage, { saveConfigHandler, saveEnvVarsHandler, getEnvVarHandler } from './api/endpoints/control.js';
import priceTrackerHandler, { priceTrackerCheckHandler } from "./api/endpoints/priceTracker.js";
import trackedPriceHandler from './api/endpoints/trackedPrice.js';
import trackerPage from './api/endpoints/tracker.js';
import proceedingPage from './api/endpoints/proceeding.js';
import dashboardPage, { dashboardDataHandler } from './api/endpoints/dashboard.js';
import { registerPatternEndpoint } from './api/endpoints/pattern.js';
import {
  symbolCacheHandler,
  refreshSymbolCacheHandler,
  symbolSearchHandler,
  symbolStatsHandler,
  symbolCheckHandler
} from './api/endpoints/symbolCache.js';
import { loginPage, signupPage, handleLogin, handleSignup, handleLogout } from './api/endpoints/auth.js';
import { requireAuth, redirectIfAuthenticated, attachUserIfAuthenticated } from './middleware/auth.js';
import logger from './api/middleware/logger.js';
import errorHandler from './api/middleware/errorHandler.js';
import { initScheduler } from './services/scheduler.js';
import { initializeHolidays, updateHolidaysFromAPI } from './services/tradingDayService.js';
import { loadEncryptedEnvToProcess } from './lib/envEncryption.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data parsing
app.use(express.text({ type: "text/plain" }));
app.use(logger);

// ==================== PUBLIC ROUTES ====================
// Root endpoint - Home Page (attach user if authenticated)
app.get('/', attachUserIfAuthenticated, homePage);

// API Guide (attach user if authenticated)
app.get('/apiguide', attachUserIfAuthenticated, apiGuide);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================
// Login page (redirect to home if already logged in)
app.get('/auth/login', redirectIfAuthenticated, loginPage);
app.post('/auth/login', handleLogin);

// Signup page (redirect to home if already logged in)
app.get('/auth/signup', redirectIfAuthenticated, signupPage);
app.post('/auth/signup', handleSignup);

// Logout
app.get('/auth/logout', handleLogout);
app.post('/auth/logout', handleLogout);

// ==================== PROTECTED API ENDPOINTS ====================
// Require authentication for all API endpoints
app.get('/getEvent', requireAuth, getEvent);
app.get('/getEventLatest', requireAuth, getEventLatest);
app.get('/getValuation', requireAuth, getValuation);
app.get('/refreshAnalystLog', requireAuth, refreshAnalystLog);
app.get('/generateRating', requireAuth, generateRating);

// ==================== PROTECTED PRICE TRACKER ENDPOINTS ====================
app.post('/priceTracker', requireAuth, priceTrackerHandler);
app.post('/priceTracker/check', requireAuth, priceTrackerCheckHandler);
app.get('/trackedPrice', requireAuth, trackedPriceHandler);
app.get('/tracker', requireAuth, trackerPage);
app.get('/proceeding', requireAuth, proceedingPage);

// ==================== PROTECTED DASHBOARD & ANALYTICS ====================
app.get('/dashboard', requireAuth, dashboardPage);
app.get('/dashboard/data', requireAuth, dashboardDataHandler);

// Pattern Analysis Dashboard (requires auth)
registerPatternEndpoint(app, requireAuth);

// ==================== PROTECTED SYMBOL CACHE ENDPOINTS ====================
app.get('/symbolCache', requireAuth, symbolCacheHandler);
app.get('/symbolCache/search', requireAuth, symbolSearchHandler);
app.get('/symbolCache/stats', requireAuth, symbolStatsHandler);
app.get('/symbolCache/check/:ticker', requireAuth, symbolCheckHandler);
app.get('/refreshSymbolCache', requireAuth, refreshSymbolCacheHandler);

// ==================== PROTECTED CONTROL PANEL ====================
app.get('/control', requireAuth, controlPage);
app.post('/control/save', requireAuth, saveConfigHandler);
app.post('/control/saveEnvVars', requireAuth, saveEnvVarsHandler);
app.get('/control/getEnvVar', requireAuth, getEnvVarHandler);
app.post('/control/updateHolidays', requireAuth, async (req, res) => {
  try {
    const result = await updateHolidaysFromAPI();
    if (result.success) {
      res.json({ success: true, count: result.count });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server with async initialization
async function startServer() {
  // Load encrypted environment variables (overwrites .env values)
  try {
    const loadedVars = await loadEncryptedEnvToProcess(true);
    if (Object.keys(loadedVars).length > 0) {
      console.log(`[Startup] Loaded ${Object.keys(loadedVars).length} encrypted environment variables`);
    }
  } catch (error) {
    console.warn('[Startup] Failed to load encrypted environment variables:', error.message);
  }

const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /getEvent?startDate={N}&endDate={N}`);
  console.log(`      - Returns JSON by default (browser-friendly)`);
  console.log(`      - Add &format=ndjson for NDJSON streaming`);
  console.log(`  GET /getEventLatest`);
  console.log(`      - Returns cached event data as JSON`);
  console.log(`  GET /getValuation?tickers={TICKER1,TICKER2}&cache={true|false}`);
  console.log(`      - Returns valuation metrics as JSON`);
  console.log(`  GET /refreshAnalystLog?tickers={AAPL,MSFT}&generateRating={false}&test={true}`);
  console.log(`      - Manually refresh analyst log cache with priceTrend data`);
  console.log(`      - Generates rating by default`);
  console.log(`      - Use tickers param for specific tickers, test=true for top 10 only`);
  console.log(`  GET /generateRating`);
  console.log(`      - Generate analyst rating from existing analyst log (no API calls)`);
    console.log(`  GET /symbolCache - View cached symbols (with filters)`);
    console.log(`  GET /refreshSymbolCache - Force refresh symbol cache`);
    console.log(`  GET /symbolCache/search?q={query} - Search symbols`);
    console.log(`  GET /symbolCache/stats - Symbol cache statistics`);
    console.log(`  GET /symbolCache/check/{ticker} - Check if ticker exists`);
    console.log(`  GET /dashboard - Trade analytics dashboard`);
    console.log(`  GET /pattern - Pattern analysis dashboard`);

    // Initialize market holidays from FMP API
    try {
      await initializeHolidays();
    } catch (error) {
      console.error('[Startup] Failed to initialize holidays:', error.message);
    }

  // Initialize scheduler after server starts
  initScheduler();
});
}

startServer();

// Export for manual holiday update (can be called from control panel)
export { updateHolidaysFromAPI };
