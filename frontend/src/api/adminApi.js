import { getApi, postApi } from './client';

export function getDashboardStats() {
  return getApi('/api/admin/dashboard/stats');
}

export function getDashboardReviews() {
  return getApi('/api/admin/dashboard/reviews');
}

export function getAdminLogs(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return getApi('/api/admin/logs' + q);
}

export function getAdminUsers(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return getApi('/api/admin/users' + q);
}

export function suspendUser(id) {
  return postApi('/api/admin/users/' + id + '/suspend', null);
}

export function unsuspendUser(id) {
  return postApi('/api/admin/users/' + id + '/unsuspend', null);
}

// body: { direction: 'CREDIT' | 'DEBIT', amount: number, reason: string }
export function adjustWallet(id, body) {
  return postApi('/api/admin/users/' + id + '/wallet/adjust', body);
}

// 查某用戶錢包(餘額 + 最近流水): { balance, transactions[] }
export function getUserWallet(id) {
  return getApi('/api/admin/users/' + id + '/wallet');
}

export function getAdminTransactions(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return getApi('/api/admin/transactions' + q);
}
