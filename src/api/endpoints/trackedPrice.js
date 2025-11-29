/**
 * GET /trackedPrice - Retrieve all tracked trades and model summaries
 * Per US2: Return complete cache with aggregated model performance metrics
 *
 * Fast read-only endpoint (< 100ms for 1MB cache)
 */

import { loadTrackedPriceCache } from '../../services/cacheManager.js';

/**
 * GET /trackedPrice handler
 * Per T034-T035: Load and return complete tracked price cache
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
export async function trackedPriceHandler(req, res) {
  try {
    // Load cache from disk
    const cache = await loadTrackedPriceCache();

    // Return complete cache structure
    return res.status(200).json({
      meta: cache.meta,
      trades: cache.trades,
      modelSummaries: cache.modelSummaries
    });

  } catch (error) {
    console.error('trackedPrice endpoint error:', error);

    // Check for specific error types
    if (error.message.includes('Cache file not found')) {
      return res.status(404).json({
        error: {
          code: 'CACHE_NOT_FOUND',
          message: 'Tracked price cache has not been initialized. Register trades via POST /priceTracker first.'
        }
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    });
  }
}

export default trackedPriceHandler;
