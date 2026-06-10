(function () {
  'use strict';

  var mockData = {
    summary: [
      { label: "今日成交筆數", value: 268, tone: "primary" },
      { label: "今日成交量", value: "12,345,678", tone: "success" },
      { label: "異常交易", value: 4, tone: "danger" },
      { label: "退款筆數", value: 11, tone: "warning" }
    ],
    transactions: [
      { id: "TRX-240603-001", userId: "USR-1004", marketId: "MKT-240601", action: "BUY", side: "YES", amount: "3,000", price: "0.6400", shares: "4,687.50", createdAt: "2026-06-03 09:40" },
      { id: "TRX-240603-002", userId: "USR-1001", marketId: "MKT-240602", action: "BUY", side: "NO", amount: "1,200", price: "0.4200", shares: "2,857.14", createdAt: "2026-06-03 09:32" },
      { id: "TRX-240603-003", userId: "USR-1002", marketId: "MKT-240603", action: "BUY", side: "YES", amount: "8,500", price: "0.5800", shares: "14,655.17", createdAt: "2026-06-03 09:18" },
      { id: "TRX-240603-004", userId: "USR-1005", marketId: "MKT-240605", action: "BUY", side: "NO", amount: "2,050", price: "0.3700", shares: "5,540.54", createdAt: "2026-06-03 08:57" },
      { id: "TRX-240603-005", userId: "USR-1003", marketId: "MKT-240604", action: "BUY", side: "YES", amount: "980", price: "0.5300", shares: "1,849.06", createdAt: "2026-06-03 08:36" }
    ]
  };

  function sideBadge(side) {
    if (side === "YES") return '<span class="status-badge status-active">YES</span>';
    return '<span class="status-badge status-closed">NO</span>';
  }

  function actionBadge(action) {
    if (action === "BUY") return '<span class="status-badge status-approved">買入</span>';
    return '<span class="status-badge status-closed">賣出</span>';
  }

  function renderSummary(summary) {
    for (var i = 0; i < summary.length; i++) {
      var el = document.getElementById('t-sum-' + i);
      if (el) el.textContent = summary[i].value;
    }
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

  function filterTransactions(items, filters) {
    return items.filter(function (tx) {
      var byKeyword = !filters.keyword ||
        (tx.id + ' ' + tx.userId + ' ' + tx.marketId).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
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

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>找不到符合條件的交易。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (tx) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold">' + tx.id + '</td>' +
        '<td>' + tx.userId + '</td>' +
        '<td>' + tx.marketId + '</td>' +
        '<td>' + actionBadge(tx.action) + '</td>' +
        '<td>' + sideBadge(tx.side) + '</td>' +
        '<td>' + tx.amount + '</td>' +
        '<td>' + tx.price + '</td>' +
        '<td>' + tx.shares + '</td>' +
        '<td>' + tx.createdAt + '</td>' +
      '</tr>';
    }).join('');
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterTransactions(mockData.transactions, filters);
    renderTable(rows);
  }

  window.initTransactions = function () {
    renderSummary(mockData.summary);
    draw();

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
