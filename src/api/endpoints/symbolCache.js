/**
 * Symbol Cache Endpoints
 * 
 * GET /symbolCache - 현재 캐시된 심볼 목록 조회
 * GET /refreshSymbolCache - 심볼 캐시 강제 갱신
 * GET /symbolCache/search?q={query} - 심볼 검색
 * GET /symbolCache/stats - 심볼 캐시 통계
 */

import { loadSymbolCache, getSymbolCache, saveSymbolCache } from '../../services/dbManager.js';
import { fetchApi } from '../../services/fmpClient.js';
import { loadApiList, getFmpApiKey, buildApiUrl } from '../../lib/configLoader.js';
import { CACHE, DB_LIMITS } from '../../config/appConfig.js';

/**
 * GET /symbolCache - 현재 캐시된 심볼 목록 조회
 * 
 * Query Parameters:
 * - limit: 반환할 최대 개수 (기본: 100, 최대: 10000)
 * - offset: 시작 위치 (기본: 0)
 * - exchange: 거래소 필터 (예: NASDAQ, NYSE, AMEX)
 * - sector: 섹터 필터 (예: Technology)
 * - industry: 산업 필터 (예: Software)
 * - q: 티커/회사명 검색
 */
export async function symbolCacheHandler(req, res) {
  try {
    const startTime = Date.now();
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit) || 100, 10000);
    const offset = parseInt(req.query.offset) || 0;
    const exchangeFilter = req.query.exchange?.toUpperCase();
    const sectorFilter = req.query.sector;
    const industryFilter = req.query.industry;
    const searchQuery = req.query.q?.toLowerCase();
    
    console.log(`[SymbolCache] Loading cache... filters: exchange=${exchangeFilter || 'all'}, sector=${sectorFilter || 'all'}, q=${searchQuery || 'none'}`);
    
    // Load from DB
    const cache = await loadSymbolCache();
    
    if (!cache || !cache.symbols || cache.symbols.length === 0) {
      return res.status(404).json({
        error: 'Symbol cache is empty',
        message: 'Run GET /refreshSymbolCache to populate the cache',
        hint: 'Symbol cache is populated from FMP API /v3/stock/list'
      });
    }
    
    let symbols = cache.symbols;
    
    // Apply filters
    if (exchangeFilter) {
      symbols = symbols.filter(s => s.exchangeShortName?.toUpperCase() === exchangeFilter);
    }
    if (sectorFilter) {
      symbols = symbols.filter(s => s.sector?.toLowerCase().includes(sectorFilter.toLowerCase()));
    }
    if (industryFilter) {
      symbols = symbols.filter(s => s.industry?.toLowerCase().includes(industryFilter.toLowerCase()));
    }
    if (searchQuery) {
      symbols = symbols.filter(s => 
        s.symbol?.toLowerCase().includes(searchQuery) ||
        s.name?.toLowerCase().includes(searchQuery)
      );
    }
    
    const totalCount = symbols.length;
    
    // Apply pagination
    const paginatedSymbols = symbols.slice(offset, offset + limit);
    
    const duration = Date.now() - startTime;
    console.log(`[SymbolCache] Returned ${paginatedSymbols.length}/${totalCount} symbols in ${duration}ms`);
    
    res.json({
      meta: {
        totalCount,
        returnedCount: paginatedSymbols.length,
        offset,
        limit,
        hasMore: offset + limit < totalCount,
        filters: {
          exchange: exchangeFilter || null,
          sector: sectorFilter || null,
          industry: industryFilter || null,
          search: searchQuery || null
        },
        duration: `${duration}ms`
      },
      symbols: paginatedSymbols.map(s => ({
        symbol: s.symbol,
        name: s.name,
        exchange: s.exchangeShortName,
        sector: s.sector,
        industry: s.industry,
        type: s.type
      }))
    });
    
  } catch (error) {
    console.error('[SymbolCache] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /refreshSymbolCache - 심볼 캐시 강제 갱신
 * 
 * Query Parameters:
 * - force: true면 캐시 유효기간 무시하고 강제 갱신
 */
export async function refreshSymbolCacheHandler(req, res) {
  try {
    const startTime = Date.now();
    const force = req.query.force === 'true';
    
    console.log(`[RefreshSymbolCache] Starting... force=${force}`);
    
    // Check if we need to refresh (unless forced)
    if (!force) {
      const existingCache = await getSymbolCache();
      if (existingCache && existingCache.symbols && existingCache.symbols.length > 0) {
        const cacheAge = Date.now() - new Date(existingCache.lastUpdated).getTime();
        const cacheAgeDays = Math.round(cacheAge / (24 * 60 * 60 * 1000) * 10) / 10;
        
        if (cacheAge < CACHE.SYMBOL_CACHE_MS) {
          const duration = Date.now() - startTime;
          console.log(`[RefreshSymbolCache] Cache is still valid (${cacheAgeDays} days old)`);
          
          return res.json({
            meta: {
              action: 'skipped',
              reason: 'Cache is still valid',
              cacheAge: `${cacheAgeDays} days`,
              cacheValidFor: `${CACHE.SYMBOL_CACHE_DAYS} days`,
              symbolCount: existingCache.symbols.length,
              lastUpdated: existingCache.lastUpdated,
              duration: `${duration}ms`
            },
            message: 'Symbol cache is still valid. Use ?force=true to force refresh.'
          });
        }
      }
    }
    
    // Fetch fresh data from FMP API
    console.log('[RefreshSymbolCache] Fetching from FMP API...');
    
    const apiList = await loadApiList();
    const fmpApiKey = getFmpApiKey();
    
    if (!fmpApiKey) {
      throw new Error('FMP_API_KEY not configured. Set it in .env file or via Control Panel.');
    }
    
    // Get filter.target config (same as getSymbolCache)
    const filterTarget = apiList?.filter?.target?.['service-FMP'];
    if (!filterTarget || !filterTarget.API) {
      throw new Error('filter.target service-FMP configuration not found in ApiList.json');
    }
    
    const apiUrl = buildApiUrl(filterTarget.API, { fmpApiKey });
    console.log(`[RefreshSymbolCache] Calling FMP API: ${filterTarget.API.split('?')[0]}...`);
    
    const response = await fetchApi(apiUrl);
    
    if (!response.success || !response.data) {
      const errorMsg = typeof response.error === 'object' 
        ? JSON.stringify(response.error) 
        : (response.error || 'Unknown error');
      throw new Error(`FMP API call failed: ${errorMsg}`);
    }
    
    const symbols = response.data;
    console.log(`[RefreshSymbolCache] Received ${symbols.length} symbols from FMP API`);
    
    // Save to DB
    console.log('[RefreshSymbolCache] Saving to database...');
    await saveSymbolCache(symbols);
    
    const duration = Date.now() - startTime;
    console.log(`[RefreshSymbolCache] Complete. ${symbols.length} symbols saved in ${duration}ms`);
    
    // Get exchange distribution
    const exchangeCounts = {};
    symbols.forEach(s => {
      const ex = s.exchangeShortName || 'Unknown';
      exchangeCounts[ex] = (exchangeCounts[ex] || 0) + 1;
    });
    
    res.json({
      meta: {
        action: 'refreshed',
        symbolCount: symbols.length,
        lastUpdated: new Date().toISOString(),
        duration: `${duration}ms`,
        exchangeDistribution: exchangeCounts
      },
      message: `Symbol cache refreshed successfully. ${symbols.length} symbols loaded.`
    });
    
  } catch (error) {
    console.error('[RefreshSymbolCache] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /symbolCache/search - 심볼 검색
 * 
 * Query Parameters:
 * - q: 검색어 (필수) - 티커 또는 회사명
 * - limit: 반환할 최대 개수 (기본: 20)
 */
export async function symbolSearchHandler(req, res) {
  try {
    const query = req.query.q?.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Provide ?q=search_term'
      });
    }
    
    console.log(`[SymbolSearch] Searching for "${query}"...`);
    
    const cache = await loadSymbolCache();
    
    if (!cache || !cache.symbols || cache.symbols.length === 0) {
      return res.status(404).json({
        error: 'Symbol cache is empty',
        message: 'Run GET /refreshSymbolCache to populate the cache'
      });
    }
    
    // Search with priority: exact ticker match > ticker starts with > name contains
    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];
    
    cache.symbols.forEach(s => {
      const symbol = s.symbol?.toLowerCase() || '';
      const name = s.name?.toLowerCase() || '';
      
      if (symbol === query) {
        exactMatches.push(s);
      } else if (symbol.startsWith(query)) {
        startsWithMatches.push(s);
      } else if (symbol.includes(query) || name.includes(query)) {
        containsMatches.push(s);
      }
    });
    
    const results = [
      ...exactMatches,
      ...startsWithMatches,
      ...containsMatches
    ].slice(0, limit);
    
    console.log(`[SymbolSearch] Found ${results.length} results for "${query}"`);
    
    res.json({
      meta: {
        query,
        resultCount: results.length,
        limit
      },
      results: results.map(s => ({
        symbol: s.symbol,
        name: s.name,
        exchange: s.exchangeShortName,
        sector: s.sector,
        industry: s.industry,
        type: s.type
      }))
    });
    
  } catch (error) {
    console.error('[SymbolSearch] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /symbolCache/stats - 심볼 캐시 통계
 */
export async function symbolStatsHandler(req, res) {
  try {
    console.log('[SymbolStats] Calculating statistics...');
    
    const cache = await loadSymbolCache();
    
    if (!cache || !cache.symbols || cache.symbols.length === 0) {
      return res.status(404).json({
        error: 'Symbol cache is empty',
        message: 'Run GET /refreshSymbolCache to populate the cache'
      });
    }
    
    const symbols = cache.symbols;
    
    // Calculate statistics
    const stats = {
      totalSymbols: symbols.length,
      byExchange: {},
      bySector: {},
      byType: {}
    };
    
    symbols.forEach(s => {
      // By exchange
      const exchange = s.exchangeShortName || 'Unknown';
      stats.byExchange[exchange] = (stats.byExchange[exchange] || 0) + 1;
      
      // By sector
      const sector = s.sector || 'Unknown';
      stats.bySector[sector] = (stats.bySector[sector] || 0) + 1;
      
      // By type
      const type = s.type || 'Unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    // Sort by count (descending)
    const sortByCount = (obj) => {
      return Object.fromEntries(
        Object.entries(obj).sort((a, b) => b[1] - a[1])
      );
    };
    
    stats.byExchange = sortByCount(stats.byExchange);
    stats.bySector = sortByCount(stats.bySector);
    stats.byType = sortByCount(stats.byType);
    
    // Cache info
    const cacheInfo = {
      validForDays: CACHE.SYMBOL_CACHE_DAYS,
      maxSymbols: DB_LIMITS.SYMBOL_CACHE
    };
    
    console.log(`[SymbolStats] Total: ${stats.totalSymbols}, Exchanges: ${Object.keys(stats.byExchange).length}, Sectors: ${Object.keys(stats.bySector).length}`);
    
    res.json({
      meta: {
        timestamp: new Date().toISOString()
      },
      cacheSettings: cacheInfo,
      statistics: stats
    });
    
  } catch (error) {
    console.error('[SymbolStats] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /symbolCache/check/:ticker - 특정 티커 존재 여부 확인
 */
export async function symbolCheckHandler(req, res) {
  try {
    const ticker = req.params.ticker?.toUpperCase();
    
    if (!ticker) {
      return res.status(400).json({
        error: 'Ticker required',
        message: 'Provide ticker in URL: /symbolCache/check/AAPL'
      });
    }
    
    console.log(`[SymbolCheck] Checking ticker: ${ticker}`);
    
    const cache = await loadSymbolCache();
    
    if (!cache || !cache.symbols || cache.symbols.length === 0) {
      return res.status(404).json({
        error: 'Symbol cache is empty',
        message: 'Run GET /refreshSymbolCache to populate the cache'
      });
    }
    
    const symbol = cache.symbols.find(s => 
      s.symbol?.toUpperCase() === ticker
    );
    
    if (symbol) {
      res.json({
        found: true,
        symbol: {
          symbol: symbol.symbol,
          name: symbol.name,
          exchange: symbol.exchangeShortName,
          sector: symbol.sector,
          industry: symbol.industry,
          type: symbol.type
        }
      });
    } else {
      res.json({
        found: false,
        ticker,
        message: `Ticker ${ticker} not found in symbol cache`
      });
    }
    
  } catch (error) {
    console.error('[SymbolCheck] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export default symbolCacheHandler;

