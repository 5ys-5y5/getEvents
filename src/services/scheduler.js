// Scheduler service for automated tasks
// Runs daily analyst log refresh at midnight ET

import cron from 'node-cron';
import { refreshAnalystLog, generateAnalystRating } from './analystCacheManager.js';

/**
 * Initialize scheduled tasks
 * - Analyst log refresh: Daily at midnight ET
 */
export function initScheduler() {
  // Run at midnight ET every day (00:00)
  // Cron expression: 'minute hour * * *'
  cron.schedule('0 0 * * *', async () => {
    const startTime = new Date().toISOString();
    console.log(`[Scheduler] Starting analyst log refresh at ${startTime}`);

    try {
      // Refresh analyst log
      const logResult = await refreshAnalystLog();

      if (logResult.success) {
        console.log(`[Scheduler] Analyst log refresh completed successfully`);
        console.log(`[Scheduler] - Tickers: ${logResult.meta.tickerCount}`);
        console.log(`[Scheduler] - Total analysts: ${logResult.meta.totalAnalysts}`);
        console.log(`[Scheduler] - Duration: ${logResult.meta.duration}`);

        // Generate analyst rating from refreshed log
        const ratingResult = await generateAnalystRating();

        if (ratingResult.success) {
          console.log(`[Scheduler] Analyst rating generation completed successfully`);
          console.log(`[Scheduler] - Unique analysts: ${ratingResult.meta.analystCount}`);
          console.log(`[Scheduler] - Duration: ${ratingResult.meta.duration}`);
        } else {
          console.error(`[Scheduler] Analyst rating generation failed: ${ratingResult.error}`);
        }
      } else {
        console.error(`[Scheduler] Analyst log refresh failed`);
      }
    } catch (error) {
      console.error(`[Scheduler] Error during scheduled analyst refresh:`, error.message);
      console.error(error.stack);
    }

    const endTime = new Date().toISOString();
    console.log(`[Scheduler] Scheduled task completed at ${endTime}`);
  }, {
    scheduled: true,
    timezone: "America/New_York"
  });

  console.log('[Scheduler] Initialized - analyst log will refresh daily at midnight ET');
}

export default {
  initScheduler
};
