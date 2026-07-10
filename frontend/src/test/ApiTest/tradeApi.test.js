import { describe, it, expect, beforeEach } from 'vitest';
import { getTrades, createTrade, getAdminTransactions } from '../../api/tradeApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('tradeApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('getTrades：GET /api/trades', async () => {
    await getTrades();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/trades'), expect.any(Object));
  });

  it('createTrade：POST /api/trades 帶 body', async () => {
    await createTrade({ marketId: 'm1', amount: 10 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/trades'));
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ marketId: 'm1', amount: 10 }));
  });

  it('getAdminTransactions：GET /api/admin/transactions', async () => {
    await getAdminTransactions();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/admin/transactions'), expect.any(Object));
  });
});
