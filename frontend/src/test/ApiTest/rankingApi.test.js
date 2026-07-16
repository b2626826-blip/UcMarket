import { describe, it, expect, beforeEach } from 'vitest';
import { fetchRankings, rankingApiEndpoints } from '../../api/rankingApi';
import { jsonResponse, installFetchMock } from './_helpers';

describe('rankingApi.js', () => {
  let fetchMock;

  function routeFetch(snapshot) {
    fetchMock.mockImplementation((url) => {
      if (url.endsWith(`${rankingApiEndpoints.snapshot}?metric=profit`)) return Promise.resolve(jsonResponse(snapshot));
      if (url.endsWith(`${rankingApiEndpoints.snapshot}?metric=win-rate`)) return Promise.resolve(jsonResponse(snapshot));
      if (url.endsWith(`${rankingApiEndpoints.snapshot}?metric=assets`)) return Promise.resolve(jsonResponse(snapshot));
      return Promise.reject(new Error('unexpected url ' + url));
    });
  }

  beforeEach(() => {
    fetchMock = installFetchMock();
  });

  it('只打單一 snapshot endpoint，採用後端 rank', async () => {
    routeFetch({
      metric: 'profit',
      asOf: '2026-07-10T08:23:41Z',
      items: [{
        rank: 7,
        userId: 'u1',
        username: 'Alice',
        realizedProfit: '100',
        winRate: '0.5',
        resolvedMarketCount: '3',
        totalAssetValue: '250',
      }],
    });

    const rows = await fetchRankings('profit');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: 'u1',
      name: 'Alice',
      profit: 100,
      winRate: 50, // 乘 100
      resolvedMarketCount: 3,
      assets: 250,
      rank: 7,
    });
  });

  it("依 type='assets' 傳送 metric query parameter", async () => {
    routeFetch({
      metric: 'assets',
      asOf: '2026-07-10T08:23:41Z',
      items: [],
    });

    await fetchRankings('assets');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`${rankingApiEndpoints.snapshot}?metric=assets`),
      expect.anything(),
    );
  });

  it('相同 type 併發呼叫共用同一個 in-flight Promise', () => {
    routeFetch({ metric: 'profit', asOf: '2026-07-10T08:23:41Z', items: [] });
    const p1 = fetchRankings('profit');
    const p2 = fetchRankings('profit');
    expect(p1).toBe(p2);
    return p1;
  });

  it('resolve 後可再次發起新的請求', async () => {
    routeFetch({ metric: 'profit', asOf: '2026-07-10T08:23:41Z', items: [] });
    const p1 = fetchRankings('profit');
    await p1;
    const p2 = fetchRankings('profit');
    expect(p2).not.toBe(p1);
    await p2;
  });
});
