-- UcMarket: 新增 code 欄位以實現 UUID 可視化
-- 執行順序：先跑 SEQUENCE → 再跑 ALTER TABLE → 最後加 CONSTRAINT
-- 此腳本可重複執行（IF NOT EXISTS / DROP IF EXISTS）

-- ========================
-- STEP 1: CREATE SEQUENCE (IF NOT EXISTS)
-- ========================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'seq_user_code') THEN
        CREATE SEQUENCE seq_user_code START 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'seq_market_code') THEN
        CREATE SEQUENCE seq_market_code START 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'seq_trade_code') THEN
        CREATE SEQUENCE seq_trade_code START 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'seq_admin_log_code') THEN
        CREATE SEQUENCE seq_admin_log_code START 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'seq_market_review_code') THEN
        CREATE SEQUENCE seq_market_review_code START 1;
    END IF;
END $$;

-- ========================
-- STEP 2: ALTER TABLE ADD COLUMN
-- ========================

ALTER TABLE users         ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE markets       ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE trades        ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE admin_logs    ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE market_reviews ADD COLUMN IF NOT EXISTS code VARCHAR(32);

-- ========================
-- STEP 3: UNIQUE CONSTRAINT
-- (先 DROP 再 CREATE，確保可重複執行)
-- ========================

ALTER TABLE users         DROP CONSTRAINT IF EXISTS uk_users_code;
ALTER TABLE users         ADD CONSTRAINT uk_users_code UNIQUE (code);

ALTER TABLE markets       DROP CONSTRAINT IF EXISTS uk_markets_code;
ALTER TABLE markets       ADD CONSTRAINT uk_markets_code UNIQUE (code);

ALTER TABLE trades        DROP CONSTRAINT IF EXISTS uk_trades_code;
ALTER TABLE trades        ADD CONSTRAINT uk_trades_code UNIQUE (code);

ALTER TABLE admin_logs    DROP CONSTRAINT IF EXISTS uk_admin_logs_code;
ALTER TABLE admin_logs    ADD CONSTRAINT uk_admin_logs_code UNIQUE (code);

ALTER TABLE market_reviews DROP CONSTRAINT IF EXISTS uk_market_reviews_code;
ALTER TABLE market_reviews ADD CONSTRAINT uk_market_reviews_code UNIQUE (code);
