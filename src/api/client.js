const BASE_URL = 'http://localhost:8080';

function authHeaders() {
  const token = localStorage.getItem('ucmarket_admin_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

export function getApi(url) {
  return fetch(BASE_URL + url, { credentials: 'include', headers: authHeaders() }).then(handleResponse);
}

export function postApi(url, body) {
  return fetch(BASE_URL + url, {
    method: 'POST', credentials: 'include',
    headers: authHeaders(), body: JSON.stringify(body)
  }).then(handleResponse);
}

export function putApi(url, body) {
  return fetch(BASE_URL + url, {
    method: 'PUT', credentials: 'include',
    headers: authHeaders(), body: JSON.stringify(body)
  }).then(handleResponse);
}

export function deleteApi(url) {
  return fetch(BASE_URL + url, { method: 'DELETE', credentials: 'include', headers: authHeaders() }).then(handleResponse);
}

async function handleResponse(res) {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('ucmarket_admin_token');
    window.location.href = '/auth/login';
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const apiError = new Error(err.message || err.error || 'HTTP ' + res.status);
    apiError.status = res.status;
    throw apiError;
  }
  return res.json();
}

export function setToken(t) {
  if (t) localStorage.setItem('ucmarket_admin_token', t);
  else localStorage.removeItem('ucmarket_admin_token');
}

export function getToken() {
  return localStorage.getItem('ucmarket_admin_token');
}
