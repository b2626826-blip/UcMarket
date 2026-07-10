import { getApi, postApi, putApi } from './client';

export function getMarkets({ page = 0, size = 100 } = {}) {
  return getApi(`/api/markets?page=${page}&size=${size}`);
}

export function getMarketDetail(id) {
  return getApi('/api/markets/' + id);
}

export function createMarket(data) {
  return postApi('/api/markets', data);
}

export function submitMarket(id) {
  return postApi('/api/markets/' + id + '/submit', null);
}

export function cancelMarket(id) {
  return postApi('/api/markets/' + id + '/cancel', null);
}

export function getAdminMarkets() {
  return getApi('/api/admin/markets');
}

export function approveMarket(id) {
  return postApi('/api/admin/markets/' + id + '/approve', null);
}

export function rejectMarket(id, comment) {
  return postApi('/api/admin/markets/' + id + '/reject', { comment });
}

export function requestMarketChanges(id, comment) {
  return postApi('/api/admin/markets/' + id + '/request-changes', { comment });
}

export function resolveMarket(id, result) {
  return postApi('/api/admin/markets/' + id + '/resolve', { result });
}
