-- Sync an existing UcMarket PostgreSQL database to docs/資料庫設計/ucmarket-ddl.sql.
-- Intended for the current local database that already has the core tables.
-- Run after taking a backup. This script does not insert mock data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS seq_user_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trade_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_admin_log_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_review_code START 1;

ALTER TABLE users ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;

ALTER TABLE markets ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE markets ALTER COLUMN category TYPE VARCHAR(64);
ALTER TABLE markets ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE markets ALTER COLUMN status TYPE VARCHAR(32);
ALTER TABLE markets ALTER COLUMN result TYPE VARCHAR(32);
ALTER TABLE markets ALTER COLUMN yes_pool TYPE NUMERIC(18, 2);
ALTER TABLE markets ALTER COLUMN no_pool TYPE NUMERIC(18, 2);

ALTER TABLE market_reviews ADD COLUMN IF NOT EXISTS code VARCHAR(32);

ALTER TABLE trades ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE trades ALTER COLUMN side TYPE VARCHAR(32);
ALTER TABLE trades ALTER COLUMN action TYPE VARCHAR(32);
ALTER TABLE trades ALTER COLUMN amount TYPE NUMERIC(18, 2);
ALTER TABLE trades ALTER COLUMN price TYPE NUMERIC(18, 4);
ALTER TABLE trades ALTER COLUMN shares TYPE NUMERIC(18, 4);

ALTER TABLE positions ALTER COLUMN yes_shares TYPE NUMERIC(18, 4);
ALTER TABLE positions ALTER COLUMN no_shares TYPE NUMERIC(18, 4);
ALTER TABLE positions ALTER COLUMN yes_cost TYPE NUMERIC(18, 2);
ALTER TABLE positions ALTER COLUMN no_cost TYPE NUMERIC(18, 2);
ALTER TABLE positions ALTER COLUMN status TYPE VARCHAR(32);

ALTER TABLE wallets ALTER COLUMN balance TYPE NUMERIC(18, 2);
ALTER TABLE wallets ALTER COLUMN locked_balance TYPE NUMERIC(18, 2);
ALTER TABLE wallets ALTER COLUMN version SET DEFAULT 0;

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE wallet_transactions wt
SET user_id = w.user_id
FROM wallets w
WHERE wt.wallet_id = w.id
  AND wt.user_id IS NULL;
ALTER TABLE wallet_transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS market_id UUID;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE wallet_transactions ALTER COLUMN type TYPE VARCHAR(32);
ALTER TABLE wallet_transactions ALTER COLUMN amount TYPE NUMERIC(18, 2);
ALTER TABLE wallet_transactions ALTER COLUMN balance_after TYPE NUMERIC(18, 2);
ALTER TABLE wallet_transactions ALTER COLUMN reference_type TYPE VARCHAR(32);
ALTER TABLE wallet_transactions ALTER COLUMN idempotency_key TYPE VARCHAR(128);

CREATE TABLE IF NOT EXISTS user_portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    wallet_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    position_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_asset_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
    realized_profit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    unrealized_profit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_portfolio_snapshots_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_user_portfolio_snapshots_wallet_balance CHECK (wallet_balance >= 0),
    CONSTRAINT ck_user_portfolio_snapshots_position_value CHECK (position_value >= 0),
    CONSTRAINT ck_user_portfolio_snapshots_total_asset_value CHECK (total_asset_value >= 0)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    market_id UUID,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(128) NOT NULL,
    message TEXT,
    reference_type VARCHAR(32),
    reference_id UUID,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_notifications_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT ck_notifications_type CHECK (
        type IN ('TRADE_SUCCESS', 'MARKET_CLOSED', 'MARKET_RESOLVED', 'SYSTEM', 'ADMIN')
    )
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    admin_user_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_admin_logs_admin_user FOREIGN KEY (admin_user_id) REFERENCES users (id),
    CONSTRAINT uk_admin_logs_code UNIQUE (code)
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_users_code;
ALTER TABLE users ADD CONSTRAINT uk_users_code UNIQUE (code);

