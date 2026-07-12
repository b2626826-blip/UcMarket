-- UcMarket current-schema demo data.
-- Run after ../ucmarket-ddl.sql. Safe to rerun for these fixed UUIDs.
-- Demo password for all password users: password

BEGIN;

DELETE FROM admin_logs WHERE id::text LIKE '00000000-0000-4011-8000-%';
DELETE FROM wallet_transactions WHERE id::text LIKE '00000000-0000-4008-8000-%';
DELETE FROM market_price_history WHERE id::text LIKE '00000000-0000-4007-8000-%';
DELETE FROM positions WHERE id::text LIKE '00000000-0000-4006-8000-%';
DELETE FROM trades WHERE id::text LIKE '00000000-0000-4005-8000-%';
DELETE FROM market_reviews WHERE id::text LIKE '00000000-0000-4004-8000-%';
DELETE FROM markets WHERE id::text LIKE '00000000-0000-4003-8000-%';
DELETE FROM user_sessions WHERE id::text LIKE '00000000-0000-4001-8000-%';
DELETE FROM wallets WHERE id::text LIKE '00000000-0000-4002-8000-%';
DELETE FROM users WHERE id::text LIKE '00000000-0000-4000-8000-%';

INSERT INTO users (
    id, code, username, email, password_hash, role, status, reputation,
    avatar_url, bio, created_at, updated_at
) VALUES
    ('00000000-0000-4000-8000-000000000001', 'USR-0001', 'admin_shung',
     'admin.shung@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS',
     'ADMIN', 'ACTIVE', 980, NULL, 'Demo administrator', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'USR-0002', 'rainmaker',
     'rainmaker@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS',
     'USER', 'ACTIVE', 420, NULL, 'Current-affairs trader', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'USR-0003', 'portfolio_kai',
     'portfolio.kai@ucmarket.test', '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS',
     'USER', 'ACTIVE', 610, NULL, 'Resolved-market ranking demo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO user_sessions (
    id, user_id, refresh_token_hash, expires_at, ip_address, created_at
) VALUES (
    '00000000-0000-4001-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    'mock_refresh_rainmaker_001', CURRENT_TIMESTAMP + INTERVAL '7 days',
    '127.0.0.1', CURRENT_TIMESTAMP
);

