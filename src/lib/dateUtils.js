// UTC date calculations, ISO 8601 formatting
// Per FR-023: All date calculations must be in UTC

import { addDays, formatISO, parseISO } from 'date-fns';

/**
 * Get current date in UTC
 * @returns {Date} Current date in UTC
 */
export function getTodayUTC() {
  // Get current date in UTC timezone
  const now = new Date();
  // Create a new date using UTC values
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
}

/**
 * Convert natural number (days from today) to ISO 8601 date string
 * Per FR-024: Convert startDate, endDate to YYYY-MM-DD format
 *
 * @param {number} daysFromToday - Natural number representing days from today
 * @returns {string} ISO 8601 date string (YYYY-MM-DD)
 */
export function daysFromTodayToISO(daysFromToday) {
  const today = getTodayUTC();
  const targetDate = addDays(today, daysFromToday);
  return formatISO(targetDate, { representation: 'date' });
}

/**
 * Validate that a value is a natural number (positive integer)
 * Per FR-002: startDate, endDate must be natural numbers
 *
 * @param {any} value - Value to validate
 * @returns {boolean} True if value is a natural number
 */
export function isNaturalNumber(value) {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
}

/**
 * Validate date range parameters
 * Per FR-002: startDate <= endDate
 *
 * @param {number} startDate - Start date as days from today
 * @param {number} endDate - End date as days from today
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateDateRange(startDate, endDate) {
  if (!isNaturalNumber(startDate)) {
    return { valid: false, error: 'startDate must be a natural number (0 or positive integer)' };
  }

  if (!isNaturalNumber(endDate)) {
    return { valid: false, error: 'endDate must be a natural number (0 or positive integer)' };
  }

  const start = Number(startDate);
  const end = Number(endDate);

  if (start > end) {
    return { valid: false, error: 'startDate must be less than or equal to endDate' };
  }

  return { valid: true };
}

/**
 * Get ISO 8601 timestamp for current time
 * @returns {string} ISO 8601 timestamp
 */
export function getCurrentTimestampISO() {
  return new Date().toISOString();
}

/**
 * Calculate date N days after a given date
 *
 * @param {string} dateStr - ISO 8601 date string
 * @param {number} daysToAdd - Number of days to add
 * @returns {string} ISO 8601 date string
 */
export function addDaysToDate(dateStr, daysToAdd) {
  const date = parseISO(dateStr);
  const newDate = addDays(date, daysToAdd);
  return formatISO(newDate, { representation: 'date' });
}
