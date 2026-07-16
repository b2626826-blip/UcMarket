import { getApi, postApi } from './client';

export function getDashboardStats() {
  return getApi('/api/admin/dashboard/stats');
}

export function getDashboardReviews() {
  return getApi('/api/admin/dashboard/reviews');
}

function toQuery(params) {
  if (!params) return '';
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  );
  const q = new URLSearchParams(clean).toString();
  return q ? '?' + q : '';
}

export function getAdminLogs(params) {
  return getApi('/api/admin/logs' + toQuery(params));
}

export function getAdminUsers(params) {
  return getApi('/api/admin/users' + toQuery(params));
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
  return getApi('/api/admin/transactions' + toQuery(params));
}
