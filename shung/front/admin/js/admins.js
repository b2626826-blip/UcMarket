(function () {
  'use strict';

  var mockData = {
    summary: [
      { value: 5, tone: 'primary' },
      { value: 3, tone: 'success' },
      { value: 1, tone: 'danger' },
      { value: 18, tone: 'warning' }
    ],
    admins: [
      { id: 'ADM-0001', username: 'admin_shung', email: 'admin.shung@ucmarket.com', role: 'ADMIN', status: 'ACTIVE', lastLoginAt: '2026-06-08 09:12', createdAt: '2024-01-15' },
      { id: 'ADM-0002', username: 'admin_mina', email: 'admin.mina@ucmarket.com', role: 'ADMIN', status: 'ACTIVE', lastLoginAt: '2026-06-07 14:30', createdAt: '2024-03-20' },
      { id: 'ADM-0003', username: 'tim', email: 'tim@ucmarket.com', role: 'ADMIN', status: 'ACTIVE', lastLoginAt: '2026-06-06 18:45', createdAt: '2024-03-22' },
      { id: 'ADM-0004', username: 'roy', email: 'roy@ucmarket.com', role: 'ADMIN', status: 'ACTIVE', lastLoginAt: '2026-06-08 08:05', createdAt: '2024-04-10' },
      { id: 'ADM-0005', username: 'moderator_01', email: 'mod01@ucmarket.com', role: 'ADMIN', status: 'BANNED', lastLoginAt: '2026-05-20 11:00', createdAt: '2025-01-05' }
    ]
  };

  function statusBadge(status) {
    if (status === 'ACTIVE') return '<span class="status-badge status-approved">正常</span>';
    return '<span class="status-badge status-rejected">停權</span>';
  }

  function renderSummary(summary) {
    for (var i = 0; i < summary.length; i++) {
      var el = document.getElementById('a-sum-' + i);
      if (el) el.textContent = summary[i].value;
    }
  }

  function getFilterValues() {
    var form = document.getElementById('admins-filter');
    if (!form) return {};
    var values = {};
    form.querySelectorAll('[data-filter-key]').forEach(function (c) {
      values[c.getAttribute('data-filter-key')] = c.value.trim();
    });
    return values;
  }

  function filterAdmins(admins, filters) {
    return admins.filter(function (a) {
      var byKeyword = !filters.keyword ||
        (a.id + ' ' + a.username + ' ' + a.email).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byStatus = !filters.status || a.status === filters.status;
      return byKeyword && byStatus;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('admins-list');
    var title = document.getElementById('admins-table-title');
    if (!tbody) return;
    if (title) title.textContent = '管理員資料 (' + rows.length + ')';

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-4">' +
        '<i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的管理員。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (a) {
      var isSuspended = a.status === 'BANNED';
      var actionBtn = isSuspended
        ? '<button type="button" class="btn btn-sm btn-outline-success admin-unsuspend" data-id="' + a.id + '">啟用</button>'
        : '<button type="button" class="btn btn-sm btn-outline-danger admin-suspend" data-id="' + a.id + '">停權</button>';
      return '<tr>' +
        '<td class="ps-3 fw-semibold">' + a.id + '</td>' +
        '<td>' + a.username + '</td>' +
        '<td>' + a.email + '</td>' +
        '<td><span class="status-badge status-active">管理員</span></td>' +
        '<td>' + statusBadge(a.status) + '</td>' +
        '<td>' + a.lastLoginAt + '</td>' +
        '<td>' + a.createdAt + '</td>' +
        '<td class="text-center"><div class="table-actions">' + actionBtn + '</div></td>' +
      '</tr>';
    }).join('');
  }

  function attachActionHandlers() {
    document.querySelectorAll('.admin-suspend').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        mockData.admins = mockData.admins.map(function (a) {
          if (a.id === id) a.status = 'BANNED';
          return a;
        });
        window.showToast('warning', '已停權', '管理員 ' + id + ' 已停權。');
        draw();
      });
    });
    document.querySelectorAll('.admin-unsuspend').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        mockData.admins = mockData.admins.map(function (a) {
          if (a.id === id) a.status = 'ACTIVE';
          return a;
        });
        window.showToast('success', '已啟用', '管理員 ' + id + ' 已解除停權。');
        draw();
      });
    });
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterAdmins(mockData.admins, filters);
    renderTable(rows);
    attachActionHandlers();
  }

  window.initAdmins = function () {
    renderSummary(mockData.summary);
    draw();

    var form = document.getElementById('admins-filter');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
      form.addEventListener('input', draw);
      form.addEventListener('change', draw);
    }

    var resetBtn = document.getElementById('admins-filter-reset');
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
