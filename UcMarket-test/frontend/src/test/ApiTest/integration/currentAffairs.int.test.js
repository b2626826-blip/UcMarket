import { describe, it, expect } from 'vitest';
import { getApi } from '../../../api/client';
import { getCurrentEventMarkets } from '../../../api/marketApi';
import { CURRENT_EVENT_CATEGORY } from '../../../types/market';

// 整合測試：打真後端 http://localhost:8080。
// 預設略過；要跑請先啟動 backend，再用：RUN_INTEGRATION=1 npm run test -- --run
// 斷言採「不變式」而非固定值，因 DB 資料未知（可能為空）。
const RUN = process.env.RUN_INTEGRATION === '1';

describe.runIf(RUN)('[integration] 時事市場', () => {
  it('後端 status filter：/api/markets?status=ACTIVE 只回 ACTIVE', async () => {
    const markets = await getApi('/api/markets?status=ACTIVE&size=50');
    expect(Array.isArray(markets)).toBe(true);
    for (const m of markets) {
      expect(m.status).toBe('ACTIVE');
    }
  });

  it('getCurrentEventMarkets：回 { content } 且皆為時事分類的 ACTIVE 市場', async () => {
    const result = await getCurrentEventMarkets({ status: 'ACTIVE', size: 6 });

    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    for (const market of result.content) {
      expect(market.category).toBe(CURRENT_EVENT_CATEGORY);
      expect(market.status).toBe('ACTIVE');
    }
  });
});
