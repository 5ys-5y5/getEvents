/**
 * Trading Day Service
 * Manages market holidays and calculates actual trading days (D+N)
 * 
 * Key Features:
 * - Fetches holidays from FMP API and caches in DB
 * - Calculates N-th trading day from a given date (skipping weekends and holidays)
 * - Updates holiday cache daily
 * - Reads target exchanges from ApiList.json filter.target configuration
 */

import { supabase } from '../config/supabase.js';
import { fetchApi } from './fmpClient.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { TABLES, MARKET_HOLIDAYS } from '../config/appConfig.js';

// In-memory cache for holidays (loaded from DB)
let holidaysCache = null;
let holidaysCacheDate = null;

/**
 * Get target exchanges from ApiList.json filter.target configuration
 * Parses the exchange parameter from the API URL
 * @returns {Promise<string[]>} Array of exchange codes (e.g., ['NYSE', 'NASDAQ', 'AMEX'])
 */
async function getTargetExchanges() {
  try {
    const apiList = await loadApiList();
    const apiUrl = apiList?.filter?.target?.['service-FMP']?.API || '';
    
    // Parse exchange parameter from URL: exchange=NYSE,NASDAQ,AMEX
    const exchangeMatch = apiUrl.match(/exchange=([^&]+)/);
    if (exchangeMatch && exchangeMatch[1]) {
      const exchanges = exchangeMatch[1].split(',').map(e => e.trim().toUpperCase());
      console.log(`[TradingDay] Target exchanges from ApiList.json: ${exchanges.join(', ')}`);
      return exchanges;
    }
  } catch (error) {
    console.error(`[TradingDay] Failed to parse exchanges from ApiList.json: ${error.message}`);
  }
  
  // Fallback to default
  console.log(`[TradingDay] Using default exchange: ${MARKET_HOLIDAYS.DEFAULT_EXCHANGE}`);
  return [MARKET_HOLIDAYS.DEFAULT_EXCHANGE];
}

/**
 * Load holidays from DB into memory cache
 * Loads holidays for all target exchanges defined in ApiList.json
 * @returns {Promise<Set<string>>} Set of holiday dates in YYYY-MM-DD format
 */
export async function loadHolidaysFromDB() {
  const today = new Date().toISOString().split('T')[0];
  
  // Return cached if still valid (same day)
  if (holidaysCache && holidaysCacheDate === today) {
    return holidaysCache;
  }

  // Check if database is available
  if (!supabase) {
    console.warn('[TradingDay] Database not available, using empty holiday cache');
    holidaysCache = new Set();
    holidaysCacheDate = today;
    return holidaysCache;
  }

  const exchanges = await getTargetExchanges();
  
  const { data, error } = await supabase
    .from(TABLES.MARKET_HOLIDAYS)
    .select('date, is_closed, exchange')
    .in('exchange', exchanges);

  if (error) {
    console.error(`[TradingDay] Failed to load holidays from DB: ${error.message}`);
    return new Set();
  }

  // Only include fully closed days
  const closedDates = (data || [])
    .filter(h => h.is_closed === true)
    .map(h => h.date);

  holidaysCache = new Set(closedDates);
  holidaysCacheDate = today;
  
  console.log(`[TradingDay] Loaded ${holidaysCache.size} holidays from DB for exchanges: ${exchanges.join(', ')}`);
  return holidaysCache;
}

/**
 * Fetch holidays from FMP API and save to DB
 * If no exchange specified, fetches for all exchanges defined in ApiList.json
 * @param {string|null} exchange - Exchange code (null = all from ApiList.json)
 * @returns {Promise<{success: boolean, count: number, exchanges: string[], error?: string}>}
 */
export async function updateHolidaysFromAPI(exchange = null) {
  const exchanges = exchange ? [exchange] : await getTargetExchanges();
  console.log(`[TradingDay] Fetching holidays for exchanges: ${exchanges.join(', ')}`);
  
  try {
    const apiKey = getFmpApiKey();
    let totalCount = 0;
    const allRows = [];
    
    // Fetch holidays for each exchange
    for (const ex of exchanges) {
      console.log(`[TradingDay] Fetching holidays for ${ex}...`);
      
      const url = `https://financialmodelingprep.com/stable/holidays-by-exchange?exchange=${ex}&apikey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[TradingDay] FMP API error for ${ex}: ${response.status}`);
        continue;
      }
      
      const holidays = await response.json();
      
      if (!Array.isArray(holidays)) {
        console.error(`[TradingDay] Invalid response format for ${ex}`);
        continue;
      }

      console.log(`[TradingDay] Received ${holidays.length} holiday records for ${ex}`);

      // Transform rows
      const rows = holidays.map(h => ({
        exchange: h.exchange || ex,
        date: h.date,
        name: h.name,
        is_closed: h.isClosed === true,
        adj_open_time: h.adjOpenTime || null,
        adj_close_time: h.adjCloseTime || null,
        is_fully_closed: h.isFullyClosed !== false && h.isClosed === true,
        updated_at: new Date().toISOString()
      }));
      
      allRows.push(...rows);
      totalCount += rows.length;
    }

    if (allRows.length === 0) {
      throw new Error('No holiday data received from any exchange');
    }

    // Check if database is available
    if (!supabase) {
      console.warn('[TradingDay] Database not available, skipping holiday save');
      return { success: true, count: totalCount, exchanges, note: 'Database not available, holidays not saved' };
    }

    // Upsert all rows to DB
    const { error } = await supabase
      .from(TABLES.MARKET_HOLIDAYS)
      .upsert(allRows, { onConflict: 'exchange,date' });

    if (error) {
      throw new Error(`DB upsert error: ${error.message}`);
    }

    // Clear memory cache to force reload
    holidaysCache = null;
    holidaysCacheDate = null;

    console.log(`[TradingDay] Saved ${totalCount} holidays to DB for ${exchanges.length} exchanges`);
    return { success: true, count: totalCount, exchanges };

  } catch (error) {
    console.error(`[TradingDay] Error updating holidays: ${error.message}`);
    return { success: false, count: 0, exchanges: [], error: error.message };
  }
}

