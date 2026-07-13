INSERT INTO users (
    id,
    code,
    username,
    email,
    password_hash,
    role,
    status,
    reputation,
    bio,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'SYS-WEATHER',
    'system_weather',
    'system.weather@ucmarket.local',
    '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS',
    'ADMIN',
    'DISABLED',
    0,
    'System owner for automated weather markets.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
