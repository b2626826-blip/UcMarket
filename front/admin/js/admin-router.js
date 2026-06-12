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
        } else if (pageUrl.indexOf('create-market') !== -1) {
          loadScript('js/create-market.js', 'initCreateMarket');
        } else if (pageUrl.indexOf('admins') !== -1) {
          loadScript('js/admins.js', 'initAdmins');
        } else if (pageUrl.indexOf('settings') !== -1) {
          loadScript('js/settings.js', 'initSettings');
        } else if (pageUrl.indexOf('logs') !== -1) {
          loadScript('js/logs.js', 'initLogs');
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
    console.log('[router] DOMContentLoaded, calling checkAuth...');
    window.checkAuth().then(function (ok) {
      console.log('[router] checkAuth returned:', ok);
      if (!ok) return;
      var defaultLink = sidebarNav.querySelector('.sidebar-link.active') ||
        sidebarNav.querySelector('.sidebar-link[data-page="views/dashboard.html"]');
      setActiveLink(defaultLink);
      loadPage('views/dashboard.html');
    });
  });

  window.showToast = function (type, title, message) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var id = 'toast-' + Date.now();
    var iconMap = {
      success: 'bi-check-circle-fill text-success',
      danger: 'bi-x-circle-fill text-danger',
      warning: 'bi-exclamation-circle-fill text-warning',
      info: 'bi-info-circle-fill text-primary'
    };
    var icon = iconMap[type] || iconMap.info;
    var toastClass = 'admin-toast toast-' + (type || 'info');
    var html =
      '<div id="' + id + '" class="' + toastClass + '" role="alert">' +
        '<i class="bi ' + icon + '"></i>' +
        '<div class="admin-toast-body">' +
          '<div class="fw-semibold small mb-1">' + title + '</div>' +
          '<div class="small text-secondary">' + message + '</div>' +
        '</div>' +
        '<button type="button" class="toast-close" onclick="document.getElementById(\'' + id + '\').classList.add(\'hide\');setTimeout(function(){document.getElementById(\'' + id + '\').remove()},300)">&times;</button>' +
      '</div>';
    container.insertAdjacentHTML('beforeend', html);
    setTimeout(function () {
      var el = document.getElementById(id);
      if (el) {
        el.classList.add('hide');
        setTimeout(function () { if (el.parentNode) el.remove(); }, 300);
      }
    }, 5000);
  };
})();
