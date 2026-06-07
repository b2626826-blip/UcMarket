(function () {
  'use strict';

  window.checkAuth = function () {
    return api.fetchApi('/api/auth/me')
      .then(function (user) {
        if (!user || user.role !== 'ADMIN') {
          window.location.href = '../user/index.html';
          return false;
        }
        return true;
      })
      .catch(function () {
        window.location.href = '../user/index.html';
        return false;
      });
  };
})();
