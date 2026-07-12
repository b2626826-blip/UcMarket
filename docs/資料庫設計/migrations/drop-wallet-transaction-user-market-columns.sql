-- Historical one-purpose migration retained for databases from before the
-- WalletTransaction entity used wallet_id + reference_type/reference_id.

BEGIN;

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_user;
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_transactions_market;
DROP INDEX IF EXISTS idx_wallet_transactions_user_id;
DROP INDEX IF EXISTS idx_wallet_transactions_market_id;
ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS user_id;
ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS market_id;

COMMIT;
