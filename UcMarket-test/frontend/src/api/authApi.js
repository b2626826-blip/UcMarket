import { getApi, postApi } from './client';

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

export function checkAdminSession() {
  return getApi('/api/auth/me');
}
