import { supabase } from '../config/supabase.js';
import { fetchApi } from './fmpClient.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { DB_LIMITS, CACHE, TABLES } from '../config/appConfig.js';

// Helper function to check if database is available
function checkDatabaseAvailable() {
  if (!supabase) {
    console.warn('[DB] Database not available. Supabase is not initialized.');
    return false;
  }
  return true;
}

// Symbol Cache Operations
// Supabase는 기본적으로 한 번에 최대 1000행만 반환하므로, 페이지네이션으로 전체 심볼을 로드한다.
export async function loadSymbolCache() {
  if (!checkDatabaseAvailable()) {
    return { symbols: [] };
  }

  const pageSize = 1000;
  let offset = 0;
  let allRows = [];

  /* eslint-disable no-constant-condition */
  while (true) {
    const { data, error } = await supabase
      .from(TABLES.SYMBOL_CACHE)
      .select('ticker, sector, industry, data')
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Failed to load symbol cache: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < pageSize || allRows.length >= DB_LIMITS.SYMBOL_CACHE) {
      break;
    }
    offset += pageSize;
  }
  /* eslint-enable no-constant-condition */

  console.log(`[DB] Loaded ${allRows.length} symbols from cache (loadSymbolCache)`);
  return { symbols: allRows.map(row => row.data) };
}

/**
 * Get symbol cache - load from DB or fetch from API if not exists
 * @returns {Promise<{symbols: Array, lastUpdated: string}>}
 */
export async function getSymbolCache() {
  console.log('[getSymbolCache] Starting...');
  
  if (!checkDatabaseAvailable()) {
    console.warn('[getSymbolCache] Database not available, returning empty cache');
    return { symbols: [], lastUpdated: null };
  }
  
  // Try to load from DB
  const { data, error } = await supabase
    .from(TABLES.SYMBOL_CACHE)
    .select('ticker, data, updated_at')
    .limit(1);

  console.log(`[getSymbolCache] First query done. error=${error?.message || 'none'}, data.length=${data?.length || 0}`);

  if (!error && data && data.length > 0) {
    // Check if cache is still valid
    const cacheAge = Date.now() - new Date(data[0].updated_at).getTime();
    console.log(`[getSymbolCache] Cache age: ${Math.round(cacheAge / 1000 / 60)} minutes`);

    if (cacheAge < CACHE.SYMBOL_CACHE_MS) {
      // 전체 심볼을 페이지네이션으로 로드
      const pageSize = 1000;
      let offset = 0;
      let allData = [];

      console.log('[getSymbolCache] Loading all symbols with pagination...');
      
      /* eslint-disable no-constant-condition */
      while (true) {
        console.log(`[getSymbolCache] Fetching page offset=${offset}...`);
        const { data: page, error: pageError } = await supabase
          .from(TABLES.SYMBOL_CACHE)
          .select('data')
          .range(offset, offset + pageSize - 1);

        if (pageError) {
          console.error(`[DB] Failed to load symbol cache page ${offset}: ${pageError.message}`);
          break;
        }

        console.log(`[getSymbolCache] Page offset=${offset} returned ${page?.length || 0} rows`);
        
        if (!page || page.length === 0) break;

        allData = allData.concat(page);
        if (page.length < pageSize || allData.length >= DB_LIMITS.SYMBOL_CACHE) {
          break;
        }

        offset += pageSize;
      }
      /* eslint-enable no-constant-condition */

      console.log(`[DB] Loaded ${allData.length} symbols from cache`);
      return {
        symbols: allData.map(row => row.data),
        lastUpdated: data[0].updated_at
      };
    }
  }

  // Fetch fresh data from API
  console.log('[DB] Symbol cache not found or expired, fetching from API...');
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  const stockListConfig = apiList.getEvent.stockList['service-FMP'];

  const url = buildApiUrl(stockListConfig.API, { fmpApiKey });
  const result = await fetchApi(url, stockListConfig.id);

  if (!result.success || !result.data) {
    throw new Error('Failed to fetch symbol list from API');
  }

  const symbols = result.data.map(item => ({
    symbol: item.symbol,
    ticker: item.symbol,
    name: item.name,
    sector: item.sector || null,
    industry: item.industry || null,
    exchange: item.exchange || null
  }));

  // Save to DB
  await saveSymbolCache(symbols);
  console.log(`[DB] Saved ${symbols.length} symbols to cache`);

  return {
    symbols,
    lastUpdated: new Date().toISOString()
  };
}

export async function saveSymbolCache(symbols) {
  if (!checkDatabaseAvailable()) {
    console.warn('[saveSymbolCache] Database not available, skipping save');
    return;
  }

  const rows = symbols.map(s => ({
    ticker: s.symbol,
    sector: s.sector,
    industry: s.industry,
    data: s
  }));

  const { error } = await supabase
    .from(TABLES.SYMBOL_CACHE)
    .upsert(rows, { onConflict: 'ticker' });

  if (error) throw new Error(`Failed to save symbol cache: ${error.message}`);
}

