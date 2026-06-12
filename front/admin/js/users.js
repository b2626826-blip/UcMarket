(function () {
  'use strict';

  var currentUsers = [];

  function accountStatusBadge(status) {
    if (status === 'ACTIVE') return '<span class="status-badge status-active">正常</span>';
    if (status === 'BANNED') return '<span class="status-badge status-rejected">停權</span>';
    return '<span class="status-badge status-closed">停用</span>';
  }

  function roleBadge(role) {
    if (role === 'ADMIN') return '<span class="status-badge status-approved">管理員</span>';
    return '<span class="status-badge status-closed">一般用戶</span>';
  }

  function actionButtons(u) {
    if (u.status === 'ACTIVE') {
      return '<button class="btn btn-sm btn-outline-danger usr-suspend" data-id="' + u.id + '">停權</button>';
    } else if (u.status === 'BANNED') {
      return '<button class="btn btn-sm btn-outline-success usr-unsuspend" data-id="' + u.id + '">啟用</button>';
    }
    return '<span class="text-secondary small">—</span>';
  }

  function renderSummary(data) {
    setText('u-sum-0', data.length);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getFilterValues() {
    var form = document.getElementById('users-filter');
    if (!form) return {};
    var values = {};
    form.querySelectorAll('[data-filter-key]').forEach(function (c) {
      values[c.getAttribute('data-filter-key')] = c.value.trim();
    });
    return values;
  }

  function filterUsers(users, filters) {
    return users.filter(function (u) {
      var byKeyword = !filters.keyword ||
        ((u.id || '') + ' ' + (u.username || '') + ' ' + (u.email || '')).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byStatus = !filters.status || u.status === filters.status;
      return byKeyword && byStatus;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('users-list');
    var title = document.getElementById('users-table-title');
    if (!tbody) return;
    if (title) title.textContent = '用戶資料 (' + rows.length + ')';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-3">找不到符合條件的用戶。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (u) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold small">' + (u.code || (u.id || '').substring(0, 8)) + '</td>' +
        '<td>' + (u.username || '') + '</td>' +
        '<td>' + roleBadge(u.role) + '</td>' +
        '<td>' + accountStatusBadge(u.status) + '</td>' +
        '<td>' + (u.reputation || 0) + '</td>' +
        '<td>-</td>' +
        '<td>' + formatTime(u.lastLoginAt) + '</td>' +
        '<td class="text-center">' + actionButtons(u) + '</td>' +
      '</tr>';
    }).join('');

    document.querySelectorAll('.usr-suspend').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        api.postApi('/api/admin/users/' + id + '/suspend', null)
          .then(function () { window.showToast('warning', '已停權', '用戶已停權。'); loadUsers(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.usr-unsuspend').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        api.postApi('/api/admin/users/' + id + '/unsuspend', null)
          .then(function () { window.showToast('success', '已啟用', '用戶已解除停權。'); loadUsers(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
  }

  function formatTime(val) {
    if (!val) return '';
    return val.replace('T', ' ').substring(0, 16);
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterUsers(currentUsers, filters);
    renderTable(rows);
  }

  function loadUsers() {
    api.fetchApi('/api/admin/users').then(function (data) {
      currentUsers = Array.isArray(data) ? data : [];
      renderSummary(currentUsers);
      draw();
    }).catch(function (err) {
      console.error('[users] load failed:', err);
    });
  }

  window.initUsers = function () {
    loadUsers();
    var form = document.getElementById('users-filter');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
      form.addEventListener('input', draw);
      form.addEventListener('change', draw);
    }
    var resetBtn = document.getElementById('users-filter-reset');
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
