import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDashboardStats, getAdminLogs, getAdminUsers, suspendUser, unsuspendUser,
} from '../../api/adminApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('adminApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('getDashboardStats：GET dashboard/stats', async () => {
    await getDashboardStats();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/admin/dashboard/stats'), expect.any(Object));
  });

  it('getAdminLogs：有 params 時組 query string', async () => {
    await getAdminLogs({ page: 2, size: 10 });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/admin/logs?page=2&size=10'));
  });

  it('getAdminUsers：無 params 時不帶 ?', async () => {
    await getAdminUsers();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/admin/users'), expect.any(Object));
  });

  it('suspendUser / unsuspendUser：POST 正確路徑、body null', async () => {
    await suspendUser('u1');
    let [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/admin/users/u1/suspend'));
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(null));

    await unsuspendUser('u1');
    [url] = fetchMock.mock.calls[1];
    expect(url).toBe(apiUrl('/api/admin/users/u1/unsuspend'));
  });
});
