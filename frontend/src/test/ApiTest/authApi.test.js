import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUser, login, register, logout, checkAdminSession } from '../../api/authApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('authApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('login：POST /api/auth/login 帶 { email, password }', async () => {
    await login('a@b.com', 'pw');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/auth/login'));
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ email: 'a@b.com', password: 'pw' }));
  });

  it('register：POST /api/auth/register 帶 { username, email, password }', async () => {
    await register('user', 'a@b.com', 'pw');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(apiUrl('/api/auth/register'));
    expect(options.body).toBe(JSON.stringify({ username: 'user', email: 'a@b.com', password: 'pw' }));
  });

  it('getCurrentUser / checkAdminSession：GET /api/auth/me', async () => {
    await getCurrentUser();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/auth/me'), expect.any(Object));
    await checkAdminSession();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/auth/me'), expect.any(Object));
  });

  it('logout：GET /api/auth/logout', async () => {
    await logout();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/auth/logout'), expect.any(Object));
  });
});