ALTER TABLE markets DROP CONSTRAINT IF EXISTS uk_markets_code;
ALTER TABLE markets ADD CONSTRAINT uk_markets_code UNIQUE (code);
ALTER TABLE markets DROP CONSTRAINT IF EXISTS ck_markets_submission_fields;
ALTER TABLE markets ADD CONSTRAINT ck_markets_submission_fields CHECK (
    status = 'DRAFT'
    OR (
        source_url IS NOT NULL
        AND btrim(source_url) <> ''
        AND resolution_rule IS NOT NULL
        AND btrim(resolution_rule) <> ''
    )
);
ALTER TABLE markets DROP CONSTRAINT IF EXISTS ck_markets_resolution_lifecycle;
ALTER TABLE markets ADD CONSTRAINT ck_markets_resolution_lifecycle CHECK (
    (
        status = 'RESOLVED'
        AND result IS NOT NULL
        AND resolved_at IS NOT NULL
        AND resolved_by IS NOT NULL
    )
    OR (
        status <> 'RESOLVED'
        AND result IS NULL
        AND resolved_at IS NULL
        AND resolved_by IS NULL
    )
);

ALTER TABLE market_reviews DROP CONSTRAINT IF EXISTS uk_market_reviews_code;
ALTER TABLE market_reviews ADD CONSTRAINT uk_market_reviews_code UNIQUE (code);
ALTER TABLE market_reviews DROP CONSTRAINT IF EXISTS ck_market_reviews_comment_required;
ALTER TABLE market_reviews ADD CONSTRAINT ck_market_reviews_comment_required CHECK (
    status = 'APPROVED'
    OR (comment IS NOT NULL AND btrim(comment) <> '')
);

ALTER TABLE trades DROP CONSTRAINT IF EXISTS uk_trades_code;
ALTER TABLE trades ADD CONSTRAINT uk_trades_code UNIQUE (code);

ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS uk_user_sessions_refresh_token_hash;
ALTER TABLE user_sessions ADD CONSTRAINT uk_user_sessions_refresh_token_hash UNIQUE (refresh_token_hash);
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS ck_user_sessions_expires_after_created;
ALTER TABLE user_sessions ADD CONSTRAINT ck_user_sessions_expires_after_created CHECK (expires_at > created_at);
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS ck_user_sessions_revoked_at_range;
ALTER TABLE user_sessions ADD CONSTRAINT ck_user_sessions_revoked_at_range CHECK (
    revoked_at IS NULL
    OR (revoked_at >= created_at AND revoked_at <= expires_at)
);

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_user;
ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_market;
ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_market FOREIGN KEY (market_id) REFERENCES markets (id);

ALTER TABLE wallets DROP CONSTRAINT IF EXISTS ck_wallets_version;
ALTER TABLE wallets ADD CONSTRAINT ck_wallets_version CHECK (version >= 0);

