ALTER TABLE trades
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trades_idempotency_key
    ON trades (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
