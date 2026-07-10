import { describe, it, expect, beforeEach } from 'vitest';
import { fetchRankings, rankingApiEndpoints } from '../../api/rankingApi';
import { jsonResponse, installFetchMock } from './_helpers';

describe('rankingApi.js', () => {
  let fetchMock;

  // 依 URL 尾段回不同資料
  function routeFetch({ profit = [], winRate = [], assets = [] }) {
    fetchMock.mockImplementation((url) => {
      if (url.endsWith(rankingApiEndpoints.profit)) return Promise.resolve(jsonResponse(profit));
      if (url.endsWith(rankingApiEndpoints['win-rate'])) return Promise.resolve(jsonResponse(winRate));
      if (url.endsWith(rankingApiEndpoints.assets)) return Promise.resolve(jsonResponse(assets));
      return Promise.reject(new Error('unexpected url ' + url));
    });
  }

  beforeEach(() => {
    fetchMock = installFetchMock();
  });

  it('打三個 ranking endpoint 並合併同一 userId', async () => {
    routeFetch({
      profit: [{ userId: 'u1', username: 'Alice', realizedProfit: '100' }],
      winRate: [{ userId: 'u1', username: 'Alice', winRate: '0.5', resolvedMarketCount: '3' }],
      assets: [{ userId: 'u1', username: 'Alice', totalAssetValue: '250' }],
    });

    const rows = await fetchRankings('profit');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: 'u1',
      name: 'Alice',
      profit: 100,
      winRate: 50, // 乘 100
      resolvedMarketCount: 3,
      assets: 250,
      rank: 1,
    });
  });

  it("依 type='profit' 由高到低排序並標 rank", async () => {
    routeFetch({
      profit: [
        { userId: 'low', username: 'Low', realizedProfit: '10' },
        { userId: 'high', username: 'High', realizedProfit: '90' },
      ],
    });

    const rows = await fetchRankings('profit');
    expect(rows.map((r) => r.userId)).toEqual(['high', 'low']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('有值者排在無值(null)者之前', async () => {
    routeFetch({
      profit: [
        { userId: 'none', username: 'None', realizedProfit: null },
        { userId: 'some', username: 'Some', realizedProfit: '5' },
      ],
    });

    const rows = await fetchRankings('profit');
    expect(rows.map((r) => r.userId)).toEqual(['some', 'none']);
  });

  it('相同 type 併發呼叫共用同一個 in-flight Promise', () => {
    routeFetch({ profit: [] });
    const p1 = fetchRankings('profit');
    const p2 = fetchRankings('profit');
    expect(p1).toBe(p2);
    return p1;
  });

  it('resolve 後可再次發起新的請求', async () => {
    routeFetch({ profit: [] });
    const p1 = fetchRankings('profit');
    await p1;
    const p2 = fetchRankings('profit');
    expect(p2).not.toBe(p1);
    await p2;
  });
});
