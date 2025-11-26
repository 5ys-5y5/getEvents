// GET /getEvent - NDJSON streaming endpoint
// Per FR-001 to FR-009

import { validateDateRange, daysFromTodayToISO, getCurrentTimestampISO } from '../../lib/dateUtils.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../../lib/configLoader.js';
import { getSymbolCache, saveEventCache } from '../../services/cacheManager.js';
import { fetchApi } from '../../services/fmpClient.js';
import { normalizeEvents, deduplicateEvents, filterEventsBySymbols } from '../../services/eventNormalizer.js';
import { initNDJsonStream, writeNDJsonLine, endNDJsonStream } from '../../lib/ndJsonStreamer.js';

const getEvent = async (req, res) => {
  const { startDate, endDate, format } = req.query;

  // Per FR-002: Validate date range parameters
  const validation = validateDateRange(startDate, endDate);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      statusCode: 400
    });
  }

  // Convert natural numbers to ISO dates
  const fromDate = daysFromTodayToISO(Number(startDate));
  const toDate = daysFromTodayToISO(Number(endDate));

  const requestStartTime = Date.now();
  const collectionErrorChecklist = { status: [] };
  const allEvents = [];

  // Default to JSON format for browser compatibility
  // Only use NDJSON if explicitly requested with format=ndjson
  const useNdjsonFormat = format === 'ndjson';

  try {
    // Per FR-003, FR-004: Get symbol cache (auto-refresh if needed)
    const { symbols, refreshError } = await getSymbolCache();

    if (refreshError) {
      collectionErrorChecklist.status.push(refreshError);
    }

    if (!symbols || symbols.length === 0) {
      // Per FR-029: Critical failure if no symbols available
      return res.status(503).json({
        error: 'Symbol cache is empty and refresh failed',
        statusCode: 503
      });
    }

    // Load API configuration
    const apiList = await loadApiList();
    const fmpApiKey = getFmpApiKey();

    // Per FR-026: Check for API key
    if (!fmpApiKey) {
      collectionErrorChecklist.status.push({
        serviceId: 'all-fmp-services',
        errorMessage: 'FMP_API_KEY environment variable not set',
        timestamp: getCurrentTimestampISO()
      });

      // Per FR-029: Return error if critical service unavailable
      return res.status(500).json({
        error: 'FMP API key not configured',
        statusCode: 500
      });
    }

    // Per FR-005: Call all services under getEvent
    const getEventConfig = apiList.getEvent;

    for (const [eventType, services] of Object.entries(getEventConfig)) {
      for (const [serviceKey, serviceConfig] of Object.entries(services)) {
        const url = buildApiUrl(serviceConfig.API, { fmpApiKey, fromDate, toDate });
        const result = await fetchApi(url, serviceConfig.id);

        if (result.success) {
          // Per FR-027: Normalize using fieldMap
          const normalized = normalizeEvents(
            result.data,
            serviceConfig.fieldMap,
            serviceConfig.id
          );

          allEvents.push(...normalized);
        } else {
          // Per FR-030: Record error but continue streaming
          collectionErrorChecklist.status.push(result.error);
        }
      }
    }

    // Per FR-006: Filter by symbol cache
    let filteredEvents = filterEventsBySymbols(allEvents, symbols);

    // Per FR-007: Deduplicate events
    filteredEvents = deduplicateEvents(filteredEvents);

    // Per FR-001: Write final metaRecord
    const metaRecord = {
      type: 'meta',
      request: {
        startDate: Number(startDate),
        endDate: Number(endDate),
        fromDate,
        toDate
      },
      response: {
        eventCount: filteredEvents.length,
        duration: `${Date.now() - requestStartTime}ms`,
        timestamp: getCurrentTimestampISO()
      },
      collectionErrorChecklist
    };

    // Return format based on query parameter
    if (useNdjsonFormat) {
      // NDJSON stream format (for programmatic use)
      initNDJsonStream(res);

      // Stream each event record
      for (const event of filteredEvents) {
        writeNDJsonLine(res, event);
      }

      writeNDJsonLine(res, metaRecord);
      endNDJsonStream(res);
    } else {
      // Regular JSON format (default for browser viewing)
      res.json({
        meta: metaRecord,
        events: filteredEvents
      });
    }

    // Per FR-008: Save to event cache
    await saveEventCache(metaRecord, filteredEvents);

  } catch (error) {
    console.error(JSON.stringify({
      type: 'getEvent_error',
      error: error.message,
      stack: error.stack,
      timestamp: getCurrentTimestampISO()
    }));

    // If stream not started, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || 'Internal server error',
        statusCode: 500
      });
    }

    // If stream already started, just end it
    endNDJsonStream(res);
  }
};

export default getEvent;
