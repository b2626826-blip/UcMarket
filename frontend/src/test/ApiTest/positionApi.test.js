import { describe, it, expect, beforeEach } from 'vitest';
import { getPositions, getPositionDetail } from '../../api/positionApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('positionApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('getPositions：GET /api/positions', async () => {
    await getPositions();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/positions'), expect.any(Object));
  });

  it('getPositionDetail(id)：GET /api/positions/:id', async () => {
    await getPositionDetail('p1');
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/positions/p1'), expect.any(Object));
  });
});
