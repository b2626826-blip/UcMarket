(function () {
  'use strict';

  var currentAdmins = [];

  function statusBadge(status) {
    if (status === 'ACTIVE') return '<span class="status-badge status-approved">正常</span>';
    return '<span class="status-badge status-rejected">停權</span>';
  }

  function renderSummary(data) {
    setText('a-sum-0', data.length);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
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
        ((a.id || '') + ' ' + (a.username || '') + ' ' + (a.email || '')).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byStatus = !filters.status || a.status === filters.status;
      return byKeyword && byStatus;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('admins-list');
    var title = document.getElementById('admins-table-title');
    if (!tbody) return;
    if (title) title.textContent = '管理員資料 (' + rows.length + ')';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的管理員。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (a) {
      var isSuspended = a.status === 'BANNED';
      var actionBtn = isSuspended
        ? '<button class="btn btn-sm btn-outline-success adm-unsuspend" data-id="' + a.id + '">啟用</button>'
        : '<button class="btn btn-sm btn-outline-danger adm-suspend" data-id="' + a.id + '">停權</button>';
      return '<tr>' +
        '<td class="ps-3 fw-semibold small">' + (a.code || (a.id || '').substring(0, 8)) + '</td>' +
        '<td>' + (a.username || '') + '</td>' +
        '<td>' + (a.email || '') + '</td>' +
        '<td><span class="status-badge status-active">管理員</span></td>' +
        '<td>' + statusBadge(a.status) + '</td>' +
        '<td>' + formatTime(a.lastLoginAt) + '</td>' +
        '<td>' + formatTime(a.createdAt) + '</td>' +
        '<td class="text-center"><div class="table-actions">' + actionBtn + '</div></td>' +
      '</tr>';
    }).join('');

    document.querySelectorAll('.adm-suspend').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        api.postApi('/api/admin/users/' + id + '/suspend', null)
          .then(function () { window.showToast('warning', '已停權', '管理員已停權。'); loadAdmins(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.adm-unsuspend').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        api.postApi('/api/admin/users/' + id + '/unsuspend', null)
          .then(function () { window.showToast('success', '已啟用', '管理員已解除停權。'); loadAdmins(); })
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
    var rows = filterAdmins(currentAdmins, filters);
    renderTable(rows);
  }

  function loadAdmins() {
    api.fetchApi('/api/admin/users', { role: 'ADMIN' }).then(function (data) {
      currentAdmins = Array.isArray(data) ? data : [];
      renderSummary(currentAdmins);
      draw();
    }).catch(function (err) {
      console.error('[admins] load failed:', err);
    });
  }

  window.initAdmins = function () {
    loadAdmins();
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
