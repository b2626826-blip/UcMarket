import { describe, it, expect, beforeAll } from 'vitest';
import { setToken } from '../../../api/client';
import { register, getCurrentUser } from '../../../api/authApi';
import { getWallet, getWalletTransactions } from '../../../api/walletApi';
import { getPositions } from '../../../api/positionApi';
import { getTrades } from '../../../api/tradeApi';

// 已知契約不符（保留前端、僅記錄，不修）：
//   getPositions() 打 GET /api/positions，但後端只有 /api/positions/me → 500
//   getTrades()    打 GET /api/trades，但後端 /api/trades 只有 POST → 500
//   （三個函式 getPositions/getTrades/getPositionDetail 前端零使用，屬死碼）
// 下列測試以「預期 reject 500」精確記錄現況；若後端補上路由或前端修正，會翻紅提醒。

// 整合測試：打真後端。使用者端 authed 端點以「註冊拋棄式帳號」自足取得 token。
// 僅做 GET，不建立交易，避免動到金流狀態。預設略過，見 currentAffairs.int.test.js 說明。
const RUN = process.env.RUN_INTEGRATION === '1';

describe.runIf(RUN)('[integration] 使用者端 authed 端點', () => {
  let email;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    email = `itest_${suffix}@example.com`;
    const auth = await register(`itest_${suffix}`, email, 'Test-1234');
    expect(auth.accessToken).toBeTruthy();
    setToken(auth.accessToken);
  });

  it('GET /api/auth/me：帶 token 回傳當前使用者', async () => {
    const me = await getCurrentUser();
    expect(me.email).toBe(email);
    expect(me.role).toBe('USER');
  });

  it('GET /api/wallets/me/balance：回傳錢包', async () => {
    const wallet = await getWallet();
    expect(wallet).toBeTruthy();
    // 註冊送點 → 應有 balance 欄位
    expect(wallet).toHaveProperty('balance');
  });

  it('GET /api/wallets/me/transactions：回傳交易紀錄', async () => {
    const txns = await getWalletTransactions(0);
    expect(txns).toBeTruthy();
  });

  it('GET /api/positions：已知契約不符，後端無 base 路由 → reject 500', async () => {
    await expect(getPositions()).rejects.toMatchObject({ status: 500 });
  });

  it('GET /api/trades：已知契約不符，後端不支援 GET → reject 500', async () => {
    await expect(getTrades()).rejects.toMatchObject({ status: 500 });
  });
});
