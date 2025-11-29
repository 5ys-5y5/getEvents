/**
 * Trading Calendar - NYSE Holiday Handling
 *
 * Implements trading day logic for US stock market with NYSE holiday calendar.
 * Update US_MARKET_HOLIDAYS annually in January.
 *
 * Source: https://www.nyse.com/markets/hours-calendars
 */

import { format, addDays } from 'date-fns';

/**
 * NYSE Market Holidays for 2025
 * Update this list annually in January
 */
export const US_MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

/**
 * Check if a given date is a non-trading day (weekend or holiday)
 *
 * @param {Date} date - Date to check
 * @returns {boolean} True if non-trading day (weekend or holiday)
 *
 * @example
 * isNonTradingDay(new Date('2025-11-27')) // true (Thanksgiving)
 * isNonTradingDay(new Date('2025-11-28')) // false (Friday, day after Thanksgiving)
 * isNonTradingDay(new Date('2025-11-29')) // true (Saturday)
 */
export function isNonTradingDay(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid date provided to isNonTradingDay');
  }

  const dayOfWeek = date.getDay();

  // Weekend check (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Holiday check
  const dateStr = format(date, 'yyyy-MM-dd');
  return US_MARKET_HOLIDAYS_2025.includes(dateStr);
}

/**
 * Get the next trading day after a given date
 *
 * @param {Date} date - Starting date
 * @param {number} maxDays - Maximum days to search ahead (default: 7)
 * @returns {Date|null} Next trading day, or null if none found within maxDays
 *
 * @example
 * getNextTradingDay(new Date('2025-11-27')) // Returns 2025-11-28 (Friday after Thanksgiving)
 * getNextTradingDay(new Date('2025-11-28')) // Returns 2025-12-01 (Monday after weekend)
 */
export function getNextTradingDay(date, maxDays = 7) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid date provided to getNextTradingDay');
  }

  let current = addDays(date, 1);
  let attempts = 0;

  while (isNonTradingDay(current) && attempts < maxDays) {
    current = addDays(current, 1);
    attempts++;
  }

  // Return null if no trading day found within maxDays
  // This triggers meta.missingDates logging per FR-033
  if (attempts >= maxDays) {
    return null;
  }

  return current;
}

/**
 * Check if a given date is a trading day
 *
 * @param {Date} date - Date to check
 * @returns {boolean} True if trading day
 */
export function isTradingDay(date) {
  return !isNonTradingDay(date);
}
