import { getApi } from './client';

export function getDashboardStats() {
  return getApi('/api/admin/dashboard/stats');
}

export function getDashboardReviews() {
  return getApi('/api/admin/dashboard/reviews');
}

export function getAdminLogs() {
  return getApi('/api/admin/logs');
}

export function getAdminUsers(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return getApi('/api/admin/users' + q);
}

export function suspendUser(id) {
  return getApi('/api/admin/users/' + id + '/suspend');
}

export function unsuspendUser(id) {
  return getApi('/api/admin/users/' + id + '/unsuspend');
}
