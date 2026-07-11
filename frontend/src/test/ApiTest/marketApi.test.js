import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMarkets, getMarketDetail, getCurrentEventMarkets,
  getCurrentEventMarketDetail, getPagedCurrentEventMarkets, createMarket, rejectMarket,
} from '../../api/marketApi';
import { CURRENT_EVENT_CATEGORY, CURRENT_EVENT_CATEGORY_CODE } from '../../types/market';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

// 造一筆 raw market（後端回傳形狀）
function rawMarket(overrides = {}) {
  return {
    id: 'm1',
    title: '測試市場',
    category: CURRENT_EVENT_CATEGORY_CODE,
    status: 'ACTIVE',
    yesPool: 60,
    noPool: 40,
    createdAt: '2026-07-01T00:00:00Z',
    closeAt: '2026-07-20T00:00:00Z',
    ...overrides,
  };
}

describe('marketApi.js', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = installFetchMock();
  });

  it('getMarkets / getMarketDetail 打對 URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getMarkets();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/markets'), expect.any(Object));

    await getMarketDetail('m1');
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/markets/m1'), expect.any(Object));
  });

  describe('getCurrentEventMarkets', () => {
    it('組裝 category/page/size/status query，回傳 { content }', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([rawMarket()]));

      const result = await getCurrentEventMarkets({ status: 'ACTIVE', page: 0, size: 6 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(
        apiUrl(`/api/markets?category=${CURRENT_EVENT_CATEGORY_CODE}&page=0&size=6&status=ACTIVE`),
      );
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      // normalize 會把 category 轉成中文顯示值
      expect(result.content[0].category).toBe(CURRENT_EVENT_CATEGORY);
    });

    it('status 為空字串時不帶 status 參數', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await getCurrentEventMarkets({ status: '' });

      const [url] = fetchMock.mock.calls[0];
      expect(url).not.toContain('status=');
    });

    it('依 status 過濾：非該 status 的市場被排除', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([
        rawMarket({ id: 'a', status: 'ACTIVE' }),
        rawMarket({ id: 'b', status: 'CLOSED' }),
      ]));

      const result = await getCurrentEventMarkets({ status: 'ACTIVE' });
      expect(result.content.map((m) => m.id)).toEqual(['a']);
    });

    it("sort='latest'：依 createdAt 降冪", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([
        rawMarket({ id: 'old', createdAt: '2026-07-01T00:00:00Z' }),
        rawMarket({ id: 'new', createdAt: '2026-07-10T00:00:00Z' }),
      ]));

      const result = await getCurrentEventMarkets({ sort: 'latest' });
      expect(result.content.map((m) => m.id)).toEqual(['new', 'old']);
    });

    it('keyword 過濾標題', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([
        rawMarket({ id: 'hit', title: '颱風假市場' }),
        rawMarket({ id: 'miss', title: '選舉市場' }),
      ]));

      const result = await getCurrentEventMarkets({ keyword: '颱風' });
      expect(result.content.map((m) => m.id)).toEqual(['hit']);
    });
  });

  it('getPagedCurrentEventMarkets 保留後端回傳的 imageUrl', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      content: [rawMarket({ imageUrl: 'https://images.example.com/market.jpg' })],
      page: 0,
      size: 20,
      totalPages: 1,
      hasNext: false,
    }));

    const result = await getPagedCurrentEventMarkets();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/current-affairs/markets?status=ACTIVE&sort=popular&page=0&size=20'));
    expect(result.content[0].imageUrl).toBe('https://images.example.com/market.jpg');
  });

  describe('getCurrentEventMarketDetail', () => {
    it('category 非 CURRENT_AFFAIRS → 回 null', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(rawMarket({ category: 'SPORTS' })));
      await expect(getCurrentEventMarketDetail('m1')).resolves.toBeNull();
    });

    it('category 為 CURRENT_AFFAIRS → 回 normalized market', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(rawMarket()));
      const market = await getCurrentEventMarketDetail('m1');
      expect(market).not.toBeNull();
      expect(market.category).toBe(CURRENT_EVENT_CATEGORY);
      // yesPool 60 / (60+40) → 60%
      expect(market.yesProbability).toBe(60);
      expect(market.noProbability).toBe(40);
    });
  });

  describe('write endpoints', () => {
    it('createMarket：POST /api/markets 帶 body', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      await createMarket({ title: 't' });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(apiUrl('/api/markets'));
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify({ title: 't' }));
    });

    it('rejectMarket：POST reject 帶 { comment }', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      await rejectMarket('m1', '不符規範');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(apiUrl('/api/admin/markets/m1/reject'));
      expect(options.body).toBe(JSON.stringify({ comment: '不符規範' }));
    });
  });
});
