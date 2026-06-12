(function () {
  'use strict';

  var currentLogs = [];
  var actionLabelMap = {
    MARKET_APPROVE: '核准事件', MARKET_REJECT: '拒絕事件', MARKET_RESOLVE: '結算事件',
    MARKET_REQUEST_CHANGES: '要求修改', USER_SUSPEND: '停權用戶', USER_UNSUSPEND: '解除停權'
  };
  var actionClassMap = {
    MARKET_APPROVE: 'status-approved', MARKET_REJECT: 'status-rejected', MARKET_RESOLVE: 'status-active',
    MARKET_REQUEST_CHANGES: 'status-pending', USER_SUSPEND: 'status-rejected', USER_UNSUSPEND: 'status-approved'
  };

  function actionBadge(action) {
    var cls = actionClassMap[action] || 'status-closed';
    var label = actionLabelMap[action] || action;
    return '<span class="status-badge ' + cls + '">' + label + '</span>';
  }

  function getActionCategory(action) {
    if (action.indexOf('MARKET') !== -1) return 'market';
    if (action.indexOf('USER') !== -1) return 'user';
    return 'system';
  }

  function renderSummary(logs) {
    var marketCount = logs.filter(function (l) { return getActionCategory(l.action) === 'market'; }).length;
    var userCount = logs.filter(function (l) { return getActionCategory(l.action) === 'user'; }).length;
    var systemCount = logs.filter(function (l) { return getActionCategory(l.action) === 'system'; }).length;
    setText('l-sum-0', logs.length);
    setText('l-sum-1', marketCount);
    setText('l-sum-2', userCount);
    setText('l-sum-3', systemCount);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getFilterValues() {
    var form = document.getElementById('logs-filter');
    if (!form) return {};
    var values = {};
    form.querySelectorAll('[data-filter-key]').forEach(function (c) {
      values[c.getAttribute('data-filter-key')] = c.value.trim();
    });
    return values;
  }

  function filterLogs(logs, filters) {
    return logs.filter(function (l) {
      var byKeyword = !filters.keyword ||
        ((l.adminUserId || '') + ' ' + (l.action || '') + ' ' + (l.targetId || '')).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byAction = !filters.action || l.action === filters.action;
      return byKeyword && byAction;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('logs-list');
    var title = document.getElementById('logs-table-title');
    if (!tbody) return;
    if (title) title.textContent = '操作紀錄 (' + rows.length + ')';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的紀錄。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (l) {
      return '<tr>' +
        '<td class="ps-3 text-nowrap small">' + formatTime(l.createdAt) + '</td>' +
        '<td>' + (l.adminCode || (l.adminUserId || '').substring(0, 8)) + '</td>' +
        '<td>' + actionBadge(l.action) + '</td>' +
        '<td>' + (l.targetType || '') + '</td>' +
        '<td class="fw-semibold small">' + (l.targetCode || (l.targetId || '').substring(0, 8)) + '</td>' +
        '<td class="small text-secondary">' + (l.metadata || '') + '</td>' +
      '</tr>';
    }).join('');
  }

  function formatTime(val) {
    if (!val) return '';
    return val.replace('T', ' ').substring(0, 19);
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterLogs(currentLogs, filters);
    renderSummary(rows);
    renderTable(rows);
  }

  function loadLogs() {
    api.fetchApi('/api/admin/logs').then(function (data) {
      currentLogs = Array.isArray(data) ? data : [];
      draw();
    }).catch(function (err) {
      console.error('[logs] load failed:', err);
    });
  }

  window.initLogs = function () {
    loadLogs();
    var form = document.getElementById('logs-filter');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
      form.addEventListener('input', draw);
      form.addEventListener('change', draw);
    }
    var resetBtn = document.getElementById('logs-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.querySelectorAll('[data-filter-key]').forEach(function (c) {
          if (c.tagName.toLowerCase() === 'select') { c.selectedIndex = 0; }
          else { c.value = ''; }
        });
        draw();
      });
    }
  };
})();
