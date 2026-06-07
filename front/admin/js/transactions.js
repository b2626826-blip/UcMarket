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
      { id: "TRX-240603-001", username: "crypto_king", marketId: "MKT-240601", side: "yes", amount: "3,000", price: "0.64", createdAt: "2026-06-03 09:40", status: "completed" },
      { id: "TRX-240603-002", username: "user_1234", marketId: "MKT-240602", side: "no", amount: "1,200", price: "0.42", createdAt: "2026-06-03 09:32", status: "completed" },
      { id: "TRX-240603-003", username: "trader_nick", marketId: "MKT-240603", side: "yes", amount: "8,500", price: "0.58", createdAt: "2026-06-03 09:18", status: "flagged" },
      { id: "TRX-240603-004", username: "market_maker", marketId: "MKT-240605", side: "no", amount: "2,050", price: "0.37", createdAt: "2026-06-03 08:57", status: "refunded" },
      { id: "TRX-240603-005", username: "apple_fan", marketId: "MKT-240604", side: "yes", amount: "980", price: "0.53", createdAt: "2026-06-03 08:36", status: "completed" }
    ]
  };

  var txStatusMap = {
    completed: { cls: "status-approved", label: "完成" },
    flagged: { cls: "status-rejected", label: "異常" },
    refunded: { cls: "status-pending", label: "退款" }
  };

  function sideBadge(side) {
    if (side === "yes") return '<span class="status-badge status-active">YES</span>';
    return '<span class="status-badge status-closed">NO</span>';
  }

  function txStatusBadge(status) {
    var item = txStatusMap[status] || { cls: "status-closed", label: status };
    return '<span class="status-badge ' + item.cls + '">' + item.label + '</span>';
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
        (tx.id + ' ' + tx.username + ' ' + tx.marketId).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byStatus = !filters.status || tx.status === filters.status;
      var bySide = !filters.side || tx.side === filters.side;
      return byKeyword && byStatus && bySide;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('transactions-list');
    var title = document.getElementById('tx-table-title');
    if (!tbody) return;
    if (title) title.textContent = '交易資料 (' + rows.length + ')';

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-3">找不到符合條件的交易。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (tx) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold">' + tx.id + '</td>' +
        '<td>' + tx.username + '</td>' +
        '<td>' + tx.marketId + '</td>' +
        '<td>' + sideBadge(tx.side) + '</td>' +
        '<td>' + tx.amount + '</td>' +
        '<td>' + tx.price + '</td>' +
        '<td>' + tx.createdAt + '</td>' +
        '<td>' + txStatusBadge(tx.status) + '</td>' +
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
