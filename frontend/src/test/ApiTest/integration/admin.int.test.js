import { describe, it, expect, beforeAll } from 'vitest';
import { setToken } from '../../../api/client';
import { register, login } from '../../../api/authApi';
import { getDashboardStats } from '../../../api/adminApi';

// 整合測試：打真後端。預設略過，見 currentAffairs.int.test.js 說明。
const RUN = process.env.RUN_INTEGRATION === '1';
const BASE = 'http://localhost:8080';
const ADMIN_STATS = '/api/admin/dashboard/stats';

// admin 正向測試需憑證，用環境變數帶入；未設定時自動略過：
//   TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... RUN_INTEGRATION=1 npm run test -- --run
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

describe.runIf(RUN)('[integration] admin 授權邊界', () => {
  let userToken;

  beforeAll(async () => {
    // 用拋棄式 USER 帳號驗證「非 admin 被擋」
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const auth = await register(`itadmin_${suffix}`, `itadmin_${suffix}@example.com`, 'Test-1234');
    userToken = auth.accessToken;
  });

  // 用原生 fetch 直接檢查 HTTP 狀態碼（client 的 handleResponse 會把 401/403 吞成 null）
  it('USER token 打 /api/admin/** → 403', async () => {
    const res = await fetch(BASE + ADMIN_STATS, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('無 token 打 /api/admin/** → 401 或 403', async () => {
    const res = await fetch(BASE + ADMIN_STATS);
    expect([401, 403]).toContain(res.status);
  });
});

describe.runIf(RUN && ADMIN_EMAIL && ADMIN_PASSWORD)('[integration] admin 正向', () => {
  beforeAll(async () => {
    const auth = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(auth.user.role).toBe('ADMIN');
    setToken(auth.accessToken);
  });

  it('admin 可讀 /api/admin/dashboard/stats', async () => {
    const stats = await getDashboardStats();
    expect(stats).toBeTruthy();
  });
});
