/**
 * Trading Calendar - Market Holiday Handling
 *
 * Implements trading day logic for US stock market.
 * Holidays are loaded from DB (market_holidays table) which is updated daily via FMP API.
 *
 * Source: FMP API https://financialmodelingprep.com/stable/holidays-by-exchange
 */

import { format, addDays } from 'date-fns';

// In-memory holiday cache (loaded from tradingDayService)
let holidaysSet = new Set();

/**
 * Set holidays cache from external source (tradingDayService)
 * @param {Set<string>} holidays - Set of holiday dates in YYYY-MM-DD format
 */
export function setHolidaysCache(holidays) {
  holidaysSet = holidays;
  console.log(`[TradingCalendar] Holidays cache set with ${holidaysSet.size} dates`);
}

/**
 * Get current holidays cache
 * @returns {Set<string>} Set of holiday dates
 */
export function getHolidaysCache() {
  return holidaysSet;
}

/**
 * Check if a given date is a non-trading day (weekend or holiday)
 *
 * @param {Date} date - Date to check
 * @param {Set<string>} holidays - Optional holidays set (uses cache if not provided)
 * @returns {boolean} True if non-trading day (weekend or holiday)
 *
 * @example
 * isNonTradingDay(new Date('2025-11-27')) // true (Thanksgiving)
 * isNonTradingDay(new Date('2025-11-28')) // false (Friday, day after Thanksgiving)
 * isNonTradingDay(new Date('2025-11-29')) // true (Saturday)
 */
export function isNonTradingDay(date, holidays = null) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid date provided to isNonTradingDay');
  }

  const dayOfWeek = date.getDay();

  // Weekend check (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Holiday check using provided set or cache
  const holidaySet = holidays || holidaysSet;
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidaySet.has(dateStr);
}

/**
 * Get the next trading day after a given date
 *
 * @param {Date} date - Starting date
 * @param {number} maxDays - Maximum days to search ahead (default: 7)
 * @param {Set<string>} holidays - Optional holidays set
 * @returns {Date|null} Next trading day, or null if none found within maxDays
 *
 * @example
 * getNextTradingDay(new Date('2025-11-27')) // Returns 2025-11-28 (Friday after Thanksgiving)
 * getNextTradingDay(new Date('2025-11-28')) // Returns 2025-12-01 (Monday after weekend)
 */
export function getNextTradingDay(date, maxDays = 7, holidays = null) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid date provided to getNextTradingDay');
  }

  let current = addDays(date, 1);
  let attempts = 0;

  while (isNonTradingDay(current, holidays) && attempts < maxDays) {
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
 * Get the N-th trading day from a start date
 * D+1 means the first trading day after startDate
 *
 * @param {Date} startDate - Starting date
 * @param {number} n - Number of trading days to advance (1 = next trading day)
 * @param {Set<string>} holidays - Optional holidays set
 * @returns {Date|null} The N-th trading day, or null if not found within reasonable range
 */
export function getNthTradingDay(startDate, n, holidays = null) {
  if (!(startDate instanceof Date) || isNaN(startDate)) {
    throw new Error('Invalid date provided to getNthTradingDay');
  }

  let current = new Date(startDate);
  let tradingDaysCount = 0;
  const maxIterations = n * 3; // Allow for weekends and holidays
  let iterations = 0;

  while (tradingDaysCount < n && iterations < maxIterations) {
    current = addDays(current, 1);
    iterations++;

    if (!isNonTradingDay(current, holidays)) {
      tradingDaysCount++;
    }
  }

  if (tradingDaysCount < n) {
    return null;
  }

  return current;
}

/**
 * Check if a given date is a trading day
 *
 * @param {Date} date - Date to check
 * @param {Set<string>} holidays - Optional holidays set
 * @returns {boolean} True if trading day
 */
export function isTradingDay(date, holidays = null) {
  return !isNonTradingDay(date, holidays);
}

/**
 * Get the nearest trading day (same day if trading day, otherwise next trading day)
 * Used to adjust non-trading day purchase dates to the nearest valid trading day
 *
 * @param {Date} date - Date to check/adjust
 * @param {number} maxDays - Maximum days to search ahead (default: 7)
 * @param {Set<string>} holidays - Optional holidays set
 * @returns {{adjustedDate: Date, wasAdjusted: boolean, originalDate: Date, reason: string|null}}
 *
 * @example
 * // Saturday -> Monday
 * getNearestTradingDay(new Date('2025-10-04')) 
 * // Returns { adjustedDate: 2025-10-06, wasAdjusted: true, reason: 'weekend' }
 */
export function getNearestTradingDay(date, maxDays = 7, holidays = null) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid date provided to getNearestTradingDay');
  }

  const originalDate = new Date(date);
  
  // If already a trading day, return as-is
  if (!isNonTradingDay(date, holidays)) {
    return {
      adjustedDate: date,
      wasAdjusted: false,
      originalDate,
      reason: null
    };
  }

  // Determine reason for adjustment
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dateStr = format(date, 'yyyy-MM-dd');
  const holidaySet = holidays || holidaysSet;
  const isHoliday = holidaySet.has(dateStr);
  
  let reason = 'non-trading day';
  if (isWeekend) {
    reason = 'weekend';
  } else if (isHoliday) {
    reason = 'market holiday';
  }

  // Find next trading day
  let current = addDays(date, 1);
  let attempts = 0;

  while (isNonTradingDay(current, holidays) && attempts < maxDays) {
    current = addDays(current, 1);
    attempts++;
  }

  if (attempts >= maxDays) {
    // Fallback: return original date if no trading day found
    return {
      adjustedDate: date,
      wasAdjusted: false,
      originalDate,
      reason: `no trading day found within ${maxDays} days`
    };
  }

  return {
    adjustedDate: current,
    wasAdjusted: true,
    originalDate,
    reason
  };
}
