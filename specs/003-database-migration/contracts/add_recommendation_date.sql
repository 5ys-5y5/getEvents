-- Migration: Add recommendation_date column to trades table
-- Purpose: Separate user input date (recommendation_date) from actual trading date (purchase_date)
-- 
-- recommendation_date: 사용자가 입력한 추천 날짜 (중복 검사용)
-- purchase_date: 실제 거래일 (가격 계산용, 주말/휴일인 경우 다음 거래일로 조정됨)
--
-- Run this in Supabase SQL Editor

-- Step 1: Add the new column
ALTER TABLE trades ADD COLUMN IF NOT EXISTS recommendation_date DATE;

-- Step 2: Copy existing purchase_date to recommendation_date for existing records
UPDATE trades SET recommendation_date = purchase_date WHERE recommendation_date IS NULL;

-- Step 3: Make recommendation_date NOT NULL
ALTER TABLE trades ALTER COLUMN recommendation_date SET NOT NULL;

-- Step 4: Drop the old unique constraint
ALTER TABLE trades DROP CONSTRAINT IF EXISTS unique_trade;

-- Step 5: Create new unique constraint using recommendation_date
ALTER TABLE trades ADD CONSTRAINT unique_trade UNIQUE (position, model_name, ticker, recommendation_date);

-- Step 6: Add index for recommendation_date
CREATE INDEX IF NOT EXISTS idx_trade_recommendation_date ON trades (recommendation_date);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trades' 
ORDER BY ordinal_position;

