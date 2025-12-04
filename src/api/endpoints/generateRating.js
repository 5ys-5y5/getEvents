// GET /generateRating - Generate analyst rating from existing analyst log
// This endpoint uses the DB analyst_records table to generate ratings
// without making additional API calls

import { generateAnalystRating } from '../../services/analystCacheManager.js';
import { getCurrentTimestampISO } from '../../lib/dateUtils.js';
import { clearPatternCache } from './pattern.js';

const generateRatingEndpoint = async (req, res) => {
  const requestStartTime = Date.now();

  try {
    console.log('Generating analyst rating from existing analyst log...');
    const ratingResult = await generateAnalystRating();

    if (!ratingResult.success) {
      return res.status(500).json({
        error: ratingResult.error || 'Failed to generate analyst rating',
        statusCode: 500,
        duration: `${Date.now() - requestStartTime}ms`,
        timestamp: getCurrentTimestampISO()
      });
    }

    // Clear pattern cache since analyst data has been updated
    clearPatternCache();
    console.log('[generateRating] Pattern cache cleared');

    res.json({
      message: 'Analyst rating generated successfully',
      analystRating: ratingResult.meta,
      duration: `${Date.now() - requestStartTime}ms`,
      timestamp: getCurrentTimestampISO()
    });

  } catch (error) {
    console.error(JSON.stringify({
      type: 'generateRating_error',
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

export default generateRatingEndpoint;
