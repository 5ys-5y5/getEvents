// API response to internal schema transformation
// Per FR-027: Generalized field mapping loop

/**
 * Normalize API response to internal event schema
 * Per FR-027: Use generalized loop for fieldMap (no hardcoded branches)
 *
 * @param {Array} apiData - Raw API response data
 * @param {Object} fieldMap - Field mapping configuration
 * @param {string} source - Event source identifier
 * @returns {Array} Normalized event records
 */
export function normalizeEvents(apiData, fieldMap, source) {
  if (!Array.isArray(apiData)) {
    return [];
  }

  return apiData.map(item => {
    const normalized = { source };

    // Per FR-027: Generalized loop over fieldMap
    for (const [localKey, remoteKey] of Object.entries(fieldMap)) {
      normalized[localKey] = item[remoteKey];
    }

    return normalized;
  });
}

/**
 * Remove duplicate events based on (ticker, date, source) combination
 * Per FR-007: Keep only first occurrence of each unique combination
 *
 * @param {Array} events - Array of event records
 * @returns {Array} Deduplicated event records
 */
export function deduplicateEvents(events) {
  const seen = new Set();
  const unique = [];

  for (const event of events) {
    const key = `${event.ticker}|${event.date}|${event.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    }
  }

  return unique;
}

/**
 * Filter events to only include tickers in symbol cache
 * Per FR-006: Exclude events for tickers not in symbolCache
 *
 * @param {Array} events - Array of event records
 * @param {Array} symbols - Array of symbol objects from cache
 * @returns {Array} Filtered event records
 */
export function filterEventsBySymbols(events, symbols) {
  const validTickers = new Set(symbols.map(s => s.ticker));

  return events.filter(event => validTickers.has(event.ticker));
}

export default {
  normalizeEvents,
  deduplicateEvents,
  filterEventsBySymbols
};
