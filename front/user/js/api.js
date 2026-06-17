(function () {
  'use strict';

  var BASE_URL = 'http://localhost:8080';

  function fetchApi(url, options) {
    options = options || {};
    options.credentials = 'include';
    options.headers = options.headers || {};
    options.headers['Content-Type'] = 'application/json';
    return fetch(BASE_URL + url, options);
  }

  function getApi(url) {
    return fetchApi(url, { method: 'GET' });
  }

  function postApi(url, body) {
    return fetchApi(url, { method: 'POST', body: JSON.stringify(body) });
  }

  function putApi(url, body) {
    return fetchApi(url, { method: 'PUT', body: JSON.stringify(body) });
  }

  function deleteApi(url) {
    return fetchApi(url, { method: 'DELETE' });
  }

  window.getApi = getApi;
  window.postApi = postApi;
  window.putApi = putApi;
  window.deleteApi = deleteApi;
  window.BASE_URL = BASE_URL;
})();
