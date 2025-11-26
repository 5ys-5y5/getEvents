// Valuation calculation helpers
// Per evMethod.json aggregation definitions

/**
 * TTM calculation from quarterly data
 * Per FR-015: Sum if 4 values, else (average * 4)
 *
 * @param {number[]} values - Quarterly values (most recent first)
 * @returns {number|null} TTM value
 */
export function ttmFromQuarterSumOrScaled(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));

  if (validValues.length === 0) {
    return null;
  }

  if (validValues.length === 4) {
    // Sum all 4 quarters
    return validValues.reduce((sum, val) => sum + val, 0);
  } else {
    // Average * 4
    const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    return avg * 4;
  }
}

/**
 * Average from quarterly data
 *
 * @param {number[]} values - Quarterly values
 * @returns {number|null} Average value
 */
export function avgFromQuarter(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));

  if (validValues.length === 0) {
    return null;
  }

  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}

/**
 * Get latest (most recent) value from quarterly data
 *
 * @param {number[]} values - Quarterly values (most recent first)
 * @returns {number|null} Latest value
 */
export function lastFromQuarter(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  // Return first non-null value
  const validValue = values.find(v => v !== null && v !== undefined && !isNaN(v));
  return validValue !== undefined ? validValue : null;
}

/**
 * Calculate YoY growth rate
 *
 * @param {number[]} values - Quarterly values (most recent first, need at least 4)
 * @returns {number|null} YoY growth rate
 */
export function yoyFromQuarter(values) {
  if (!Array.isArray(values) || values.length < 4) {
    return null;
  }

  const current = values[0];
  const yearAgo = values[3];

  if (current === null || current === undefined || isNaN(current) ||
      yearAgo === null || yearAgo === undefined || isNaN(yearAgo)) {
    return null;
  }

  if (yearAgo === 0) {
    return null;
  }

  return (current - yearAgo) / yearAgo;
}

/**
 * Calculate QoQ growth rate
 *
 * @param {number[]} values - Quarterly values (most recent first, need at least 2)
 * @returns {number|null} QoQ growth rate
 */
export function qoqFromQuarter(values) {
  if (!Array.isArray(values) || values.length < 2) {
    return null;
  }

  const current = values[0];
  const lastQuarter = values[1];

  if (current === null || current === undefined || isNaN(current) ||
      lastQuarter === null || lastQuarter === undefined || isNaN(lastQuarter)) {
    return null;
  }

  if (lastQuarter === 0) {
    return null;
  }

  return (current - lastQuarter) / lastQuarter;
}

/**
 * Calculate average consensus
 *
 * @param {number[]} values - Values to average
 * @returns {number|null} Average
 */
export function avgConsensus(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));

  if (validValues.length === 0) {
    return null;
  }

  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
}

/**
 * Apply aggregation function by ID
 *
 * @param {string} aggregationId - Aggregation function ID
 * @param {number[]} values - Values to aggregate
 * @returns {number|null} Aggregated value
 */
export function applyAggregation(aggregationId, values) {
  switch (aggregationId) {
    case 'ttmFromQuarterSumOrScaled':
      return ttmFromQuarterSumOrScaled(values);
    case 'avgFromQuarter':
      return avgFromQuarter(values);
    case 'lastFromQuarter':
      return lastFromQuarter(values);
    case 'yoyFromQuarter':
      return yoyFromQuarter(values);
    case 'qoqFromQuarter':
      return qoqFromQuarter(values);
    case 'avgConsensus':
      return avgConsensus(values);
    default:
      console.warn(`Unknown aggregation ID: ${aggregationId}`);
      return null;
  }
}

export default {
  ttmFromQuarterSumOrScaled,
  avgFromQuarter,
  lastFromQuarter,
  yoyFromQuarter,
  qoqFromQuarter,
  avgConsensus,
  applyAggregation
};
