(function () {
  'use strict';

  var mainContent = document.getElementById('main-content');
  var sidebarNav = document.querySelector('.sidebar-nav');
  var loadedScripts = {};

  function loadScript(src, initFn) {
    if (loadedScripts[src]) {
      if (typeof window[initFn] === 'function') window[initFn]();
      return;
    }
    var script = document.createElement('script');
    script.src = src;
    script.onload = function () {
      loadedScripts[src] = true;
      if (typeof window[initFn] === 'function') window[initFn]();
    };
    document.body.appendChild(script);
  }

  function loadPage(pageUrl) {
    fetch(pageUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + pageUrl);
        return res.text();
      })
      .then(function (html) {
        mainContent.innerHTML = html;
        if (pageUrl.indexOf('dashboard') !== -1) {
          loadScript('js/dashboard.js', 'initDashboard');
        } else if (pageUrl.indexOf('markets') !== -1) {
          loadScript('js/markets.js', 'initMarkets');
        } else if (pageUrl.indexOf('users') !== -1) {
          loadScript('js/users.js', 'initUsers');
        } else if (pageUrl.indexOf('transactions') !== -1) {
          loadScript('js/transactions.js', 'initTransactions');
        }
      })
      .catch(function (err) {
        mainContent.innerHTML = '<div class="alert alert-danger">無法載入頁面：' + err.message + '</div>';
      });
  }

  function setActiveLink(linkEl) {
    sidebarNav.querySelectorAll('.sidebar-link').forEach(function (link) {
      link.classList.remove('active');
    });
    if (linkEl && linkEl.classList.contains('sidebar-link')) {
      linkEl.classList.add('active');
    }
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-page]');
    if (!trigger) return;
    e.preventDefault();
    var pageUrl = trigger.getAttribute('data-page');
    if (!pageUrl) return;
    setActiveLink(trigger);
    loadPage(pageUrl);
  });

  document.addEventListener('DOMContentLoaded', function () {
    window.checkAuth().then(function (ok) {
      if (!ok) return;
      var defaultLink = sidebarNav.querySelector('.sidebar-link.active') ||
        sidebarNav.querySelector('.sidebar-link[data-page="views/dashboard.html"]');
      setActiveLink(defaultLink);
      loadPage('views/dashboard.html');
    });
  });
})();
