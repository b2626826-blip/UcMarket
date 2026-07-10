import { getApi, postApi } from './client';

export function getTrades() {
  return getApi('/api/trades');
}

export function createTrade(data) {
  return postApi('/api/trades', data);
}

export function getAdminTransactions() {
  return getApi('/api/admin/transactions');
}
