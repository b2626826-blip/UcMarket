(function () {
  'use strict';

  window.initSettings = function () {
    var platformInfo = [
      { label: '平台名稱', value: 'UcMarket' },
      { label: '版本', value: '1.0.0' },
      { label: '後端', value: 'Java 21 / Spring Boot 3.5.0' },
      { label: '資料庫', value: 'PostgreSQL' }
    ];
    renderList('settings-platform', platformInfo);

    api.fetchApi('/api/admin/dashboard/stats')
      .then(function (stats) {
        var statsInfo = [
          { label: '總用戶數', value: stats.totalUsers || 0 },
          { label: '總事件數', value: stats.totalMarkets || 0 },
          { label: '進行中', value: stats.activeCount || 0 },
          { label: '待審核', value: stats.pendingCount || 0 }
        ];
        renderList('settings-stats', statsInfo);

        var adminInfo = [
          { label: '已結算', value: stats.resolvedCount || 0 },
          { label: '已拒絕', value: stats.rejectedCount || 0 },
          { label: '伺服器狀態', value: '正常運行', cls: 'text-success' },
          { label: '認證機制', value: 'JWT + Refresh Token' }
        ];
        renderList('settings-admin', adminInfo);
      })
      .catch(function () {
        renderList('settings-stats', [{ label: 'API 未連線', value: '-' }]);
        renderList('settings-admin', [{ label: 'API 未連線', value: '-' }]);
      });

    var systemInfo = [
      { label: '前端框架', value: 'Bootstrap 5.3.8' },
      { label: '認證機制', value: 'JWT + Refresh Token' },
      { label: '密碼加密', value: 'BCrypt' },
      { label: '伺服器狀態', value: '正常運行', cls: 'text-success' }
    ];
    renderList('settings-system', systemInfo);
  };

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
})();
