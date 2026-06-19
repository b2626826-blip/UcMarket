var api = (function () {
  'use strict';

  var BASE_URL = 'http://localhost:8080';

  function handleRedirect(response) {
    if (response.status === 401) {
      window.location.href = '../user/index.html?error=unauthorized';
      return true;
    }
    if (response.status === 403) {
      window.location.href = '../user/index.html?error=forbidden';
      return true;
    }
    return false;
  }

  function fetchApi(endpoint, params) {
    var url = BASE_URL + endpoint;
    if (params) {
      var qs = [];
      for (var key in params) {
        if (params[key]) {
          qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      }
      if (qs.length) url += '?' + qs.join('&');
    }

    return fetch(url, { credentials: 'include' })
      .then(function (response) {
        if (handleRedirect(response)) return null;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  function postApi(endpoint, body) {
    return fetch(BASE_URL + endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (response) {
        if (handleRedirect(response)) return null;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  return {
    fetchApi: fetchApi,
    postApi: postApi
  };
})();
