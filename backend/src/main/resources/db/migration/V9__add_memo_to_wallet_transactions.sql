ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS memo VARCHAR(255);
