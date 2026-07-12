-- UcMarket current PostgreSQL schema
-- Baseline: branch eagle, aligned with backend entities and native repository queries.
-- Hibernate does not create production tables (spring.jpa.hibernate.ddl-auto=none).
-- Future-only concepts such as market_options, notifications and portfolio snapshots
-- intentionally do not belong in this current-version DDL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS seq_user_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trade_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_admin_log_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_market_review_code START 1;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(128) NOT NULL,
    password_hash VARCHAR(128),
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    reputation INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_users_code UNIQUE (code),
    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'BANNED', 'DISABLED')),
    CONSTRAINT ck_users_reputation CHECK (reputation >= 0)
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
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_uid VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_oauth_provider_uid UNIQUE (provider, provider_uid),
    CONSTRAINT ck_oauth_provider CHECK (provider IN ('GOOGLE', 'FACEBOOK', 'GITHUB'))
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
    CONSTRAINT ck_wallets_locked_balance CHECK (locked_balance >= 0)
);

CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64),
    source_url TEXT,
    image_url TEXT,
    resolution_rule TEXT,
    market_type VARCHAR(32) NOT NULL DEFAULT 'BINARY',
    creator_id UUID NOT NULL,
    close_at TIMESTAMP NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    result VARCHAR(32),
    result_value NUMERIC(18, 2),
    approved_at TIMESTAMP,
    approved_by UUID,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    yes_pool NUMERIC(18, 2) NOT NULL DEFAULT 100,
    no_pool NUMERIC(18, 2) NOT NULL DEFAULT 100,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_markets_code UNIQUE (code),
    CONSTRAINT fk_markets_creator FOREIGN KEY (creator_id) REFERENCES users (id),
    CONSTRAINT fk_markets_approved_by FOREIGN KEY (approved_by) REFERENCES users (id),
    CONSTRAINT fk_markets_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id),
    CONSTRAINT ck_markets_status CHECK (
        status IN ('DRAFT', 'PENDING', 'ACTIVE', 'CLOSED', 'RESOLVED', 'REJECTED', 'CANCELED')
    ),
    CONSTRAINT ck_markets_result CHECK (result IS NULL OR result IN ('YES', 'NO')),
    CONSTRAINT ck_markets_yes_pool CHECK (yes_pool >= 0),
    CONSTRAINT ck_markets_no_pool CHECK (no_pool >= 0)
);

CREATE TABLE market_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    market_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_market_reviews_code UNIQUE (code),
    CONSTRAINT fk_market_reviews_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT fk_market_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id),
    CONSTRAINT ck_market_reviews_status CHECK (
        status IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
    )
);

CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32),
    user_id UUID NOT NULL,
    market_id UUID NOT NULL,
    side VARCHAR(32) NOT NULL,
    action VARCHAR(32) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    price NUMERIC(18, 4) NOT NULL,
    shares NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_trades_code UNIQUE (code),
    CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_trades_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT ck_trades_side CHECK (side IN ('YES', 'NO')),
    CONSTRAINT ck_trades_action CHECK (action IN ('BUY')),
    CONSTRAINT ck_trades_amount CHECK (amount > 0),
    CONSTRAINT ck_trades_price CHECK (price >= 0),
    CONSTRAINT ck_trades_shares CHECK (shares > 0)
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
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_positions_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_positions_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT ck_positions_yes_shares CHECK (yes_shares >= 0),
    CONSTRAINT ck_positions_no_shares CHECK (no_shares >= 0),
    CONSTRAINT ck_positions_yes_cost CHECK (yes_cost >= 0),
    CONSTRAINT ck_positions_no_cost CHECK (no_cost >= 0),
    CONSTRAINT ck_positions_status CHECK (status IN ('OPEN', 'SETTLED', 'CANCELED'))
);

-- There is no JPA entity for this read-model table. RankingRepository queries it
-- directly to value open positions. option_id remains as the current query's
-- binary-market discriminator; no market_options table is implemented yet.
CREATE TABLE market_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL,
    option_id UUID,
    yes_price NUMERIC(18, 4),
    no_price NUMERIC(18, 4),
    trade_volume NUMERIC(18, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_market_price_history_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT ck_market_price_history_yes_price CHECK (yes_price IS NULL OR yes_price >= 0),
    CONSTRAINT ck_market_price_history_no_price CHECK (no_price IS NULL OR no_price >= 0),
    CONSTRAINT ck_market_price_history_trade_volume CHECK (trade_volume >= 0)
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    balance_after NUMERIC(18, 2) NOT NULL,
    reference_type VARCHAR(255),
    reference_id UUID,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wallet_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id),
    CONSTRAINT ck_wallet_transactions_type CHECK (
        type IN ('SIGNUP_BONUS', 'TRADE_BUY', 'TRADE_SELL', 'RESOLUTION_PAYOUT', 'REFUND', 'BONUS', 'ADJUSTMENT')
    ),
    CONSTRAINT ck_wallet_transactions_balance_after CHECK (balance_after >= 0)
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

    CONSTRAINT uk_admin_logs_code UNIQUE (code),
    CONSTRAINT fk_admin_logs_admin_user FOREIGN KEY (admin_user_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX uk_wallet_transactions_idempotency_key
    ON wallet_transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- PositionRepository native upserts use this exact conflict target.
CREATE UNIQUE INDEX uk_positions_user_market_binary
    ON positions (user_id, market_id)
    WHERE option_id IS NULL;

CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX idx_oauth_user_id ON user_oauth_accounts (user_id);
CREATE INDEX idx_oauth_email ON user_oauth_accounts (email);
CREATE INDEX idx_markets_creator_id ON markets (creator_id);
CREATE INDEX idx_markets_status ON markets (status);
CREATE INDEX idx_markets_close_at ON markets (close_at);
CREATE INDEX idx_market_reviews_market_id ON market_reviews (market_id);
CREATE INDEX idx_market_reviews_reviewer_id ON market_reviews (reviewer_id);
CREATE INDEX idx_trades_user_id ON trades (user_id);
CREATE INDEX idx_trades_market_id ON trades (market_id);
CREATE INDEX idx_trades_created_at ON trades (created_at);
CREATE INDEX idx_positions_user_id ON positions (user_id);
CREATE INDEX idx_positions_market_id ON positions (market_id);
CREATE INDEX idx_positions_status ON positions (status);
CREATE INDEX idx_market_price_history_market_recorded
    ON market_price_history (market_id, recorded_at DESC);
CREATE INDEX idx_wallet_transactions_wallet_created
    ON wallet_transactions (wallet_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_reference
    ON wallet_transactions (reference_type, reference_id);
CREATE INDEX idx_admin_logs_admin_created
    ON admin_logs (admin_user_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs (target_type, target_id);

COMMENT ON TABLE users IS 'Users for password and OAuth sign-in.';
COMMENT ON TABLE user_sessions IS 'Refresh-token sessions.';
COMMENT ON TABLE user_oauth_accounts IS 'OAuth provider identities linked to users.';
COMMENT ON TABLE wallets IS 'One virtual-points wallet per user.';
COMMENT ON TABLE markets IS 'Binary prediction markets and review lifecycle.';
COMMENT ON TABLE market_reviews IS 'Administrator market review history.';
COMMENT ON TABLE trades IS 'Current implementation records BUY trades for YES or NO.';
COMMENT ON TABLE positions IS 'One binary position per user and market.';
COMMENT ON TABLE market_price_history IS 'Price read model used by ranking queries.';
COMMENT ON TABLE wallet_transactions IS 'Immutable wallet ledger entries.';
COMMENT ON TABLE admin_logs IS 'Administrator audit log.';
