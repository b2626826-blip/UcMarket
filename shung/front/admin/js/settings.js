(function () {
  'use strict';

  var platformInfo = [
    { label: '平台名稱', value: 'UcMarket' },
    { label: '版本', value: '1.0.0' },
    { label: '建置日期', value: '2024-05' },
    { label: '前端框架', value: 'Bootstrap 5.3.8' }
  ];

  var systemInfo = [
    { label: '資料庫', value: 'PostgreSQL 16', cls: 'text-success' },
    { label: '後端', value: 'Java 21 / Spring Boot 3.5.0' },
    { label: '認證機制', value: 'JWT + Refresh Token' },
    { label: '伺服器狀態', value: '正常運行', cls: 'text-success' }
  ];

  var statsInfo = [
    { label: '總用戶數', value: '1,248' },
    { label: '總事件數', value: '86' },
    { label: '總交易量', value: '98,765,432' },
    { label: '今日活躍用戶', value: '327' }
  ];

  var adminInfo = [
    { label: '管理員總數', value: '5' },
    { label: '線上管理員', value: '3' },
    { label: '最後維護時間', value: '2026-06-07 02:00' },
    { label: '資料庫連線', value: '正常', cls: 'text-success' }
  ];

  function renderList(containerId, items) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.map(function (item) {
      var cls = item.cls || '';
      return '<div class="system-item">' +
        '<span class="text-secondary">' + item.label + '</span>' +
        '<span class="fw-semibold ' + cls + '">' + item.value + '</span>' +
      '</div>';
    }).join('');
  }

  window.initSettings = function () {
    renderList('settings-platform', platformInfo);
    renderList('settings-system', systemInfo);
    renderList('settings-stats', statsInfo);
    renderList('settings-admin', adminInfo);
  };
})();
