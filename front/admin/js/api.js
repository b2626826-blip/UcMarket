var api = (function () {
  'use strict';

  var BASE_URL = 'http://localhost:8080';
  var TOKEN_KEY = 'ucmarket_admin_token';

  function getToken() {
    var t = localStorage.getItem(TOKEN_KEY);
    return t;
  }

  function setToken(t) {
    console.log('[api] setToken called, value:', !!t);
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function authHeaders(extra) {
    var h = extra || {};
    var token = getToken();
    if (token) {
      h['Authorization'] = 'Bearer ' + token;
    }
    return h;
  }

  function handleRedirect(response) {
    console.log('[api] handleRedirect status:', response.status);
    if (response.status === 401 || response.status === 403) {
      setToken(null);
      window.location.href = 'login.html';
      return true;
    }
    return false;
  }

  function fetchApi(endpoint, params) {
    var url = BASE_URL + endpoint;
    if (params) {
      var qs = [];
      for (var key in params) {
        if (params.hasOwnProperty(key) && params[key] != null) {
          qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      }
      if (qs.length) url += '?' + qs.join('&');
    }

    console.log('[api] GET ' + url);
    return fetch(url, { headers: authHeaders() })
      .then(function (response) {
        console.log('[api] GET response status:', response.status);
        if (handleRedirect(response)) return null;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  function postApi(endpoint, body) {
    console.log('[api] POST ' + BASE_URL + endpoint, body);
    return fetch(BASE_URL + endpoint, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
      .then(function (response) {
        console.log('[api] POST response status:', response.status);
        if (handleRedirect(response)) return null;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  function putApi(endpoint, body) {
    console.log('[api] PUT ' + BASE_URL + endpoint, body);
    return fetch(BASE_URL + endpoint, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
      .then(function (response) {
        console.log('[api] PUT response status:', response.status);
        if (handleRedirect(response)) return null;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  return {
    fetchApi: fetchApi,
    postApi: postApi,
    putApi: putApi,
    getToken: getToken,
    setToken: setToken
  };
})();
