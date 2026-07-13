CREATE SEQUENCE IF NOT EXISTS seq_user_code START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_market_code START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_trade_code START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_admin_log_code START WITH 100;
CREATE SEQUENCE IF NOT EXISTS seq_market_review_code START WITH 100;

CREATE TABLE IF NOT EXISTS market_price_history (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    market_id UUID NOT NULL,
    option_id UUID,
    yes_price NUMERIC(18, 4),
    no_price NUMERIC(18, 4),
    option_price NUMERIC(18, 4),
    trade_volume NUMERIC(18, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE positions ADD COLUMN IF NOT EXISTS option_id UUID;

INSERT INTO users (
    id, code, username, email, password_hash, role, status, reputation,
    last_login_at, avatar_url, bio, created_at, updated_at
) VALUES
    ('00000000-0000-4000-8000-000000000001', 'USR-0001', 'admin_shung', 'admin.shung@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'ADMIN', 'ACTIVE', 980, '2026-06-01 21:10:00', null, null, '2026-05-20 09:00:00', '2026-06-01 21:10:00'),
    ('00000000-0000-4000-8000-000000000002', 'USR-0002', 'admin_mina', 'admin.mina@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'ADMIN', 'ACTIVE', 860, '2026-06-01 18:35:00', null, null, '2026-05-20 09:05:00', '2026-06-01 18:35:00'),
    ('00000000-0000-4000-8000-000000000003', 'USR-0003', 'rainmaker', 'rainmaker@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'USER', 'ACTIVE', 420, '2026-06-01 20:22:00', null, null, '2026-05-21 10:00:00', '2026-06-01 20:22:00'),
    ('00000000-0000-4000-8000-000000000004', 'USR-0004', 'macro_cat', 'macro.cat@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'USER', 'ACTIVE', 360, '2026-06-01 19:45:00', null, null, '2026-05-21 11:15:00', '2026-06-01 19:45:00'),
    ('00000000-0000-4000-8000-000000000005', 'USR-0005', 'sports_lee', 'sports.lee@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'USER', 'ACTIVE', 275, '2026-06-01 17:04:00', null, null, '2026-05-22 13:30:00', '2026-06-01 17:04:00'),
    ('00000000-0000-4000-8000-000000000006', 'USR-0006', 'tech_luna', 'tech.luna@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'USER', 'ACTIVE', 510, '2026-06-01 22:12:00', null, null, '2026-05-23 08:40:00', '2026-06-01 22:12:00'),
    ('00000000-0000-4000-8000-000000000008', 'USR-0008', 'banned_demo', 'banned.demo@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'USER', 'BANNED', 0, '2026-05-25 09:10:00', null, null, '2026-05-24 15:00:00', '2026-05-30 12:00:00'),
    ('00000000-0000-4000-8000-000000000009', 'USR-0009', 'disabled_demo', 'disabled.demo@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS', 'USER', 'DISABLED', 15, null, null, null, '2026-05-25 16:20:00', '2026-05-30 12:30:00');

INSERT INTO wallets (
    id, user_id, balance, locked_balance, version, created_at, updated_at
) VALUES
    ('00000000-0000-4002-8000-000000000002', '00000000-0000-4000-8000-000000000002', 42000.00, 0.00, 1, '2026-05-20 09:05:00', '2026-06-01 18:35:00'),
    ('00000000-0000-4002-8000-000000000003', '00000000-0000-4000-8000-000000000003', 12800.00, 1200.00, 3, '2026-05-21 10:00:00', '2026-06-01 20:22:00');

INSERT INTO markets (
    id, code, creator_id, title, description, category, market_type, source_url, resolution_rule,
    close_at, status, result, result_value, yes_pool, no_pool,
    approved_at, approved_by, resolved_at, resolved_by, created_at, updated_at
) VALUES
    ('00000000-0000-4003-8000-000000000001', 'MKT-0001', '00000000-0000-4000-8000-000000000003', 'Rain market', 'Rain market', 'WEATHER', 'BINARY', 'https://example.com', 'Official result', '2026-06-05 23:59:59', 'ACTIVE', null, null, 1680.00, 1320.00, '2026-05-29 14:00:00', '00000000-0000-4000-8000-000000000001', null, null, '2026-05-29 09:30:00', '2026-05-29 14:00:00'),
    ('00000000-0000-4003-8000-000000000002', 'MKT-0002', '00000000-0000-4000-8000-000000000004', 'Pending market', 'Pending market', 'ECONOMY', 'BINARY', 'https://example.com', 'Official result', '2026-07-15 20:30:00', 'PENDING', null, null, 100.00, 100.00, null, null, null, null, '2026-06-01 10:00:00', '2026-06-01 10:20:00'),
    ('00000000-0000-4003-8000-000000000003', 'MKT-0003', '00000000-0000-4000-8000-000000000006', 'Draft market', 'Draft market', 'TECH', 'BINARY', null, null, '2026-09-30 23:59:59', 'DRAFT', null, null, 100.00, 100.00, null, null, null, null, '2026-06-01 11:30:00', '2026-06-01 11:30:00'),
    ('00000000-0000-4003-8000-000000000004', 'MKT-0004', '00000000-0000-4000-8000-000000000005', 'Active market 2', 'Active market 2', 'SPORTS', 'BINARY', 'https://example.com', 'Official result', '2026-06-30 23:59:59', 'ACTIVE', null, null, 1210.00, 1890.00, '2026-05-30 16:00:00', '00000000-0000-4000-8000-000000000001', null, null, '2026-05-30 10:10:00', '2026-05-30 16:00:00'),
    ('00000000-0000-4003-8000-000000000006', 'MKT-0006', '00000000-0000-4000-8000-000000000003', 'Resolved market', 'Resolved market', 'CRYPTO', 'BINARY', 'https://example.com', 'Official result', '2026-06-01 23:59:59', 'RESOLVED', 'NO', null, 2150.00, 2860.00, '2026-05-27 13:00:00', '00000000-0000-4000-8000-000000000002', '2026-06-02 01:00:00', '00000000-0000-4000-8000-000000000002', '2026-05-27 09:00:00', '2026-06-02 01:00:00'),
    ('00000000-0000-4003-8000-000000000008', 'MKT-0008', '00000000-0000-4000-8000-000000000006', 'Active market 3', 'Active market 3', 'TECH', 'BINARY', 'https://example.com', 'Official result', '2026-12-31 23:59:59', 'ACTIVE', null, null, 2400.00, 1600.00, '2026-05-29 18:00:00', '00000000-0000-4000-8000-000000000002', null, null, '2026-05-29 12:45:00', '2026-05-29 18:00:00');
