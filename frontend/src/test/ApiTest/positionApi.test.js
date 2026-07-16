import { describe, it, expect, beforeEach } from 'vitest';
import { getMarketPositions, getOpenPositions, getPositions } from '../../api/positionApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('positionApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('getPositions：GET /api/positions/me', async () => {
    await getPositions();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/positions/me'), expect.any(Object));
  });

  it('getOpenPositions：GET /api/positions/me/open', async () => {
    await getOpenPositions();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/positions/me/open'), expect.any(Object));
  });

  it('getMarketPositions：依 openOnly 選擇市場持倉端點', async () => {
    await getMarketPositions('m1');
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/positions/market/m1'), expect.any(Object));

    await getMarketPositions('m1', { openOnly: true });
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/positions/market/m1/open'), expect.any(Object));
  });
});
