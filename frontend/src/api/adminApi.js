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

export function getAdminTransactions(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return getApi('/api/admin/transactions' + q);
}
