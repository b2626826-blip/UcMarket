(function () {
  'use strict';

  var mockData = {
    summary: [
      { value: 18, tone: 'primary' },
      { value: 8, tone: 'success' },
      { value: 3, tone: 'warning' },
      { value: 7, tone: 'info' }
    ],
    logs: [
      { id: 'LOG-240608-001', adminUserId: 'ADM-0001', action: 'MARKET_APPROVE', targetType: 'MARKET', targetId: 'MKT-240601', createdAt: '2026-06-08 10:30:00', detail: '核准上架' },
      { id: 'LOG-240608-002', adminUserId: 'ADM-0002', action: 'MARKET_REJECT', targetType: 'MARKET', targetId: 'MKT-240602', createdAt: '2026-06-08 10:15:00', detail: '拒絕原因：來源不足' },
      { id: 'LOG-240608-003', adminUserId: 'ADM-0001', action: 'USER_SUSPEND', targetType: 'USER', targetId: 'USR-1003', createdAt: '2026-06-08 09:50:00', detail: '違反平台規則' },
      { id: 'LOG-240607-004', adminUserId: 'ADM-0003', action: 'MARKET_RESOLVE', targetType: 'MARKET', targetId: 'MKT-240599', createdAt: '2026-06-07 18:00:00', detail: '結果：YES' },
      { id: 'LOG-240607-005', adminUserId: 'ADM-0001', action: 'MARKET_REQUEST_CHANGES', targetType: 'MARKET', targetId: 'MKT-240603', createdAt: '2026-06-07 15:20:00', detail: '請補充裁決規則' },
      { id: 'LOG-240607-006', adminUserId: 'ADM-0004', action: 'MARKET_APPROVE', targetType: 'MARKET', targetId: 'MKT-240598', createdAt: '2026-06-07 14:00:00', detail: '核准上架' },
      { id: 'LOG-240606-007', adminUserId: 'ADM-0001', action: 'USER_UNSUSPEND', targetType: 'USER', targetId: 'USR-1005', createdAt: '2026-06-06 11:30:00', detail: '申訴通過' },
      { id: 'LOG-240606-008', adminUserId: 'ADM-0002', action: 'MARKET_APPROVE', targetType: 'MARKET', targetId: 'MKT-240597', createdAt: '2026-06-06 10:00:00', detail: '核准上架' },
      { id: 'LOG-240605-009', adminUserId: 'ADM-0001', action: 'MARKET_RESOLVE', targetType: 'MARKET', targetId: 'MKT-240596', createdAt: '2026-06-05 16:45:00', detail: '結果：NO' },
      { id: 'LOG-240605-010', adminUserId: 'ADM-0003', action: 'USER_SUSPEND', targetType: 'USER', targetId: 'USR-1007', createdAt: '2026-06-05 09:20:00', detail: '多次違規' }
    ]
  };

  var actionLabelMap = {
    MARKET_APPROVE: '核准事件',
    MARKET_REJECT: '拒絕事件',
    MARKET_RESOLVE: '結算事件',
    MARKET_REQUEST_CHANGES: '要求修改',
    USER_SUSPEND: '停權用戶',
    USER_UNSUSPEND: '解除停權'
  };

  var actionClassMap = {
    MARKET_APPROVE: 'status-approved',
    MARKET_REJECT: 'status-rejected',
    MARKET_RESOLVE: 'status-active',
    MARKET_REQUEST_CHANGES: 'status-pending',
    USER_SUSPEND: 'status-rejected',
    USER_UNSUSPEND: 'status-approved'
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

    var el0 = document.getElementById('l-sum-0');
    var el1 = document.getElementById('l-sum-1');
    var el2 = document.getElementById('l-sum-2');
    var el3 = document.getElementById('l-sum-3');
    if (el0) el0.textContent = logs.length;
    if (el1) el1.textContent = marketCount;
    if (el2) el2.textContent = userCount;
    if (el3) el3.textContent = systemCount;
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
        (l.adminUserId + ' ' + l.action + ' ' + l.targetId + ' ' + l.detail).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byAction = !filters.action || l.action === filters.action;
      return byKeyword && byAction;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('logs-list');
    var title = document.getElementById('logs-table-title');
    if (!tbody) return;
    if (title) title.textContent = '操作紀錄 (' + rows.length + ')';

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">' +
        '<i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的紀錄。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (l) {
      return '<tr>' +
        '<td class="ps-3 text-nowrap small">' + l.createdAt + '</td>' +
        '<td>' + l.adminUserId + '</td>' +
        '<td>' + actionBadge(l.action) + '</td>' +
        '<td>' + l.targetType + '</td>' +
        '<td class="fw-semibold small">' + l.targetId + '</td>' +
        '<td class="small text-secondary">' + l.detail + '</td>' +
      '</tr>';
    }).join('');
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterLogs(mockData.logs, filters);
    renderSummary(rows);
    renderTable(rows);
  }

  window.initLogs = function () {
    draw();

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
