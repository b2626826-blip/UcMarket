(function () {
  'use strict';

  var currentMarkets = [];
  var statusLabelMap = { PENDING: '待審核', ACTIVE: '進行中', CLOSED: '已截止', RESOLVED: '已結算', REJECTED: '已拒絕', DRAFT: '草稿', CANCELED: '已取消' };
  var statusClassMap = { PENDING: 'status-pending', ACTIVE: 'status-active', CLOSED: 'status-closed', RESOLVED: 'status-approved', REJECTED: 'status-rejected', DRAFT: 'status-closed', CANCELED: 'status-closed' };

  function statusBadge(status) {
    var cls = statusClassMap[status] || 'status-closed';
    var label = statusLabelMap[status] || status;
    return '<span class="status-badge ' + cls + '">' + label + '</span>';
  }

  function actionButtons(m) {
    var s = m.status;
    var id = m.id;
    var btns = '';

    if (s === 'DRAFT') {
      btns += '<button class="btn btn-sm btn-outline-primary me-1 mk-submit" data-id="' + id + '">送審</button>';
      btns += '<button class="btn btn-sm btn-outline-danger me-1 mk-cancel" data-id="' + id + '">取消</button>';
    } else if (s === 'PENDING') {
      btns += '<button class="btn btn-sm btn-outline-success me-1 mk-approve" data-id="' + id + '">核准</button>';
      btns += '<button class="btn btn-sm btn-outline-danger me-1 mk-reject" data-id="' + id + '">拒絕</button>';
      btns += '<button class="btn btn-sm btn-outline-warning me-1 mk-changes" data-id="' + id + '">要求修改</button>';
    } else if (s === 'ACTIVE' || s === 'CLOSED') {
      btns += '<button class="btn btn-sm btn-outline-info me-1 mk-resolve" data-id="' + id + '">結算</button>';
      if (s === 'ACTIVE') {
        btns += '<button class="btn btn-sm btn-outline-danger me-1 mk-cancel" data-id="' + id + '">取消</button>';
      }
    }
    return btns || '<span class="text-secondary small">—</span>';
  }

  function renderSummary(data) {
    var total = data.length;
    var pending = data.filter(function (m) { return m.status === 'PENDING'; }).length;
    var active = data.filter(function (m) { return m.status === 'ACTIVE'; }).length;
    var resolved = data.filter(function (m) { return m.status === 'RESOLVED'; }).length;
    setText('m-sum-0', total);
    setText('m-sum-1', pending);
    setText('m-sum-2', active);
    setText('m-sum-3', resolved);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function populateCategories(markets) {
    var cats = [];
    markets.forEach(function (m) {
      if (m.category && cats.indexOf(m.category) === -1) cats.push(m.category);
    });
    var select = document.querySelector('#markets-filter [data-filter-key="category"]');
    if (!select) return;
    select.querySelectorAll('option:not([value=""])').forEach(function (o) { o.remove(); });
    cats.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
  }

  function getFilterValues() {
    var form = document.getElementById('markets-filter');
    if (!form) return {};
    var values = {};
    form.querySelectorAll('[data-filter-key]').forEach(function (c) {
      values[c.getAttribute('data-filter-key')] = c.value.trim();
    });
    return values;
  }

  function filterMarkets(markets, filters) {
    return markets.filter(function (m) {
      var byKeyword = !filters.keyword ||
        ((m.id || '') + ' ' + (m.title || '') + ' ' + (m.creatorId || '')).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byStatus = !filters.status || m.status === filters.status;
      var byCategory = !filters.category || m.category === filters.category;
      return byKeyword && byStatus && byCategory;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('markets-list');
    var title = document.getElementById('markets-table-title');
    if (!tbody) return;
    if (title) title.textContent = '事件資料 (' + rows.length + ')';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的事件。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (m) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold small">' + (m.code || (m.id || '').substring(0, 8)) + '</td>' +
        '<td>' + (m.title || '') + '</td>' +
        '<td>' + (m.category || '') + '</td>' +
        '<td>' + (m.creatorCode || (m.creatorId || '').substring(0, 8)) + '</td>' +
        '<td>' + formatTime(m.closeAt) + '</td>' +
        '<td>' + (m.yesPool || 0) + '</td>' +
        '<td>' + (m.noPool || 0) + '</td>' +
        '<td>' + statusBadge(m.status) + '</td>' +
        '<td class="text-center"><div class="table-actions">' + actionButtons(m) + '</div></td>' +
      '</tr>';
    }).join('');

    attachActions();
  }

  function attachActions() {
    document.querySelectorAll('.mk-submit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        api.postApi('/api/markets/' + id + '/submit', null)
          .then(function () { window.showToast('success', '已送審', '市場已送審。'); loadMarkets(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.mk-approve').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        api.postApi('/api/admin/markets/' + id + '/approve', null)
          .then(function () { window.showToast('success', '已核准', '市場已核准。'); loadMarkets(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.mk-reject').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var reason = prompt('請輸入拒絕原因：');
        if (!reason) return;
        api.postApi('/api/admin/markets/' + id + '/reject', { comment: reason })
          .then(function () { window.showToast('warning', '已拒絕', '市場已被拒絕。'); loadMarkets(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.mk-changes').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var comment = prompt('請輸入要求修改的原因：');
        if (!comment) return;
        api.postApi('/api/admin/markets/' + id + '/request-changes', { comment: comment })
          .then(function () { window.showToast('info', '已送回', '已要求修改。'); loadMarkets(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.mk-resolve').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var result = prompt('請輸入結果（YES/NO）：');
        if (!result || (result.toUpperCase() !== 'YES' && result.toUpperCase() !== 'NO')) {
          window.showToast('warning', '格式錯誤', '請輸入 YES 或 NO');
          return;
        }
        api.postApi('/api/admin/markets/' + id + '/resolve', { result: result.toUpperCase() })
          .then(function () { window.showToast('success', '已結算', '市場已結算。'); loadMarkets(); })
          .catch(function (err) { window.showToast('danger', '失敗', err.message); });
      });
    });
    document.querySelectorAll('.mk-cancel').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!confirm('確定要取消這個市場嗎？')) return;
        api.postApi('/api/markets/' + id + '/cancel', null)
          .then(function () { window.showToast('warning', '已取消', '市場已取消。'); loadMarkets(); })
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
    var rows = filterMarkets(currentMarkets, filters);
    renderTable(rows);
  }

  function loadMarkets() {
    api.fetchApi('/api/admin/markets').then(function (data) {
      var markets = data.markets || data;
      currentMarkets = Array.isArray(markets) ? markets : [];
      renderSummary(currentMarkets);
      populateCategories(currentMarkets);
      draw();
    }).catch(function (err) {
      console.error('[markets] load failed:', err);
    });
  }

  window.initMarkets = function () {
    loadMarkets();
    var form = document.getElementById('markets-filter');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
      form.addEventListener('input', draw);
      form.addEventListener('change', draw);
    }
    var resetBtn = document.getElementById('markets-filter-reset');
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
