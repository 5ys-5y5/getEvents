-- ============================================
-- Event Patterns Table (기준1: 이벤트 유형별 주가 패턴)
-- ============================================
-- 이벤트 발생 전후 28일간의 가격 추이를 기록하여
-- 선반영 및 이벤트 후 반응 패턴을 분석하기 위한 테이블

CREATE TABLE event_patterns (
  id SERIAL PRIMARY KEY,
  
  -- 이벤트 정보
  event_type VARCHAR(50) NOT NULL,          -- 'earning', 'dividend', 'split' 등
  ticker VARCHAR(10) NOT NULL,              -- 종목 심볼
  event_date DATE NOT NULL,                 -- 이벤트 발생일
  
  -- 이벤트 상세 (earning의 경우)
  event_detail JSONB,                       -- { eps, epsEstimated, revenue, revenueEstimated, ... }
  
  -- 가격 히스토리 (event_date 기준 -14일 ~ +14일, 총 28일 + 당일)
  -- D-14 ~ D+14 (D0 = event_date)
  price_history JSONB NOT NULL,             -- [{ date, open, high, low, close, volume }, ...]
  
  -- 계산된 수익률 (D0 기준)
  returns JSONB,                            -- { "D-14": 0.02, "D-7": 0.01, "D+1": -0.03, "D+7": 0.05, ... }
  
  -- 메타 정보
  meta JSONB,                               -- { source, collectedAt, errors }
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 방지: 같은 이벤트 유형, 티커, 날짜 조합은 유일
  CONSTRAINT unique_event_pattern UNIQUE (event_type, ticker, event_date)
);

-- 인덱스
CREATE INDEX idx_event_patterns_type ON event_patterns (event_type);
CREATE INDEX idx_event_patterns_ticker ON event_patterns (ticker);
CREATE INDEX idx_event_patterns_date ON event_patterns (event_date);
CREATE INDEX idx_event_patterns_type_date ON event_patterns (event_type, event_date);

-- ============================================
-- Pattern Analysis Settings (Control 페이지 연동)
-- ============================================
-- 패턴 분석에 사용되는 설정값들

CREATE TABLE pattern_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 기본 설정 삽입
INSERT INTO pattern_settings (setting_key, setting_value, description) VALUES
  ('event_pattern_horizons', '[-14, -7, -5, -3, -1, 0, 1, 3, 5, 7, 14]', '이벤트 패턴 분석에 사용되는 D+N 일수'),
  ('analyst_trend_horizons', '[1, 2, 3, 4, 5, 6, 7, 14, 30, 60, 180, 365]', '애널리스트 가격 추이 수집 일수 (PRICE_TREND.HORIZONS와 동기화)'),
  ('min_data_points', '30', '통계적으로 유의미한 최소 데이터 포인트 수'),
  ('efficiency_calculation', '{"enabled": true, "annualized": true}', '거래 효율성 계산 설정');

-- ============================================
-- 주석: 기존 테이블 활용
-- ============================================
-- 기준2, 기준3 분석은 기존 테이블을 활용합니다:
--
-- 1. analyst_records 테이블 (기존)
--    - ticker, published_date, analyst_name, price_target, price_when_posted
--    - price_trend: { D1, D2, ..., D365 } - 발표일 이후 가격 추이
--    - 기준3 분석에 직접 사용
--
-- 2. event_cache 테이블 (기존)
--    - earning calendar 이벤트 데이터
--    - event_patterns 테이블 데이터 수집 소스
--
-- 3. symbol_cache 테이블 (기존)
--    - 티커 유효성 검증
--
-- 기준2 분석: event_patterns + analyst_records JOIN으로 연관성 분석
-- 기준3 분석: analyst_records의 price_trend 데이터 직접 분석

