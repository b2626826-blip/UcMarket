-- UcMarket consolidated PostgreSQL DDL
-- Sources: docs/*, backend entities, and 個人er/*.xlsx.
-- Design goal: one canonical table per concept; ranking is computed by views.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Human-readable code sequences (UUID display identifier)
CREATE SEQUENCE IF NOT EXISTS seq_user_code         START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_code       START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trade_code        START 1;
CREATE SEQUENCE IF NOT EXISTS seq_admin_log_code    START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_review_code START 1;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(128) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    reputation INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'BANNED', 'DISABLED')),
    CONSTRAINT ck_users_reputation CHECK (reputation >= 0),
    CONSTRAINT uk_users_code UNIQUE (code)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    refresh_token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    ip_address VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_user_sessions_refresh_token_hash UNIQUE (refresh_token_hash),
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_user_sessions_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT ck_user_sessions_revoked_at_range CHECK (
        revoked_at IS NULL
        OR (revoked_at >= created_at AND revoked_at <= expires_at)
    )
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    locked_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_wallets_user_id UNIQUE (user_id),
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_wallets_balance CHECK (balance >= 0),
    CONSTRAINT ck_wallets_locked_balance CHECK (locked_balance >= 0),
    CONSTRAINT ck_wallets_version CHECK (version >= 0)
);

CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    creator_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64),
    market_type VARCHAR(32) NOT NULL DEFAULT 'BINARY',
    source_url TEXT,
    resolution_rule TEXT,
    close_at TIMESTAMP NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    result VARCHAR(32),
    result_value NUMERIC(18, 2),
    yes_pool NUMERIC(18, 2) NOT NULL DEFAULT 100,
    no_pool NUMERIC(18, 2) NOT NULL DEFAULT 100,
    approved_at TIMESTAMP,
    approved_by UUID,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_markets_creator FOREIGN KEY (creator_id) REFERENCES users (id),
    CONSTRAINT fk_markets_approved_by FOREIGN KEY (approved_by) REFERENCES users (id),
    CONSTRAINT fk_markets_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id),
    CONSTRAINT ck_markets_market_type CHECK (market_type IN ('BINARY', 'COUNT_RANGE', 'MULTIPLE_CHOICE')),
    CONSTRAINT ck_markets_status CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'CLOSED', 'RESOLVED', 'REJECTED', 'CANCELED')),
    CONSTRAINT ck_markets_result CHECK (result IS NULL OR result IN ('YES', 'NO')),
    CONSTRAINT ck_markets_yes_pool CHECK (yes_pool >= 0),
    CONSTRAINT ck_markets_no_pool CHECK (no_pool >= 0),
    CONSTRAINT ck_markets_approved_pair CHECK (
        (approved_at IS NULL AND approved_by IS NULL)
        OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
    ),
    CONSTRAINT ck_markets_resolved_pair CHECK (
        (resolved_at IS NULL AND resolved_by IS NULL)
        OR (resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
    ),
    CONSTRAINT ck_markets_submission_fields CHECK (
        status = 'DRAFT'
        OR (
            source_url IS NOT NULL
            AND btrim(source_url) <> ''
            AND resolution_rule IS NOT NULL
            AND btrim(resolution_rule) <> ''
        )
    ),
    CONSTRAINT ck_markets_resolution_lifecycle CHECK (
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
    ),
    CONSTRAINT uk_markets_code UNIQUE (code)
);

CREATE TABLE market_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    market_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_market_reviews_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT fk_market_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id),
    CONSTRAINT ck_market_reviews_status CHECK (status IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    CONSTRAINT ck_market_reviews_comment_required CHECK (
        status = 'APPROVED'
        OR (comment IS NOT NULL AND btrim(comment) <> '')
    ),
    CONSTRAINT uk_market_reviews_code UNIQUE (code)
);

CREATE TABLE market_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL,
    label VARCHAR(128) NOT NULL,
    min_value NUMERIC(18, 2),
    max_value NUMERIC(18, 2),
    pool NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_winning_option BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_market_options_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT uk_market_options_sort_order UNIQUE (market_id, sort_order),
    CONSTRAINT ck_market_options_pool CHECK (pool >= 0),
    CONSTRAINT ck_market_options_range CHECK (
        min_value IS NULL
        OR max_value IS NULL
        OR min_value <= max_value
    )
);

CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    user_id UUID NOT NULL,
    market_id UUID NOT NULL,
    option_id UUID,
    side VARCHAR(32),
    action VARCHAR(32) NOT NULL DEFAULT 'BUY',
    amount NUMERIC(18, 2) NOT NULL,
    price NUMERIC(18, 4) NOT NULL,
    shares NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_trades_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT fk_trades_option FOREIGN KEY (option_id) REFERENCES market_options (id),
    CONSTRAINT ck_trades_side CHECK (side IS NULL OR side IN ('YES', 'NO')),
    CONSTRAINT ck_trades_action CHECK (action IN ('BUY', 'SELL')),
    CONSTRAINT ck_trades_amount CHECK (amount > 0),
    CONSTRAINT ck_trades_price CHECK (price >= 0),
    CONSTRAINT ck_trades_shares CHECK (shares > 0),
    CONSTRAINT ck_trades_binary_or_option CHECK (
        (side IS NOT NULL AND option_id IS NULL)
        OR (side IS NULL AND option_id IS NOT NULL)
    ),
    CONSTRAINT uk_trades_code UNIQUE (code)
);

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    market_id UUID NOT NULL,
    option_id UUID,
    yes_shares NUMERIC(18, 4) NOT NULL DEFAULT 0,
    no_shares NUMERIC(18, 4) NOT NULL DEFAULT 0,
    yes_cost NUMERIC(18, 2) NOT NULL DEFAULT 0,
    no_cost NUMERIC(18, 2) NOT NULL DEFAULT 0,
    shares NUMERIC(18, 4),
    cost NUMERIC(18, 2),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_positions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_positions_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT fk_positions_option FOREIGN KEY (option_id) REFERENCES market_options (id),
    CONSTRAINT ck_positions_yes_shares CHECK (yes_shares >= 0),
    CONSTRAINT ck_positions_no_shares CHECK (no_shares >= 0),
    CONSTRAINT ck_positions_yes_cost CHECK (yes_cost >= 0),
    CONSTRAINT ck_positions_no_cost CHECK (no_cost >= 0),
    CONSTRAINT ck_positions_shares CHECK (shares IS NULL OR shares >= 0),
    CONSTRAINT ck_positions_cost CHECK (cost IS NULL OR cost >= 0),
    CONSTRAINT ck_positions_status CHECK (status IN ('OPEN', 'SETTLED', 'CANCELED'))
);

CREATE TABLE market_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL,
    option_id UUID,
    yes_price NUMERIC(18, 4),
    no_price NUMERIC(18, 4),
    option_price NUMERIC(18, 4),
    trade_volume NUMERIC(18, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_market_price_history_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT fk_market_price_history_option FOREIGN KEY (option_id) REFERENCES market_options (id),
    CONSTRAINT ck_market_price_history_yes_price CHECK (yes_price IS NULL OR yes_price >= 0),
    CONSTRAINT ck_market_price_history_no_price CHECK (no_price IS NULL OR no_price >= 0),
    CONSTRAINT ck_market_price_history_option_price CHECK (option_price IS NULL OR option_price >= 0),
    CONSTRAINT ck_market_price_history_trade_volume CHECK (trade_volume >= 0),
    CONSTRAINT ck_market_price_history_binary_or_option CHECK (
        (option_id IS NULL AND yes_price IS NOT NULL AND no_price IS NOT NULL AND option_price IS NULL)
        OR (option_id IS NOT NULL AND option_price IS NOT NULL)
    )
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    balance_after NUMERIC(18, 2) NOT NULL,
    reference_type VARCHAR(32),
    reference_id UUID,
    idempotency_key VARCHAR(128),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wallet_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id),
    CONSTRAINT ck_wallet_transactions_type CHECK (
        type IN ('SIGNUP_BONUS', 'TRADE_BUY', 'TRADE_SELL', 'RESOLUTION_PAYOUT', 'REFUND', 'BONUS', 'ADJUSTMENT')
    ),
    CONSTRAINT ck_wallet_transactions_reference_type CHECK (
        reference_type IS NULL
        OR reference_type IN ('BONUS', 'TRADE', 'MARKET', 'ADJUSTMENT', 'ADMIN', 'SYSTEM')
    ),
    CONSTRAINT ck_wallet_transactions_balance_after CHECK (balance_after >= 0)
);

CREATE TABLE user_portfolio_snapshots (
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

CREATE TABLE notifications (
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

CREATE TABLE admin_logs (
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

-- Unique keys and indexes

CREATE UNIQUE INDEX uk_positions_user_market_binary
    ON positions (user_id, market_id)
    WHERE option_id IS NULL;

CREATE UNIQUE INDEX uk_positions_user_market_option
    ON positions (user_id, market_id, option_id)
    WHERE option_id IS NOT NULL;

CREATE UNIQUE INDEX uk_wallet_transactions_idempotency_key
    ON wallet_transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions (expires_at);

CREATE INDEX idx_markets_creator_id ON markets (creator_id);
CREATE INDEX idx_markets_status ON markets (status);
CREATE INDEX idx_markets_close_at ON markets (close_at);
CREATE INDEX idx_markets_approved_by ON markets (approved_by);
CREATE INDEX idx_markets_resolved_by ON markets (resolved_by);

CREATE INDEX idx_market_reviews_market_id ON market_reviews (market_id);
CREATE INDEX idx_market_reviews_reviewer_id ON market_reviews (reviewer_id);
CREATE INDEX idx_market_options_market_id ON market_options (market_id);

CREATE INDEX idx_trades_user_id ON trades (user_id);
CREATE INDEX idx_trades_market_id ON trades (market_id);
CREATE INDEX idx_trades_option_id ON trades (option_id);
CREATE INDEX idx_trades_created_at ON trades (created_at);

CREATE INDEX idx_positions_user_id ON positions (user_id);
CREATE INDEX idx_positions_market_id ON positions (market_id);
CREATE INDEX idx_positions_option_id ON positions (option_id);
CREATE INDEX idx_positions_status ON positions (status);

CREATE INDEX idx_market_price_history_market_id ON market_price_history (market_id);
CREATE INDEX idx_market_price_history_option_id ON market_price_history (option_id);
CREATE INDEX idx_market_price_history_recorded_at ON market_price_history (recorded_at);

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions (wallet_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions (created_at);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions (reference_type, reference_id);

CREATE INDEX idx_user_portfolio_snapshots_user_recorded
    ON user_portfolio_snapshots (user_id, recorded_at DESC);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_market_id ON notifications (market_id);
CREATE INDEX idx_admin_logs_admin_created ON admin_logs (admin_user_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs (target_type, target_id);

-- Ranking and reporting views

CREATE VIEW v_ranking_profit AS
WITH payouts AS (
    SELECT
        w.user_id,
        SUM(wt.amount) AS total_payout
    FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    WHERE wt.type = 'RESOLUTION_PAYOUT'
    GROUP BY w.user_id
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

CREATE VIEW v_ranking_win_rate AS
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

CREATE VIEW v_ranking_assets AS
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

CREATE VIEW v_hot_markets AS
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
