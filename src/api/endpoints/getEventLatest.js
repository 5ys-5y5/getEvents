// GET /getEventLatest - cached data retrieval
// Per FR-009, FR-010: Load cached getEvent results

import { loadEventCache } from '../../services/cacheManager.js';

const getEventLatest = async (req, res) => {
  try {
    // Per FR-009: Load event cache from disk
    const result = await loadEventCache();

    if (!result.success) {
      // Per FR-010: Return appropriate error based on failure reason
      if (result.error === 'GET_EVENT_CACHE_NOT_AVAILABLE') {
        // File doesn't exist - user needs to run getEvent first
        return res.status(404).json({
          error: 'Event cache not available. Please call GET /getEvent first to create cache.',
          errorCode: 'GET_EVENT_CACHE_NOT_AVAILABLE',
          statusCode: 404
        });
      } else {
        // File exists but corrupted (parse error)
        return res.status(503).json({
          error: 'Event cache file is corrupted. Please call GET /getEvent to regenerate cache.',
          errorCode: 'CACHE_FILE_CORRUPTED',
          statusCode: 503
        });
      }
    }

    // Per FR-009: Return cached data as JSON
    // Additional query parameters are ignored per spec
    res.json(result.data);

  } catch (error) {
    console.error(JSON.stringify({
      type: 'getEventLatest_error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }));

    res.status(500).json({
      error: error.message || 'Internal server error',
      statusCode: 500
    });
  }
};

export default getEventLatest;