/**
 * Check if a date is a trading day
 * @param {Date|string} date - Date to check
 * @param {Set<string>} holidays - Set of holiday dates
 * @returns {boolean} True if trading day
 */
export function isTradingDay(date, holidays) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = d.getUTCDay();
  
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Holiday check
  const dateStr = d.toISOString().split('T')[0];
  if (holidays.has(dateStr)) {
    return false;
  }
  
  return true;
}

/**
 * Get the N-th trading day from a start date
 * @param {Date|string} startDate - Start date
 * @param {number} n - Number of trading days to advance (1 = next trading day)
 * @param {Set<string>} holidays - Set of holiday dates (optional, will load from DB if not provided)
 * @returns {Promise<Date>} The N-th trading day
 */
export async function getNthTradingDay(startDate, n, holidays = null) {
  if (!holidays) {
    holidays = await loadHolidaysFromDB();
  }
  
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  let current = new Date(start);
  let tradingDaysCount = 0;
  
  // Maximum iterations to prevent infinite loop (365 days should be more than enough)
  const maxIterations = 365;
  let iterations = 0;
  
  while (tradingDaysCount < n && iterations < maxIterations) {
    current.setUTCDate(current.getUTCDate() + 1);
    iterations++;
    
    if (isTradingDay(current, holidays)) {
      tradingDaysCount++;
    }
  }
  
  return current;
}

/**
 * Get trading days for D+1 to D+N from a start date
 * @param {Date|string} startDate - Purchase/start date
 * @param {number} maxN - Maximum N (e.g., 14 for D+1 to D+14)
 * @returns {Promise<Array<{n: number, date: Date, dateStr: string}>>}
 */
export async function getTradingDaysFromDate(startDate, maxN = 14) {
  const holidays = await loadHolidaysFromDB();
  const results = [];
  
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  let current = new Date(start);
  let tradingDaysCount = 0;
  
  const maxIterations = maxN * 3; // Allow for weekends and holidays
  let iterations = 0;
  
  while (tradingDaysCount < maxN && iterations < maxIterations) {
    current.setUTCDate(current.getUTCDate() + 1);
    iterations++;
    
    if (isTradingDay(current, holidays)) {
      tradingDaysCount++;
      results.push({
        n: tradingDaysCount,
        date: new Date(current),
        dateStr: current.toISOString().split('T')[0]
      });
    }
  }
  
  return results;
}

/**
 * Initialize holidays on server startup
 * Fetches holidays for all exchanges defined in ApiList.json
 * @returns {Promise<void>}
 */
export async function initializeHolidays() {
  if (!MARKET_HOLIDAYS.UPDATE_ON_STARTUP) {
    console.log('[TradingDay] Holiday update on startup is disabled');
    return;
  }
  
  const exchanges = await getTargetExchanges();
  console.log(`[TradingDay] Initializing holidays for exchanges: ${exchanges.join(', ')}`);
  
  // Check if we have recent holidays in DB for any of the target exchanges
  const { data, error } = await supabase
    .from(TABLES.MARKET_HOLIDAYS)
    .select('updated_at, exchange')
    .in('exchange', exchanges)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.log('[TradingDay] No existing holidays in DB, fetching from API...');
    await updateHolidaysFromAPI();
    return;
  }

  if (!data || data.length === 0) {
    console.log('[TradingDay] No holidays found, fetching from API...');
    await updateHolidaysFromAPI();
    return;
  }

  // Check if last update was today
  const lastUpdate = new Date(data[0].updated_at);
  const today = new Date();
  const isSameDay = lastUpdate.toISOString().split('T')[0] === today.toISOString().split('T')[0];

  if (!isSameDay) {
    console.log('[TradingDay] Holidays cache is stale, updating from API...');
    await updateHolidaysFromAPI();
  } else {
    console.log('[TradingDay] Holidays cache is up to date');
    await loadHolidaysFromDB();
  }
}

export default {
  loadHolidaysFromDB,
  updateHolidaysFromAPI,
  isTradingDay,
  getNthTradingDay,
  getTradingDaysFromDate,
  initializeHolidays
};

