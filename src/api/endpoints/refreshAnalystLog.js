// GET /refreshAnalystLog - Refresh analyst log cache
// Manual trigger endpoint for analyst data refresh

import { refreshAnalystLog, generateAnalystRating } from '../../services/analystCacheManager.js';
import { getCurrentTimestampISO } from '../../lib/dateUtils.js';

const refreshAnalystLogEndpoint = async (req, res) => {
  const requestStartTime = Date.now();
  const { generateRating, test, tickers, priceTarget, frame, quote } = req.query;

  try {
    // Parse tickers parameter (comma-separated)
    const tickerArray = tickers ? tickers.split(',').map(t => t.trim().toUpperCase()) : null;

    // Refresh analyst log
    console.log('Refreshing analyst log via API endpoint...');
    const logResult = await refreshAnalystLog({
      testMode: test === 'true',
      tickers: tickerArray,
      priceTarget: priceTarget === 'true',
      frame: frame === 'true',
      quote: quote === 'true'
    });

    if (!logResult.success) {
      return res.status(500).json({
        error: 'Failed to refresh analyst log',
        statusCode: 500
      });
    }

    let ratingResult = null;

    // Generate analyst rating by default (unless explicitly disabled with generateRating=false)
    if (generateRating !== 'false') {
      console.log('Generating analyst rating...');
      ratingResult = await generateAnalystRating();

      if (!ratingResult.success) {
        return res.json({
          message: 'Analyst log refreshed successfully, but rating generation failed',
          analystLog: logResult.meta,
          analystRating: {
            error: ratingResult.error
          },
          duration: `${Date.now() - requestStartTime}ms`,
          timestamp: getCurrentTimestampISO()
        });
      }
    }

    res.json({
      message: 'Analyst log refreshed successfully',
      steps: logResult.steps || [],
      analystRating: ratingResult ? ratingResult.meta : null,
      duration: `${Date.now() - requestStartTime}ms`,
      timestamp: getCurrentTimestampISO()
    });

  } catch (error) {
    console.error(JSON.stringify({
      type: 'refreshAnalystLog_error',
      error: error.message,
      stack: error.stack,
      timestamp: getCurrentTimestampISO()
    }));

    res.status(500).json({
      error: error.message || 'Internal server error',
      statusCode: 500
    });
  }
};

export default refreshAnalystLogEndpoint;
