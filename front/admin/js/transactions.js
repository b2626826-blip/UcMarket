(function () {
  'use strict';

  var currentTx = [];

  function sideBadge(side) {
    if (side === 'YES') return '<span class="status-badge status-active">YES</span>';
    return '<span class="status-badge status-closed">NO</span>';
  }

  function actionBadge(action) {
    if (action === 'BUY') return '<span class="status-badge status-approved">買入</span>';
    return '<span class="status-badge status-closed">賣出</span>';
  }

  function renderSummary(data) {
    setText('t-sum-0', data.length);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getFilterValues() {
    var form = document.getElementById('tx-filter');
    if (!form) return {};
    var values = {};
    form.querySelectorAll('[data-filter-key]').forEach(function (c) {
      values[c.getAttribute('data-filter-key')] = c.value.trim();
    });
    return values;
  }

  function filterTx(items, filters) {
    return items.filter(function (tx) {
      var byKeyword = !filters.keyword ||
        ((tx.id || '') + ' ' + (tx.marketId || '')).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byAction = !filters.action || tx.action === filters.action;
      var bySide = !filters.side || tx.side === filters.side;
      return byKeyword && byAction && bySide;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('transactions-list');
    var title = document.getElementById('tx-table-title');
    if (!tbody) return;
    if (title) title.textContent = '交易資料 (' + rows.length + ')';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的交易。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (tx) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold small">' + (tx.code || (tx.id || '').substring(0, 8)) + '</td>' +
        '<td class="small">' + (tx.userCode || (tx.userId || '').substring(0, 8)) + '</td>' +
        '<td class="small">' + (tx.marketCode || (tx.marketId || '').substring(0, 8)) + '</td>' +
        '<td>' + actionBadge(tx.action) + '</td>' +
        '<td>' + sideBadge(tx.side) + '</td>' +
        '<td>' + (tx.amount || 0) + '</td>' +
        '<td>' + (tx.price || 0) + '</td>' +
        '<td>' + (tx.shares || 0) + '</td>' +
        '<td>' + formatTime(tx.createdAt) + '</td>' +
      '</tr>';
    }).join('');
  }

  function formatTime(val) {
    if (!val) return '';
    return val.replace('T', ' ').substring(0, 19);
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterTx(currentTx, filters);
    renderTable(rows);
  }

  function loadTx() {
    api.fetchApi('/api/admin/transactions').then(function (data) {
      currentTx = Array.isArray(data) ? data : [];
      renderSummary(currentTx);
      draw();
    }).catch(function (err) {
      console.error('[transactions] load failed:', err);
    });
  }

  window.initTransactions = function () {
    loadTx();
    var form = document.getElementById('tx-filter');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
      form.addEventListener('input', draw);
      form.addEventListener('change', draw);
    }
    var resetBtn = document.getElementById('tx-filter-reset');
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
