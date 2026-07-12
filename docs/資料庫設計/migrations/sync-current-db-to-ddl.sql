-- Align an existing UcMarket PostgreSQL database with ../ucmarket-ddl.sql.
-- Back up the database first. This migration removes abandoned future-schema
-- objects and columns that are not mapped by the current application.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS seq_user_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trade_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_admin_log_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_review_code START 1;

ALTER TABLE users ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE markets ALTER COLUMN category TYPE VARCHAR(64);
ALTER TABLE markets ALTER COLUMN status SET DEFAULT 'DRAFT';

ALTER TABLE market_reviews ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS code VARCHAR(32);

ALTER TABLE trades DROP COLUMN IF EXISTS option_id CASCADE;
ALTER TABLE trades ALTER COLUMN side SET NOT NULL;
ALTER TABLE trades ALTER COLUMN action DROP DEFAULT;

ALTER TABLE positions ADD COLUMN IF NOT EXISTS option_id UUID;
ALTER TABLE positions DROP COLUMN IF EXISTS shares;
ALTER TABLE positions DROP COLUMN IF EXISTS cost;

ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS market_id CASCADE;
ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS metadata;
ALTER TABLE wallet_transactions ALTER COLUMN reference_type TYPE VARCHAR(255);
ALTER TABLE wallet_transactions ALTER COLUMN idempotency_key TYPE VARCHAR(255);

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_uid VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_oauth_provider_uid UNIQUE (provider, provider_uid)
);

CREATE TABLE IF NOT EXISTS market_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets (id),
    option_id UUID,
    yes_price NUMERIC(18, 4),
    no_price NUMERIC(18, 4),
    trade_volume NUMERIC(18, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE market_price_history DROP COLUMN IF EXISTS option_price;

CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    admin_user_id UUID NOT NULL REFERENCES users (id),
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP VIEW IF EXISTS v_ranking_profit;
DROP VIEW IF EXISTS v_ranking_win_rate;
DROP VIEW IF EXISTS v_ranking_assets;
DROP VIEW IF EXISTS v_hot_markets;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_portfolio_snapshots;
DROP TABLE IF EXISTS market_options CASCADE;

DROP INDEX IF EXISTS uk_positions_user_market_binary;
DROP INDEX IF EXISTS uk_positions_user_market_option;
ALTER TABLE positions DROP CONSTRAINT IF EXISTS uk_positions_user_market;
CREATE UNIQUE INDEX uk_positions_user_market_binary
    ON positions (user_id, market_id)
    WHERE option_id IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_users_code;
ALTER TABLE users ADD CONSTRAINT uk_users_code UNIQUE (code);
ALTER TABLE markets DROP CONSTRAINT IF EXISTS uk_markets_code;
ALTER TABLE markets ADD CONSTRAINT uk_markets_code UNIQUE (code);
ALTER TABLE market_reviews DROP CONSTRAINT IF EXISTS uk_market_reviews_code;
ALTER TABLE market_reviews ADD CONSTRAINT uk_market_reviews_code UNIQUE (code);
ALTER TABLE trades DROP CONSTRAINT IF EXISTS uk_trades_code;
ALTER TABLE trades ADD CONSTRAINT uk_trades_code UNIQUE (code);
ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS uk_admin_logs_code;
ALTER TABLE admin_logs ADD CONSTRAINT uk_admin_logs_code UNIQUE (code);

CREATE UNIQUE INDEX IF NOT EXISTS uk_wallet_transactions_idempotency_key
    ON wallet_transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_price_history_market_recorded
    ON market_price_history (market_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created
    ON wallet_transactions (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_created
    ON admin_logs (admin_user_id, created_at DESC);

COMMIT;
