import { describe, it, expect } from 'vitest';
import { getApi } from '../../../api/client';
import { fetchRankings, rankingApiEndpoints } from '../../../api/rankingApi';

// 整合測試：打真後端。預設略過，見 currentAffairs.int.test.js 說明。
const RUN = process.env.RUN_INTEGRATION === '1';

describe.runIf(RUN)('[integration] 排行榜', () => {
  it.each(['profit', 'win-rate', 'assets'])(
    'snapshot endpoint (%s)：回傳同一份快照與連續 rank',
    async (type) => {
      const snapshot = await getApi(`${rankingApiEndpoints.snapshot}?metric=${type}`);
      const rows = await fetchRankings(type);
      expect(snapshot.metric).toBe(type);
      expect(snapshot.asOf).toEqual(expect.any(String));
      expect(Array.isArray(snapshot.items)).toBe(true);
      expect(Array.isArray(rows)).toBe(true);
      rows.forEach((row, index) => {
        expect(row).toHaveProperty('userId');
        expect(row.rank).toBe(index + 1);
      });
    },
  );

  it('assets snapshot 欄位契約（非空時）：含 userId 與 totalAssetValue', async () => {
    const snapshot = await getApi(`${rankingApiEndpoints.snapshot}?metric=assets`);
    if (snapshot.items.length > 0) {
      expect(snapshot.items[0]).toHaveProperty('userId');
      expect(snapshot.items[0]).toHaveProperty('totalAssetValue');
    }
  });
});
