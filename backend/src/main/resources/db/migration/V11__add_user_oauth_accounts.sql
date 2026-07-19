ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_uid VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_oauth_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_oauth_provider_uid
        UNIQUE (provider, provider_uid),
    CONSTRAINT ck_oauth_provider
        CHECK (provider IN ('GOOGLE', 'FACEBOOK', 'GITHUB'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_id
    ON user_oauth_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_email
    ON user_oauth_accounts (email);

COMMENT ON TABLE user_oauth_accounts IS
    'OAuth provider identities linked to users.';
