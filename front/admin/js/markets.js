(function () {
  'use strict';

  var mockData = {
    summary: [
      { label: "全部事件", value: 86, tone: "primary" },
      { label: "待審核", value: 12, tone: "warning" },
      { label: "進行中", value: 53, tone: "success" },
      { label: "已結算", value: 21, tone: "secondary" }
    ],
    markets: [
      { id: "MKT-240601", title: "BTC 是否會在 2026-06-30 前突破 120,000 美元？", category: "加密貨幣", creator: "crypto_king", status: "active", closeAt: "2026-06-30", volume: "4,280,000" },
      { id: "MKT-240602", title: "輝達下一季財報營收是否超過市場預期？", category: "股票", creator: "trader_nick", status: "pending", closeAt: "2026-07-15", volume: "1,125,000" },
      { id: "MKT-240603", title: "iPhone 18 是否於 9 月發表會亮相？", category: "科技", creator: "apple_fan", status: "active", closeAt: "2026-09-30", volume: "2,048,000" },
      { id: "MKT-240604", title: "台灣職棒總冠軍賽是否打滿七戰？", category: "體育", creator: "sports_analyzer", status: "resolved", closeAt: "2026-11-01", volume: "890,000" },
      { id: "MKT-240605", title: "美元指數是否在月底前站上 110？", category: "總經", creator: "macro_lover", status: "closed", closeAt: "2026-06-25", volume: "750,000" }
    ]
  };

  var statusLabelMap = { pending: "待審核", active: "進行中", closed: "已截止", resolved: "已結算" };
  var statusClassMap = { pending: "status-pending", active: "status-active", closed: "status-closed", resolved: "status-approved" };

  function statusBadge(status) {
    var cls = statusClassMap[status] || "status-closed";
    var label = statusLabelMap[status] || status;
    return '<span class="status-badge ' + cls + '">' + label + '</span>';
  }

  function renderSummary(summary) {
    for (var i = 0; i < summary.length; i++) {
      var el = document.getElementById('m-sum-' + i);
      if (el) el.textContent = summary[i].value;
    }
  }

  function populateCategories(markets) {
    var cats = [];
    markets.forEach(function (m) {
      if (cats.indexOf(m.category) === -1) cats.push(m.category);
    });
    var select = document.querySelector('#markets-filter [data-filter-key="category"]');
    if (!select) return;
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
    var controls = form.querySelectorAll('[data-filter-key]');
    var values = {};
    controls.forEach(function (c) {
      values[c.getAttribute('data-filter-key')] = c.value.trim();
    });
    return values;
  }

  function filterMarkets(markets, filters) {
    return markets.filter(function (m) {
      var byKeyword = !filters.keyword ||
        (m.id + ' ' + m.title + ' ' + m.creator).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
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

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-3">找不到符合條件的事件。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (m) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold">' + m.id + '</td>' +
        '<td>' + m.title + '</td>' +
        '<td>' + m.category + '</td>' +
        '<td>' + m.creator + '</td>' +
        '<td>' + m.closeAt + '</td>' +
        '<td>' + m.volume + '</td>' +
        '<td>' + statusBadge(m.status) + '</td>' +
      '</tr>';
    }).join('');
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterMarkets(mockData.markets, filters);
    renderTable(rows);
  }

  window.initMarkets = function () {
    renderSummary(mockData.summary);
    populateCategories(mockData.markets);
    draw();

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
