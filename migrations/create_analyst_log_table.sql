-- ============================================
-- Analyst Rating Log Table
-- ============================================
-- This migration creates the analyst_logs table for storing
-- analyst rating statistics calculated from analyst_records

-- 1. Analyst Logs Table
CREATE TABLE IF NOT EXISTS analyst_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_name TEXT NOT NULL,
  analyst_company TEXT NOT NULL,
  price_target_count INTEGER DEFAULT 0,
  gap_rates JSONB,                    -- Statistics for each D+N horizon
  time_to_target JSONB,               -- Time to target statistics
  accuracy JSONB,                     -- Accuracy metrics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on analyst_name + analyst_company combination
  CONSTRAINT analyst_log_unique_analyst UNIQUE (analyst_name, analyst_company)
);

-- Index for faster analyst lookups
CREATE INDEX IF NOT EXISTS idx_analyst_logs_name ON analyst_logs(analyst_name);
CREATE INDEX IF NOT EXISTS idx_analyst_logs_company ON analyst_logs(analyst_company);
CREATE INDEX IF NOT EXISTS idx_analyst_logs_updated_at ON analyst_logs(updated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analyst_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_analyst_logs_updated_at_trigger
  BEFORE UPDATE ON analyst_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_analyst_logs_updated_at();

-- ============================================
-- Usage Notes:
-- ============================================
-- 1. This table stores analyst rating statistics
-- 2. gap_rates: { "D1": { "meanGapRate": 0.05, "stdGapRate": 0.1, ... }, ... }
-- 3. time_to_target: { "mean": 30, "median": 25, ... }
-- 4. accuracy: { "mean": 0.95, "std": 0.1, "count": 100 }
-- 5. Upsert using: ON CONFLICT (analyst_name, analyst_company) DO UPDATE