INSERT INTO wallets (id, user_id, balance, locked_balance, version, created_at, updated_at) VALUES
    ('00000000-0000-4002-8000-000000000001', '00000000-0000-4000-8000-000000000001', 50000, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4002-8000-000000000002', '00000000-0000-4000-8000-000000000002', 9700, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4002-8000-000000000003', '00000000-0000-4000-8000-000000000003', 11754.39, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO markets (
    id, code, title, description, category, source_url, image_url, resolution_rule,
    market_type, creator_id, close_at, status, result, approved_at, approved_by,
    resolved_at, resolved_by, yes_pool, no_pool, created_at, updated_at
) VALUES
    ('00000000-0000-4003-8000-000000000001', 'MKT-0001',
     '台灣會在 2026 年底前公布 AI 基本法草案嗎？', '追蹤主管機關正式公告。',
     'CURRENT_AFFAIRS', 'https://www.ndc.gov.tw/', 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
     '主管機關於期限前正式公布草案全文則為 YES。', 'BINARY',
     '00000000-0000-4000-8000-000000000002', '2026-12-31 23:59:59', 'ACTIVE', NULL,
     CURRENT_TIMESTAMP, '00000000-0000-4000-8000-000000000001', NULL, NULL,
     1300, 700, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4003-8000-000000000002', 'MKT-0002',
     '示範已結算市場結果是否為 NO？', '供排行榜與結算資料示範。',
     'CURRENT_AFFAIRS', 'https://example.com/source', NULL,
     '示範資料固定結算為 NO。', 'BINARY',
     '00000000-0000-4000-8000-000000000003', CURRENT_TIMESTAMP - INTERVAL '1 day', 'RESOLVED', 'NO',
     CURRENT_TIMESTAMP - INTERVAL '3 days', '00000000-0000-4000-8000-000000000001',
     CURRENT_TIMESTAMP, '00000000-0000-4000-8000-000000000001',
     600, 1400, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP);

INSERT INTO market_reviews (id, code, market_id, reviewer_id, status, comment, created_at) VALUES
    ('00000000-0000-4004-8000-000000000001', 'REV-0001',
     '00000000-0000-4003-8000-000000000001', '00000000-0000-4000-8000-000000000001',
     'APPROVED', NULL, CURRENT_TIMESTAMP),
    ('00000000-0000-4004-8000-000000000002', 'REV-0002',
     '00000000-0000-4003-8000-000000000002', '00000000-0000-4000-8000-000000000001',
     'APPROVED', NULL, CURRENT_TIMESTAMP - INTERVAL '3 days');

INSERT INTO trades (
    id, code, user_id, market_id, side, action, amount, price, shares, created_at
) VALUES
    ('00000000-0000-4005-8000-000000000001', 'TRX-0001',
     '00000000-0000-4000-8000-000000000002', '00000000-0000-4003-8000-000000000001',
     'YES', 'BUY', 300, 0.50, 600, CURRENT_TIMESTAMP),
    ('00000000-0000-4005-8000-000000000002', 'TRX-0002',
     '00000000-0000-4000-8000-000000000003', '00000000-0000-4003-8000-000000000002',
     'NO', 'BUY', 1000, 0.57, 1754.3860, CURRENT_TIMESTAMP - INTERVAL '2 days');

INSERT INTO positions (
    id, user_id, market_id, yes_shares, no_shares, yes_cost, no_cost, status, updated_at
) VALUES
    ('00000000-0000-4006-8000-000000000001',
     '00000000-0000-4000-8000-000000000002', '00000000-0000-4003-8000-000000000001',
     600, 0, 300, 0, 'OPEN', CURRENT_TIMESTAMP),
    ('00000000-0000-4006-8000-000000000002',
     '00000000-0000-4000-8000-000000000003', '00000000-0000-4003-8000-000000000002',
     0, 1754.3860, 0, 1000, 'SETTLED', CURRENT_TIMESTAMP);

INSERT INTO market_price_history (
    id, market_id, option_id, yes_price, no_price, trade_volume, recorded_at
) VALUES
    ('00000000-0000-4007-8000-000000000001', '00000000-0000-4003-8000-000000000001',
     NULL, 0.65, 0.35, 300, CURRENT_TIMESTAMP),
    ('00000000-0000-4007-8000-000000000002', '00000000-0000-4003-8000-000000000002',
     NULL, 0.43, 0.57, 1000, CURRENT_TIMESTAMP - INTERVAL '2 days');

INSERT INTO wallet_transactions (
    id, wallet_id, type, amount, balance_after, reference_type, reference_id,
    idempotency_key, created_at
) VALUES
    ('00000000-0000-4008-8000-000000000001', '00000000-0000-4002-8000-000000000002',
     'TRADE_BUY', -300, 9700, 'TRADE', '00000000-0000-4005-8000-000000000001',
     'mock-trade-buy-001', CURRENT_TIMESTAMP),
    ('00000000-0000-4008-8000-000000000002', '00000000-0000-4002-8000-000000000003',
     'RESOLUTION_PAYOUT', 1754.39, 11754.39, 'MARKET', '00000000-0000-4003-8000-000000000002',
     'mock-resolution-payout-002', CURRENT_TIMESTAMP);

INSERT INTO admin_logs (
    id, code, admin_user_id, action, target_type, target_id, metadata, created_at
) VALUES (
    '00000000-0000-4011-8000-000000000001', 'LOG-0001',
    '00000000-0000-4000-8000-000000000001', 'MARKET_RESOLVE', 'MARKET',
    '00000000-0000-4003-8000-000000000002', '{"result":"NO"}', CURRENT_TIMESTAMP
);

SELECT setval('seq_user_code', (SELECT COUNT(*) FROM users));
SELECT setval('seq_market_code', (SELECT COUNT(*) FROM markets));
SELECT setval('seq_trade_code', (SELECT COUNT(*) FROM trades));
SELECT setval('seq_market_review_code', (SELECT COUNT(*) FROM market_reviews));
SELECT setval('seq_admin_log_code', (SELECT COUNT(*) FROM admin_logs));

COMMIT;
