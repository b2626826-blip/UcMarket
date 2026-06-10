(function () {
  'use strict';

  var currentUser = null;

  function getCurrentUser() {
    return currentUser;
  }

  function updateUI(user) {
    var guestNav = document.getElementById('nav-guest');
    var userNav = document.getElementById('nav-user');
    var userDisplay = document.getElementById('user-display');
    if (!guestNav || !userNav) return;
    if (user) {
      guestNav.style.display = 'none';
      userNav.style.display = 'flex';
      if (userDisplay) userDisplay.textContent = user.username || user.email;
    } else {
      guestNav.style.display = '';
      userNav.style.display = 'none';
    }
  }

  function checkAuth() {
    return getApi('/api/auth/me')
      .then(function (res) {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(function (data) {
        currentUser = data.user || data;
        updateUI(currentUser);
        return currentUser;
      })
      .catch(function () {
        currentUser = null;
        updateUI(null);
        return null;
      });
  }

  function login(email, password) {
    return postApi('/api/auth/login', { email: email, password: password })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || e.message || '登入失敗'); });
        return res.json();
      })
      .then(function (data) {
        currentUser = data.user || data;
        updateUI(currentUser);
        return currentUser;
      });
  }

  function register(username, email, password) {
    return postApi('/api/auth/register', { username: username, email: email, password: password })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || e.message || '註冊失敗'); });
        return res.json();
      })
      .then(function (data) {
        currentUser = data.user || data;
        updateUI(currentUser);
        return currentUser;
      });
  }

  function logout() {
    return getApi('/api/auth/logout')
      .then(function () {
        currentUser = null;
        updateUI(null);
      })
      .catch(function () {
        currentUser = null;
        updateUI(null);
      });
  }

  window.auth = {
    getCurrentUser: getCurrentUser,
    checkAuth: checkAuth,
    login: login,
    register: register,
    logout: logout
  };
})();
