import { describe, it, expect } from 'vitest';
import { getApi } from '../../../api/client';
import { fetchRankings, rankingApiEndpoints } from '../../../api/rankingApi';

// 整合測試：打真後端。預設略過，見 currentAffairs.int.test.js 說明。
const RUN = process.env.RUN_INTEGRATION === '1';

describe.runIf(RUN)('[integration] 排行榜', () => {
  it.each(Object.entries(rankingApiEndpoints))(
    '端點 %s 回傳陣列',
    async (_type, path) => {
      const rows = await getApi(path);
      expect(Array.isArray(rows)).toBe(true);
    },
  );

  it.each(['profit', 'win-rate', 'assets'])(
    'fetchRankings(%s)：回陣列、rank 由 1 連續遞增',
    async (type) => {
      const rows = await fetchRankings(type);
      expect(Array.isArray(rows)).toBe(true);
      rows.forEach((row, index) => {
        expect(row).toHaveProperty('userId');
        expect(row.rank).toBe(index + 1);
      });
    },
  );

  it('assets 端點欄位契約（非空時）：含 userId 與 totalAssetValue', async () => {
    const rows = await getApi(rankingApiEndpoints.assets);
    if (rows.length > 0) {
      expect(rows[0]).toHaveProperty('userId');
      expect(rows[0]).toHaveProperty('totalAssetValue');
    }
  });
});
