/**
 * Calculate percentile of an array of values using linear interpolation
 *
 * @param {number[]} values - Array of numeric values
 * @param {number} p - Percentile to calculate (0-100)
 * @returns {number|null} The percentile value, or null if array is empty
 *
 * @example
 * percentile([10, 20, 30, 40, 50], 20) // Returns 18 (20th percentile)
 * percentile([10, 20, 30, 40, 50], 5)  // Returns 12 (5th percentile)
 */
export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  if (values.length === 1) {
    return values[0];
  }

  // Sort values ascending
  const sorted = [...values].sort((a, b) => a - b);

  // Calculate index with linear interpolation
  const index = (sorted.length - 1) * (p / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  // Linear interpolation between lower and upper
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
