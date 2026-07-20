import { vi } from 'vitest';

// 共用測試工具：不是測試檔（vitest include 只抓 *.test.js），供各 API 測試 import。

const BASE = '';

export function apiUrl(path) {
  return BASE + path;
}

// 造一個 fetch Response-like 物件
export function jsonResponse(json = {}, { ok = true, status = 200 } = {}) {
  return { ok, status, json: () => Promise.resolve(json) };
}

// 造一個會讓 handleResponse 走錯誤分支的 Response
export function errorResponse(status, body = {}) {
  return { ok: false, status, json: () => Promise.resolve(body) };
}

// 在每個測試前重置 fetch 與 localStorage
export function installFetchMock() {
  const fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  localStorage.clear();
  return fetchMock;
}
