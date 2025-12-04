-- ============================================
-- Optimize Analyst Records Query Performance
-- ============================================
-- This migration adds indexes to speed up pattern analysis queries
-- that filter by non-null price_trend and group by analyst_company

-- 1. Add index on analyst_company for faster grouping
CREATE INDEX IF NOT EXISTS idx_analyst_records_company
  ON analyst_records(analyst_company);

-- 2. Add composite index for the pattern query
-- This speeds up: WHERE price_trend IS NOT NULL ORDER BY published_date
CREATE INDEX IF NOT EXISTS idx_analyst_records_date_notnull_trend
  ON analyst_records(published_date ASC)
  WHERE price_trend IS NOT NULL;

-- 3. Add composite index for analyst grouping with date ordering
-- This helps with analyst-level analysis over time
CREATE INDEX IF NOT EXISTS idx_analyst_records_analyst_company_date
  ON analyst_records(analyst_name, analyst_company, published_date ASC);

-- ============================================
-- Performance Impact Notes:
-- ============================================
-- 1. idx_analyst_records_company: Speeds up GROUP BY analyst_company
-- 2. idx_analyst_records_date_notnull_trend: Partial index only on records
--    with price_trend data, significantly speeds up pattern queries
-- 3. idx_analyst_records_analyst_company_date: Speeds up analyst-level
--    time series analysis (upgrade/downgrade detection)
--
-- Expected improvement: 50-80% faster query time for pattern analysis
