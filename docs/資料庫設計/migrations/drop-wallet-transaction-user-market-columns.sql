-- Align wallet_transactions with WalletTransaction entity.
-- user_id is derived through wallet_id -> wallets.user_id.
-- market/trade source is tracked through reference_type and reference_id.

BEGIN;

CREATE OR REPLACE VIEW v_ranking_profit AS
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

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_user;
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_market;

DROP INDEX IF EXISTS idx_wallet_transactions_user_id;
DROP INDEX IF EXISTS idx_wallet_transactions_market_id;

ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS user_id;
ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS market_id;

COMMIT;
