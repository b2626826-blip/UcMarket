import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMarkets,
  getMarketDetail,
  getCurrentEventMarkets,
  getCurrentEventMarketDetail,
  getPagedCurrentEventMarkets,
  createMarket,
  rejectMarket,
  getMarketOdds,
  getTradeQuote,
} from '../../api/marketApi';
import { CURRENT_EVENT_CATEGORY, CURRENT_EVENT_CATEGORY_CODE } from '../../types/market';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

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

  it('getMarkets / getMarketDetail 組出正確 URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getMarkets();
    expect(fetchMock).toHaveBeenLastCalledWith(
      apiUrl('/api/markets?page=0&size=20'),
      expect.any(Object),
    );

    await getMarketDetail('m1');
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/markets/m1'), expect.any(Object));
  });

  it('getMarketOdds / getTradeQuote 走市場交易 endpoints', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ yesOdds: 1.8, noOdds: 2.1 }));
    await getMarketOdds('m1');
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/markets/m1/odds'), expect.any(Object));

    fetchMock.mockResolvedValueOnce(jsonResponse({ odds: 1.95, amount: 100 }));
    await getTradeQuote('m1', { side: 'YES', amount: 100 });

    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe(apiUrl('/api/markets/m1/trades/quote'));
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ side: 'YES', amount: 100 }));
  });

  describe('getCurrentEventMarkets', () => {
    it('帶 category/page/size/status query，並回傳 { content }', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([rawMarket()]));

      const result = await getCurrentEventMarkets({ status: 'ACTIVE', page: 0, size: 6 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(
        apiUrl(`/api/markets?category=${CURRENT_EVENT_CATEGORY_CODE}&page=0&size=6&status=ACTIVE`),
      );
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].category).toBe(CURRENT_EVENT_CATEGORY);
    });

    it('status 為空時，不應帶出 status query', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await getCurrentEventMarkets({ status: '' });

      const [url] = fetchMock.mock.calls[0];
      expect(url).not.toContain('status=');
    });

    it('只保留符合 status 的資料', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([
        rawMarket({ id: 'a', status: 'ACTIVE' }),
        rawMarket({ id: 'b', status: 'CLOSED' }),
      ]));

      const result = await getCurrentEventMarkets({ status: 'ACTIVE' });
      expect(result.content.map((m) => m.id)).toEqual(['a']);
    });

    it("sort='latest' 時，依 createdAt 新到舊排序", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([
        rawMarket({ id: 'old', createdAt: '2026-07-01T00:00:00Z' }),
        rawMarket({ id: 'new', createdAt: '2026-07-10T00:00:00Z' }),
      ]));

      const result = await getCurrentEventMarkets({ sort: 'latest' });
      expect(result.content.map((m) => m.id)).toEqual(['new', 'old']);
    });

    it('keyword 會過濾標題', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([
        rawMarket({ id: 'hit', title: '通膨是否會升溫' }),
        rawMarket({ id: 'miss', title: '總統大選市場' }),
      ]));

      const result = await getCurrentEventMarkets({ keyword: '通膨' });
      expect(result.content.map((m) => m.id)).toEqual(['hit']);
    });
  });

  it('getPagedCurrentEventMarkets 保留 imageUrl', async () => {
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
    it('非 CURRENT_AFFAIRS 類別時回傳 null', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(rawMarket({ category: 'SPORTS' })));
      await expect(getCurrentEventMarketDetail('m1')).resolves.toBeNull();
    });

    it('CURRENT_AFFAIRS 會回傳 normalize 後資料', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(rawMarket()));
      const market = await getCurrentEventMarketDetail('m1');
      expect(market).not.toBeNull();
      expect(market.category).toBe(CURRENT_EVENT_CATEGORY);
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
      await rejectMarket('m1', '資料不足');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(apiUrl('/api/admin/markets/m1/reject'));
      expect(options.body).toBe(JSON.stringify({ comment: '資料不足' }));
    });
  });
});