// Event Cache Operations
export async function loadEventCache() {
  if (!checkDatabaseAvailable()) {
    throw new Error('GET_EVENT_CACHE_NOT_AVAILABLE');
  }

  const { data, error } = await supabase
    .from(TABLES.EVENT_CACHE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(DB_LIMITS.EVENT_CACHE)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('GET_EVENT_CACHE_NOT_AVAILABLE');
    }
    throw new Error(`Failed to load event cache: ${error.message}`);
  }

  return {
    meta: data.meta,
    events: data.events
  };
}

export async function saveEventCache(cacheData) {
  if (!checkDatabaseAvailable()) {
    console.warn('[saveEventCache] Database not available, skipping save');
    return;
  }

  const { error } = await supabase
    .from(TABLES.EVENT_CACHE)
    .upsert({
      start_date: cacheData.meta.request.startDate,
      end_date: cacheData.meta.request.endDate,
      from_date: cacheData.meta.request.fromDate,
      to_date: cacheData.meta.request.toDate,
      events: cacheData.events,
      meta: cacheData.meta
    }, { onConflict: 'start_date,end_date' });

  if (error) throw new Error(`Failed to save event cache: ${error.message}`);
}

// Tracked Price Cache Operations
// Uses pagination to fetch ALL trades (Supabase default limit is 1000)
export async function loadTrackedPriceCache() {
  if (!checkDatabaseAvailable()) {
    return { trades: [], modelSummaries: [] };
  }

  // Fetch trades with pagination (Supabase default limit is 1000)
  const pageSize = 1000;
  let allTradesData = [];
  let offset = 0;
  
  /* eslint-disable no-constant-condition */
  while (true) {
    const { data, error } = await supabase
      .from(TABLES.TRADES)
      .select('*')
      .range(offset, offset + pageSize - 1);
    
    if (error) throw new Error(`Failed to load trades: ${error.message}`);
    if (!data || data.length === 0) break;
    
    allTradesData = allTradesData.concat(data);
    
    if (data.length < pageSize || allTradesData.length >= DB_LIMITS.TRADES) {
      break;
    }
    offset += pageSize;
  }
  /* eslint-enable no-constant-condition */
  
  // Fetch model summaries (usually small, single query is fine)
  const { data: summariesData, error: summariesError } = await supabase
    .from(TABLES.MODEL_SUMMARIES)
    .select('*')
    .limit(DB_LIMITS.MODEL_SUMMARIES);
  
  if (summariesError) throw new Error(`Failed to load summaries: ${summariesError.message}`);

  const trades = allTradesData.map(row => ({
    position: row.position,
    modelName: row.model_name,
    ticker: row.ticker,
    recommendationDate: row.recommendation_date,  // User input date (for duplicate check)
    purchaseDate: row.purchase_date,              // Actual trading date (for price calculation)
    currentPrice: row.current_price,
    priceHistory: row.price_history,
    returns: row.returns,           // Pure returns (no cap) - cap applied dynamically in UI
    meta: row.meta
  }));

  const modelSummaries = (summariesData || []).map(row => ({
    modelName: row.model_name,
    totalTrades: row.total_trades,
    optimalHoldingDays: row.optimal_holding_days,
    suggestedMaxCap: row.suggested_max_cap,
    suggestedLowCap: row.suggested_low_cap,
    avgReturnByDay: row.avg_return_by_day,
    winRateByDay: row.win_rate_by_day,
    meta: row.meta
  }));

  console.log(`[DB] Loaded ${trades.length} trades, ${modelSummaries.length} summaries`);

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      totalTrades: trades.length,
      uniqueModels: new Set(trades.map(t => t.modelName)).size
    },
    trades,
    modelSummaries
  };
}

export async function saveTrackedPriceCache(cacheData) {
  const tradesRows = cacheData.trades.map(trade => ({
    position: trade.position,
    model_name: trade.modelName,
    ticker: trade.ticker,
    recommendation_date: trade.recommendationDate,  // User input date (for duplicate check)
    purchase_date: trade.purchaseDate,              // Actual trading date (for price calculation)
    current_price: trade.currentPrice,
    price_history: trade.priceHistory,
    returns: trade.returns,           // Pure returns (no cap) - cap applied dynamically in UI
    meta: trade.meta
  }));

  const summariesRows = cacheData.modelSummaries.map(summary => ({
    model_name: summary.modelName,
    total_trades: summary.totalTrades,
    optimal_holding_days: summary.optimalHoldingDays,
    suggested_max_cap: summary.suggestedMaxCap,
    suggested_low_cap: summary.suggestedLowCap,
    avg_return_by_day: summary.avgReturnByDay,
    win_rate_by_day: summary.winRateByDay,
    meta: summary.meta
  }));

  const [tradesError, summariesError] = await Promise.all([
    supabase.from(TABLES.TRADES).upsert(tradesRows, { onConflict: 'position,model_name,ticker,recommendation_date' }).then(r => r.error),
    supabase.from(TABLES.MODEL_SUMMARIES).upsert(summariesRows, { onConflict: 'model_name' }).then(r => r.error)
  ]);

  if (tradesError) throw new Error(`Failed to save trades: ${tradesError.message}`);
  if (summariesError) throw new Error(`Failed to save summaries: ${summariesError.message}`);
}

