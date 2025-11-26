import 'dotenv/config';
import express from 'express';
import getEvent from './api/endpoints/getEvent.js';
import getEventLatest from './api/endpoints/getEventLatest.js';
import getValuation from './api/endpoints/getValuation.js';
import refreshAnalystLog from './api/endpoints/refreshAnalystLog.js';
import generateRating from './api/endpoints/generateRating.js';
import logger from './api/middleware/logger.js';
import errorHandler from './api/middleware/errorHandler.js';
import { initScheduler } from './services/scheduler.js';

const app = express();

// Middleware
app.use(express.json());
app.use(logger);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/getEvent', getEvent);
app.get('/getEventLatest', getEventLatest);
app.get('/getValuation', getValuation);
app.get('/refreshAnalystLog', refreshAnalystLog);
app.get('/generateRating', generateRating);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
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

  // Initialize scheduler after server starts
  initScheduler();
});
