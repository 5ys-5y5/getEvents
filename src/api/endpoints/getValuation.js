// GET /getValuation - valuation metrics
// Per FR-011 to FR-022: Calculate quantitative and qualitative valuation

import { getCurrentTimestampISO } from '../../lib/dateUtils.js';
import { loadEventCache } from '../../services/cacheManager.js';
import { calculateQuantitativeValuation } from '../../services/valuationCalculator.js';
import { calculateQualitativeValuation } from '../../services/qualitativeCalculator.js';
import { getCurrentPrice } from '../../services/priceService.js';
import { calculatePeerQuantitative } from '../../services/peerEvaluationService.js';

const getValuation = async (req, res) => {
  const { tickers, cache } = req.query;
  const requestStartTime = Date.now();
  const collectionErrorChecklist = { status: [] };

  try {
    let tickerList = [];

    // Per FR-012, FR-033: Parameter validation
    if (cache === 'true') {
      // Per FR-013: Use event cache to get ticker list
      const cacheResult = await loadEventCache();

      if (!cacheResult.success) {
        // Cache not available for cache=true mode
        return res.status(400).json({
          error: 'cache=true requires valid event cache. Please call GET /getEvent first.',
          errorCode: 'EVENT_CACHE_REQUIRED',
          statusCode: 400
        });
      }

      // Extract unique tickers from cached events
      const uniqueTickers = new Set(
        cacheResult.data.events.map(event => event.ticker)
      );
      tickerList = Array.from(uniqueTickers);

    } else if (cache === 'false' || cache === undefined) {
      // Per FR-012: Require tickers parameter when cache=false
      if (!tickers) {
        return res.status(400).json({
          error: 'tickers parameter is required when cache=false',
          errorCode: 'TICKERS_REQUIRED',
          statusCode: 400
        });
      }

      // Parse comma-separated tickers
      tickerList = tickers.split(',').map(t => t.trim()).filter(t => t.length > 0);

      if (tickerList.length === 0) {
        return res.status(400).json({
          error: 'tickers parameter must contain at least one valid ticker',
          statusCode: 400
        });
      }

    } else {
      // Per FR-033: Both cache and tickers missing or invalid cache value
      return res.status(400).json({
        error: 'Either provide tickers parameter with cache=false, or use cache=true',
        statusCode: 400
      });
    }

    // Calculate valuations for each ticker
    const valuations = [];

    for (const ticker of tickerList) {
      try {
        // Get current price
        const priceResult = await getCurrentPrice(ticker);

        // Calculate quantitative metrics
        const quantitativeResult = await calculateQuantitativeValuation(ticker);

        // Calculate qualitative metrics
        const qualitativeResult = await calculateQualitativeValuation(ticker);

        // Calculate peer quantitative metrics
        const peerResult = await calculatePeerQuantitative(ticker);

        // Combine all errors
        const tickerErrors = [
          ...(priceResult.error ? [priceResult.error] : []),
          ...quantitativeResult.errors,
          ...qualitativeResult.errors,
          ...(peerResult.error ? [peerResult.error] : []),
          ...(peerResult.errors ? peerResult.errors : [])
        ];

        if (tickerErrors.length > 0) {
          collectionErrorChecklist.status.push(...tickerErrors);
        }

        valuations.push({
          ticker,
          price: priceResult.price,
          quantitative: quantitativeResult.metrics,
          peerQuantitative: peerResult.peerQuantitative,
          qualitative: qualitativeResult.metrics,
          metadata: {
            calculatedAt: getCurrentTimestampISO()
          }
        });

      } catch (error) {
        // Log error but continue with other tickers
        console.error(JSON.stringify({
          type: 'valuation_ticker_error',
          ticker,
          error: error.message,
          timestamp: getCurrentTimestampISO()
        }));

        collectionErrorChecklist.status.push({
          serviceId: 'valuation-calculator',
          ticker,
          errorMessage: error.message,
          timestamp: getCurrentTimestampISO()
        });

        // Add placeholder valuation for failed ticker
        valuations.push({
          ticker,
          price: null,
          quantitative: null,
          peerQuantitative: null,
          qualitative: null,
          metadata: {
            calculatedAt: getCurrentTimestampISO(),
            error: error.message
          }
        });
      }
    }

    const response = {
      meta: {
        type: 'valuation',
        request: {
          cache: cache === 'true',
          tickers: cache === 'true' ? undefined : tickerList,
          tickerCount: tickerList.length
        },
        response: {
          valuationCount: valuations.length,
          duration: `${Date.now() - requestStartTime}ms`,
          timestamp: getCurrentTimestampISO()
        },
        collectionErrorChecklist
      },
      valuations
    };

    res.json(response);

  } catch (error) {
    console.error(JSON.stringify({
      type: 'getValuation_error',
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

export default getValuation;
