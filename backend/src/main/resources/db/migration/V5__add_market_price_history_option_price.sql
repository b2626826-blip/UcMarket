ALTER TABLE market_price_history
    ADD COLUMN IF NOT EXISTS option_price NUMERIC(18, 4);
