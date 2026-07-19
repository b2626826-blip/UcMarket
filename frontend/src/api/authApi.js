import { getApi, postApi, putApi } from './client';

export function getCurrentUser() {
  return getApi('/api/auth/me');
}

export function login(email, password) {
  return postApi('/api/auth/login', { email, password });
}

export function register(username, email, password, idempotencyKey) {
  return postApi(
    '/api/auth/register',
    { username, email, password },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
}

export function logout() {
  return getApi('/api/auth/logout');
}

export function updateProfile(profile) {
  return putApi('/api/auth/profile', profile);
}

export function changePassword(oldPassword, newPassword) {
  return postApi('/api/auth/change-password', { oldPassword, newPassword });
}

export function forgotPassword(email) {
  return postApi('/api/auth/forgot-password', { email });
}

export function resetPassword(token, newPassword) {
  return postApi('/api/auth/reset-password', { token, newPassword });
}

export function checkAdminSession() {
  return getApi('/api/auth/me');
}
