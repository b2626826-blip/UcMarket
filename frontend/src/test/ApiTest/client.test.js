import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApi, postApi, putApi, deleteApi, setToken, getToken,
} from '../../api/client';
import { apiUrl, jsonResponse, errorResponse, installFetchMock } from './_helpers';

const TOKEN_KEY = 'ucmarket_admin_token';

describe('client.js', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = installFetchMock();
    // 讓 handleResponse 的 401/403 導向不會真的 navigate（jsdom 不支援）
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  describe('authHeaders', () => {
    it('沒有 token 時不帶 Authorization、帶 Content-Type', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await getApi('/api/x');

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers.Authorization).toBeUndefined();
    });

    it('有 token 時帶 Bearer Authorization', async () => {
      localStorage.setItem(TOKEN_KEY, 'abc');
      fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await getApi('/api/x');

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer abc');
    });
  });

  describe('HTTP verbs', () => {
    it('getApi：GET、正確 URL、credentials include', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      const data = await getApi('/api/markets');

      expect(fetchMock).toHaveBeenCalledWith(
        apiUrl('/api/markets'),
        expect.objectContaining({ credentials: 'include' }),
      );
      expect(data).toEqual({ id: 1 });
    });

    it('postApi：method POST、body 為 JSON.stringify', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      await postApi('/api/markets', { title: 't' });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(apiUrl('/api/markets'));
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify({ title: 't' }));
    });

    it('putApi：method PUT、body 為 JSON.stringify', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      await putApi('/api/markets/1', { title: 't' });

      const [, options] = fetchMock.mock.calls[0];
      expect(options.method).toBe('PUT');
      expect(options.body).toBe(JSON.stringify({ title: 't' }));
    });

    it('deleteApi：method DELETE、無 body', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      await deleteApi('/api/markets/1');

      const [, options] = fetchMock.mock.calls[0];
      expect(options.method).toBe('DELETE');
      expect(options.body).toBeUndefined();
    });
  });

  describe('handleResponse', () => {
    it('ok：回傳解析後 JSON', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ value: 42 }));
      await expect(getApi('/api/x')).resolves.toEqual({ value: 42 });
    });

    it.each([401, 403])('%i：清除 token、導向 /auth/login、回傳 null', async (status) => {
      localStorage.setItem(TOKEN_KEY, 'abc');
      fetchMock.mockResolvedValueOnce(errorResponse(status));

      const result = await getApi('/api/x');

      expect(result).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(window.location.href).toBe('/auth/login');
    });

    it('其他錯誤：throw Error，message 取 err.error，附 status', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(422, { error: '欄位錯誤' }));

      await expect(getApi('/api/x')).rejects.toMatchObject({
        message: '欄位錯誤',
        status: 422,
      });
    });

    it('錯誤且 body 非 JSON：message fallback 為 HTTP <status>', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(getApi('/api/x')).rejects.toMatchObject({
        message: 'HTTP 500',
        status: 500,
      });
    });
  });

  describe('setToken / getToken', () => {
    it('setToken(t) 寫入、getToken 讀取', () => {
      setToken('xyz');
      expect(getToken()).toBe('xyz');
    });

    it('setToken(null) 清除', () => {
      localStorage.setItem(TOKEN_KEY, 'xyz');
      setToken(null);
      expect(getToken()).toBeNull();
    });
  });
});
