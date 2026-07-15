-- UcMarket OAuth 三方登入支援遷移
-- 適用情境：加入 Firebase Google / GitHub 登入，與原生帳號並存

-- OAuth 使用者沒有密碼，因此允許 NULL
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 記錄使用者綁定的第三方 OAuth 帳號
CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_uid VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_oauth_provider_uid UNIQUE (provider, provider_uid),
    CONSTRAINT ck_oauth_provider CHECK (provider IN ('GOOGLE', 'FACEBOOK', 'GITHUB'))
);

CREATE INDEX idx_oauth_user_id ON user_oauth_accounts (user_id);
CREATE INDEX idx_oauth_email ON user_oauth_accounts (email);

COMMENT ON TABLE user_oauth_accounts IS '使用者綁定的第三方 OAuth 帳號（Google / Facebook / GitHub）';