DROP INDEX IF EXISTS uk_positions_user_market;
CREATE UNIQUE INDEX IF NOT EXISTS uk_positions_user_market_binary
    ON positions (user_id, market_id)
    WHERE option_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_positions_user_market_option
    ON positions (user_id, market_id, option_id)
    WHERE option_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_market_id ON wallet_transactions (market_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_snapshots_user_recorded
    ON user_portfolio_snapshots (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_market_id ON notifications (market_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_created ON admin_logs (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs (target_type, target_id);

CREATE OR REPLACE VIEW v_ranking_profit AS
WITH payouts AS (
    SELECT
        user_id,
        SUM(amount) AS total_payout
    FROM wallet_transactions
    WHERE type = 'RESOLUTION_PAYOUT'
    GROUP BY user_id
),
settled_costs AS (
    SELECT
        user_id,
        SUM(yes_cost + no_cost + COALESCE(cost, 0)) AS settled_cost
    FROM positions
    WHERE status = 'SETTLED'
    GROUP BY user_id
)
SELECT
    u.id AS user_id,
    u.username,
    u.avatar_url,
    COALESCE(p.total_payout, 0) AS total_payout,
    COALESCE(sc.settled_cost, 0) AS settled_cost,
    COALESCE(p.total_payout, 0) - COALESCE(sc.settled_cost, 0) AS realized_profit
FROM users u
LEFT JOIN payouts p ON p.user_id = u.id
LEFT JOIN settled_costs sc ON sc.user_id = u.id;

CREATE OR REPLACE VIEW v_ranking_win_rate AS
WITH settled_predictions AS (
    SELECT
        p.user_id,
        p.market_id,
        CASE
            WHEN m.result = 'YES' AND p.yes_shares > p.no_shares THEN 1
            WHEN m.result = 'NO' AND p.no_shares > p.yes_shares THEN 1
            ELSE 0
        END AS is_correct
    FROM positions p
    JOIN markets m ON m.id = p.market_id
    WHERE m.status = 'RESOLVED'
)
SELECT
    u.id AS user_id,
    u.username,
    u.avatar_url,
    COUNT(sp.market_id) AS resolved_market_count,
    COALESCE(SUM(sp.is_correct), 0) AS correct_count,
    CASE
        WHEN COUNT(sp.market_id) = 0 THEN 0
        ELSE ROUND(SUM(sp.is_correct)::NUMERIC / COUNT(sp.market_id), 4)
    END AS win_rate
FROM users u
LEFT JOIN settled_predictions sp ON sp.user_id = u.id
GROUP BY u.id, u.username, u.avatar_url;

CREATE OR REPLACE VIEW v_ranking_assets AS
WITH latest_binary_price AS (
    SELECT DISTINCT ON (market_id)
        market_id,
        yes_price,
        no_price
    FROM market_price_history
    WHERE option_id IS NULL
    ORDER BY market_id, recorded_at DESC
),
open_position_values AS (
    SELECT
        p.user_id,
        SUM(
            (p.yes_shares * COALESCE(lbp.yes_price, 0))
            + (p.no_shares * COALESCE(lbp.no_price, 0))
        ) AS open_position_value
    FROM positions p
    JOIN markets m ON m.id = p.market_id
    LEFT JOIN latest_binary_price lbp ON lbp.market_id = p.market_id
    WHERE p.status = 'OPEN'
      AND m.status IN ('ACTIVE', 'CLOSED')
      AND p.option_id IS NULL
    GROUP BY p.user_id
)
SELECT
    u.id AS user_id,
    u.username,
    u.avatar_url,
    COALESCE(w.balance, 0) AS wallet_balance,
    COALESCE(opv.open_position_value, 0) AS open_position_value,
    COALESCE(w.balance, 0) + COALESCE(opv.open_position_value, 0) AS total_asset_value
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
LEFT JOIN open_position_values opv ON opv.user_id = u.id;

CREATE OR REPLACE VIEW v_hot_markets AS
WITH trade_volume AS (
    SELECT
        market_id,
        SUM(amount) AS total_trade_amount,
        COUNT(*) AS trade_count
    FROM trades
    GROUP BY market_id
),
latest_history AS (
    SELECT DISTINCT ON (market_id)
        market_id,
        trade_volume AS latest_recorded_volume,
        recorded_at
    FROM market_price_history
    ORDER BY market_id, recorded_at DESC
)
SELECT
    m.id AS market_id,
    m.title,
    m.category,
    m.status,
    COALESCE(tv.total_trade_amount, 0) AS total_trade_amount,
    COALESCE(tv.trade_count, 0) AS trade_count,
    COALESCE(lh.latest_recorded_volume, 0) AS latest_recorded_volume,
    lh.recorded_at AS latest_price_recorded_at
FROM markets m
LEFT JOIN trade_volume tv ON tv.market_id = m.id
LEFT JOIN latest_history lh ON lh.market_id = m.id;

COMMENT ON TABLE users IS '會員資料、角色、狀態與公開個人資料。';
COMMENT ON TABLE user_sessions IS '登入 session 或 refresh token 紀錄。';
COMMENT ON TABLE wallets IS '每位使用者一個虛擬點數錢包，balance 是 ledger amount 加總後的快照。';
COMMENT ON TABLE markets IS '預測市場主資料、審核狀態、流動池與結算結果。';
COMMENT ON TABLE market_reviews IS '管理員審核市場的紀錄。';
COMMENT ON TABLE market_options IS '進階多選項、次數型或數值區間市場的選項。';
COMMENT ON TABLE trades IS '使用者買入或賣出的交易紀錄。';
COMMENT ON TABLE positions IS '使用者在市場中的持倉。MVP 使用 yes/no shares，進階市場使用 option_id。';
COMMENT ON TABLE market_price_history IS '市場價格與成交量歷史。';
COMMENT ON TABLE wallet_transactions IS '錢包異動流水帳，包含扣款、結算、退款與獎勵；寫入後不應修改。';
COMMENT ON TABLE user_portfolio_snapshots IS '個人資產歷史快照，用於個人績效折線圖。';
COMMENT ON TABLE notifications IS '通知紀錄，用於交易成功、市場截止、結算等事件提醒。';
COMMENT ON TABLE admin_logs IS '後台操作稽核紀錄。';

COMMIT;
