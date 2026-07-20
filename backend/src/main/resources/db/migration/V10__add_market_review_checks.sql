CREATE TABLE market_review_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL,
    submission_version INTEGER NOT NULL,
    rule_code VARCHAR(64) NOT NULL,
    rule_version INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_market_review_checks_market
        FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT uk_market_review_checks_submission_rule
        UNIQUE (market_id, submission_version, rule_code, rule_version),
    CONSTRAINT ck_market_review_checks_submission_version
        CHECK (submission_version >= 1),
    CONSTRAINT ck_market_review_checks_rule_version
        CHECK (rule_version >= 1),
    CONSTRAINT ck_market_review_checks_status
        CHECK (status IN ('PASS', 'NEEDS_REVIEW', 'BLOCKED'))
);

CREATE INDEX idx_market_review_checks_market_submission
    ON market_review_checks (market_id, submission_version);

CREATE INDEX idx_market_review_checks_status
    ON market_review_checks (status);
