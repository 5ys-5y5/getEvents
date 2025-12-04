-- ============================================
-- Remove cap_returns column from trades table
-- ============================================
-- 
-- Purpose: Cap-aware returns are now calculated dynamically in Dashboard/Control UI
-- - returns: Pure return rates (close price based) with OHLC data for dynamic cap calculation
-- - cap_returns: REMOVED - no longer stored, calculated on-the-fly in frontend
--
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the index first (if exists)
DROP INDEX IF EXISTS idx_trades_cap_returns;

-- Step 2: Remove cap_returns column
ALTER TABLE trades 
DROP COLUMN IF EXISTS cap_returns;

-- Step 3: Update comment for returns column
COMMENT ON COLUMN trades.returns IS 'Pure returns based on close price with OHLC data for dynamic cap calculation in UI. Structure: [{date, returnRate, cumulativeReturn, open, high, low, close}, ...]';

-- ============================================
-- Verification query (run after migration)
-- ============================================
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'trades';

-- ============================================
-- Note: Cap-aware returns are now calculated dynamically
-- ============================================
-- The Dashboard and Control pages now calculate cap-aware returns
-- in real-time using the OHLC data stored in the returns column.
-- This allows users to adjust maxCap and lowCap values and see
-- the impact immediately without re-fetching data.
--
-- Default settings (configurable in Control page):
-- - MAX_CAP_PCT: 0.20 (20% profit cap)
-- - LOW_CAP_PCT: 0.05 (5% loss cap)
-- ============================================


