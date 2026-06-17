(function () {
  'use strict';

  window.checkAuth = function () {
    var token = api.getToken();
    console.log('[checkAuth] token found:', !!token);
    if (!token) {
      console.log('[checkAuth] no token → redirect to login.html');
      window.location.href = 'login.html';
      return Promise.resolve(false);
    }
    return api.fetchApi('/api/auth/me')
      .then(function (user) {
        console.log('[checkAuth] /api/auth/me response:', user);
        if (!user || user.role !== 'ADMIN') {
          console.log('[checkAuth] NOT ADMIN, clearing token → redirect ../user/index.html');
          api.setToken(null);
          window.location.href = '../user/index.html';
          return false;
        }
        console.log('[checkAuth] ADMIN confirmed, loading dashboard');
        return true;
      })
      .catch(function (err) {
        console.log('[checkAuth] ERROR:', err);
        api.setToken(null);
        window.location.href = 'login.html';
        return false;
      });
  };

  window.doLogin = function (email, password) {
    console.log('[doLogin] calling POST /api/auth/login with email:', email);
    return api.postApi('/api/auth/login', { email: email, password: password });
  };

  window.doLogout = function () {
    console.log('[doLogout] logging out');
    var token = api.getToken();
    if (token) {
      api.postApi('/api/auth/logout', {}).catch(function () {});
    }
    api.setToken(null);
    window.location.href = 'login.html';
  };
})();
