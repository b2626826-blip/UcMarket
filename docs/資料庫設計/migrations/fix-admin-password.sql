-- Update admin_shung password to match mock data hash (password = "password")
UPDATE users 
SET password_hash = '$2a$10$87qcikpCyzeG36F1RIXqyO2n3.QJHfbgWJQK3o30SzeK2n.mDypuS'
WHERE email = 'admin.shung@ucmarket.test';

-- Verify update
SELECT email, password_hash FROM users WHERE email = 'admin.shung@ucmarket.test';
