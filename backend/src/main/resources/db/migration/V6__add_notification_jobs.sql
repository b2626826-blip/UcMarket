ALTER TABLE markets
    ADD COLUMN IF NOT EXISTS submission_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    recipient_user_id UUID,
    recipient_email VARCHAR(255) NOT NULL,
    market_id UUID,
    payload JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP,
    locked_by VARCHAR(100),
    last_error VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    CONSTRAINT uq_notification_jobs_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX idx_notification_jobs_claim
    ON notification_jobs (status, next_attempt_at, created_at);

CREATE INDEX idx_notification_jobs_market_event
    ON notification_jobs (market_id, event_type);

CREATE TABLE notification_job_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES notification_jobs(id),
    attempt_no INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message VARCHAR(1000),
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    CONSTRAINT uq_notification_job_attempts_job_no UNIQUE (job_id, attempt_no)
);
