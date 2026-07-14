import { getApi, postApi } from './client';

export function getTrades() {
  return getApi('/api/trades');
}

export function createTrade(data, idempotencyKey) {
  return postApi('/api/trades', data, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export function getAdminTransactions() {
  return getApi('/api/admin/transactions');
}
