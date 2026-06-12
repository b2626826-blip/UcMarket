(function () {
  'use strict';

  function loadDashboard() {
    Promise.all([
      api.fetchApi('/api/admin/dashboard/stats'),
      api.fetchApi('/api/admin/dashboard/reviews')
    ]).then(function (results) {
      var stats = results[0];
      var reviews = results[1];
      renderStats(stats);
      renderReviews(reviews || []);
      renderSystemInfo(stats);
    }).catch(function (err) {
      console.error('[dashboard] load failed:', err);
    });
  }

  function renderStats(stats) {
    var s = stats || {};
    setText('stat-pending', s.pendingCount);
    setText('stat-approved', s.activeCount);
    setText('stat-rejected', s.rejectedCount);
    setText('stat-changes', s.draftCount || 0);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val != null ? val : '-';
  }

  function actionButton(label, className, onClick) {
    return '<button type="button" class="btn btn-sm ' + className + '">' + label + '</button>';
  }

  function renderReviews(reviews) {
    var tbody = document.getElementById('dashboard-reviews');
    if (!tbody) return;
    if (!reviews.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">暫無待審事件</td></tr>';
      return;
    }
    tbody.innerHTML = reviews.map(function (r) {
      return '<tr>' +
        '<td class="ps-3">' + (r.title || '') + '</td>' +
        '<td>' + (r.creatorCode || (r.creatorId || '').substring(0, 8)) + '</td>' +
        '<td>' + (formatTime(r.createdAt)) + '</td>' +
        '<td><span class="status-badge status-pending">' + (r.category || '') + '</span></td>' +
        '<td>' + (formatTime(r.closeAt)) + '</td>' +
        '<td><div class="table-actions" data-market-id="' + r.id + '">' +
          '<button type="button" class="btn btn-sm btn-outline-success approve-btn">核准</button> ' +
          '<button type="button" class="btn btn-sm btn-outline-danger reject-btn">拒絕</button> ' +
          '<button type="button" class="btn btn-sm btn-outline-warning changes-btn">要求修改</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.approve-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.closest('[data-market-id]').getAttribute('data-market-id');
        api.postApi('/api/admin/markets/' + id + '/approve', null)
          .then(function () { window.showToast('success', '已核准', '市場已核准上架。'); loadDashboard(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    tbody.querySelectorAll('.reject-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.closest('[data-market-id]').getAttribute('data-market-id');
        var reason = prompt('請輸入拒絕原因：');
        if (!reason) return;
        api.postApi('/api/admin/markets/' + id + '/reject', { comment: reason })
          .then(function () { window.showToast('warning', '已拒絕', '市場已被拒絕。'); loadDashboard(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    tbody.querySelectorAll('.changes-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.closest('[data-market-id]').getAttribute('data-market-id');
        var comment = prompt('請輸入要求修改的原因：');
        if (!comment) return;
        api.postApi('/api/admin/markets/' + id + '/request-changes', { comment: comment })
          .then(function () { window.showToast('info', '已送回', '已要求修改。'); loadDashboard(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
  }

  function renderSystemInfo(stats) {
    var container = document.getElementById('system-info');
    if (!container) return;
    var items = [
      { label: '總用戶數', value: stats.totalUsers || 0 },
      { label: '總市場數', value: stats.totalMarkets || 0 },
      { label: '進行中', value: stats.activeCount || 0 },
      { label: '待審核', value: stats.pendingCount || 0 },
      { label: '系統狀態', value: '正常運行' }
    ];
    container.innerHTML = items.map(function (item) {
      var cls = item.value === '正常運行' ? ' class="text-success"' : '';
      return '<div class="system-item"><span class="text-secondary">' + item.label + '</span><span class="fw-semibold"' + cls + '>' + item.value + '</span></div>';
    }).join('');
  }

  function formatTime(val) {
    if (!val) return '';
    return val.replace('T', ' ').substring(0, 19);
  }

  window.initDashboard = loadDashboard;
})();
