CREATE TABLE market_resolution_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL,
    source_url VARCHAR(2048) NOT NULL,
    source_title VARCHAR(500) NOT NULL,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_market_resolution_evidence_market
        FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    CONSTRAINT uk_market_resolution_evidence_market_source
        UNIQUE (market_id, source_url)
);

CREATE INDEX idx_market_resolution_evidence_market_created
    ON market_resolution_evidence (market_id, created_at);
