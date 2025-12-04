-- Database Schema for 003-database-migration
-- Supabase PostgreSQL 14+
-- Purpose: Replace file-based JSON cache with database tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: symbol_cache
-- Purpose: Store eligible ticker symbols with sector/industry metadata
-- ============================================================================

CREATE TABLE symbol_cache (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_symbol_ticker ON symbol_cache (ticker);
CREATE INDEX idx_symbol_sector ON symbol_cache (sector);
CREATE INDEX idx_symbol_data_gin ON symbol_cache USING GIN (data);

-- ============================================================================
-- Table: event_cache  
-- Purpose: Cache getEvent API results for fast retrieval
-- ============================================================================

CREATE TABLE event_cache (
  id SERIAL PRIMARY KEY,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  events JSONB NOT NULL,
  meta JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_date_range UNIQUE (start_date, end_date)
);

CREATE INDEX idx_event_date_range ON event_cache (start_date, end_date);

-- ============================================================================
-- Table: trades
-- Purpose: Store individual trade records with price history and returns
-- ============================================================================

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  position VARCHAR(5) NOT NULL CHECK (position IN ('long', 'short')),
  model_name VARCHAR(50) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  purchase_date DATE NOT NULL,
  current_price NUMERIC(10, 4) NOT NULL CHECK (current_price > 0),
  price_history JSONB NOT NULL,
  returns JSONB NOT NULL,
  meta JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_trade UNIQUE (position, model_name, ticker, purchase_date)
);

CREATE INDEX idx_trade_composite ON trades (model_name, purchase_date DESC);
CREATE INDEX idx_trade_ticker ON trades (ticker);
CREATE INDEX idx_trade_position ON trades (position);

-- ============================================================================
-- Table: model_summaries
-- Purpose: Aggregate statistics for trading models
-- ============================================================================

CREATE TABLE model_summaries (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(50) UNIQUE NOT NULL,
  total_trades INTEGER NOT NULL,
  optimal_holding_days INTEGER[] NOT NULL,
  suggested_max_cap NUMERIC(6, 4),
  suggested_low_cap NUMERIC(6, 4),
  avg_return_by_day JSONB NOT NULL,
  win_rate_by_day JSONB NOT NULL,
  meta JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_model_name ON model_summaries (model_name);

-- ============================================================================
-- Table: analyst_log
-- Purpose: Store analyst ratings and price trend data (ticker-level summary)
-- ============================================================================

CREATE TABLE analyst_log (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  target_price NUMERIC(10, 2),
  number_of_analysts INTEGER,
  price_trend JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyst_ticker ON analyst_log (ticker);
CREATE INDEX idx_analyst_trend_gin ON analyst_log USING GIN (price_trend);

-- ============================================================================
-- Table: analyst_records
-- Purpose: Store individual analyst price target records with historical data
-- Used by: refreshAnalystLog endpoint for detailed analyst tracking
-- ============================================================================

CREATE TABLE analyst_records (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  published_date DATE NOT NULL,
  analyst_name VARCHAR(255) NOT NULL,
  news_url TEXT,
  news_title TEXT,
  price_target NUMERIC(10, 2),
  adj_price_target NUMERIC(10, 2),
  price_when_posted NUMERIC(10, 2),
  news_publisher VARCHAR(255),
  news_base_url TEXT,
  analyst_company VARCHAR(255),
  price_trend JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_analyst_record UNIQUE (ticker, published_date, analyst_name)
);

CREATE INDEX idx_analyst_records_ticker ON analyst_records (ticker);
CREATE INDEX idx_analyst_records_date ON analyst_records (published_date);
CREATE INDEX idx_analyst_records_analyst ON analyst_records (analyst_name);
CREATE INDEX idx_analyst_records_ticker_date ON analyst_records (ticker, published_date DESC);
CREATE INDEX idx_analyst_records_trend_gin ON analyst_records USING GIN (price_trend);