/**
 * Find existing trade by position, modelName, ticker, and purchaseDate
 * @param {string} position - 'long' or 'short'
 * @param {string} modelName - Model identifier
 * @param {string} ticker - Stock ticker
 * @param {string} purchaseDate - Purchase date (YYYY-MM-DD format, compared by date only)
 * @returns {Promise<Object|null>} Existing trade or null if not found
 */
export async function findExistingTrade(position, modelName, ticker, purchaseDate) {
  // Extract date part only (YYYY-MM-DD) for comparison
  const dateOnly = purchaseDate.split('T')[0];
  
  // First, try exact date match (for YYYY-MM-DD format stored in DB)
  let { data, error } = await supabase
    .from(TABLES.TRADES)
    .select('*')
    .eq('position', position)
    .eq('model_name', modelName)
    .eq('ticker', ticker)
    .eq('purchase_date', dateOnly)
    .limit(1);

  // If no exact match, try with timestamp range
  if (!error && (!data || data.length === 0)) {
    const rangeResult = await supabase
      .from(TABLES.TRADES)
      .select('*')
      .eq('position', position)
      .eq('model_name', modelName)
      .eq('ticker', ticker)
      .gte('purchase_date', dateOnly + 'T00:00:00')
      .lt('purchase_date', dateOnly + 'T23:59:59.999')
      .limit(1);
    
    data = rangeResult.data;
    error = rangeResult.error;
  }

  // If still no match, try LIKE query for partial date match
  if (!error && (!data || data.length === 0)) {
    const likeResult = await supabase
      .from(TABLES.TRADES)
      .select('*')
      .eq('position', position)
      .eq('model_name', modelName)
      .eq('ticker', ticker)
      .like('purchase_date', dateOnly + '%')
      .limit(1);
    
    data = likeResult.data;
    error = likeResult.error;
  }

  if (error) {
    console.error(`[DB] findExistingTrade error: ${error.message}`);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    position: row.position,
    modelName: row.model_name,
    ticker: row.ticker,
    purchaseDate: row.purchase_date,
    currentPrice: row.current_price,
    priceHistory: row.price_history,
    returns: row.returns,           // Pure returns (no cap) - cap applied dynamically in UI
    meta: row.meta
  };
}

// Analyst Log Operations
export async function loadAnalystLog(tickers = null) {
  let query = supabase.from(TABLES.ANALYST_LOG).select('*').limit(DB_LIMITS.ANALYST_LOG);

  if (tickers && tickers.length > 0) {
    query = query.in('ticker', tickers);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to load analyst log: ${error.message}`);

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      totalTickers: data.length
    },
    data: data.map(row => ({
      ticker: row.ticker,
      targetPrice: row.target_price,
      numberOfAnalysts: row.number_of_analysts,
      priceTrend: row.price_trend
    }))
  };
}

export async function saveAnalystLog(logData) {
  const rows = logData.data.map(item => ({
    ticker: item.ticker,
    target_price: item.targetPrice,
    number_of_analysts: item.numberOfAnalysts,
    price_trend: item.priceTrend
  }));

  const { error } = await supabase
    .from(TABLES.ANALYST_LOG)
    .upsert(rows, { onConflict: 'ticker' });

  if (error) throw new Error(`Failed to save analyst log: ${error.message}`);
}

// Merge Trade Record (for priceTracker endpoint)
// Uses recommendation_date for duplicate detection, purchase_date for price calculation
export async function mergeTradeRecord(tradeRecord) {
  if (!checkDatabaseAvailable()) {
    console.warn('[mergeTradeRecord] Database not available, skipping save');
    return;
  }

  const { error } = await supabase
    .from(TABLES.TRADES)
    .upsert({
      position: tradeRecord.position,
      model_name: tradeRecord.modelName,
      ticker: tradeRecord.ticker,
      recommendation_date: tradeRecord.recommendationDate,  // User input date (for duplicate check)
      purchase_date: tradeRecord.purchaseDate,              // Actual trading date (for price calculation)
      current_price: tradeRecord.currentPrice,
      price_history: tradeRecord.priceHistory,
      returns: tradeRecord.returns,           // Pure returns (no cap) - cap applied dynamically in UI
      meta: tradeRecord.meta
    }, {
      onConflict: 'position,model_name,ticker,recommendation_date'
    });

  if (error) throw new Error(`Failed to merge trade record: ${error.message}`);
}
