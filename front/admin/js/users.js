(function () {
  'use strict';

  var mockData = {
    summary: [
      { label: "總用戶", value: 1248, tone: "primary" },
      { label: "今日活躍", value: 327, tone: "success" },
      { label: "停權中", value: 9, tone: "danger" },
      { label: "待審核開盤者", value: 14, tone: "warning" }
    ],
    users: [
      { id: "USR-1001", username: "user_1234", role: "user", reputation: 78, status: "active", balance: "28,500", lastLogin: "2026-06-03 09:12" },
      { id: "USR-1002", username: "trader_nick", role: "user", reputation: 91, status: "active", balance: "35,040", lastLogin: "2026-06-03 08:41" },
      { id: "USR-1003", username: "apple_fan", role: "user", reputation: 63, status: "suspended", balance: "4,880", lastLogin: "2026-05-26 23:10" },
      { id: "USR-1004", username: "admin", role: "admin", reputation: 99, status: "active", balance: "--", lastLogin: "2026-06-03 10:01" },
      { id: "USR-1005", username: "market_maker", role: "user", reputation: 84, status: "active", balance: "18,230", lastLogin: "2026-06-02 22:34" }
    ]
  };

  function roleBadge(role) {
    if (role === "admin") return '<span class="status-badge status-active">管理員</span>';
    return '<span class="status-badge status-closed">一般用戶</span>';
  }

  function accountStatusBadge(status) {
    if (status === "active") return '<span class="status-badge status-active">正常</span>';
    return '<span class="status-badge status-rejected">停權</span>';
  }

  function renderSummary(summary) {
    for (var i = 0; i < summary.length; i++) {
      var el = document.getElementById('u-sum-' + i);
      if (el) el.textContent = summary[i].value;
    }
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
        (u.id + ' ' + u.username).toLowerCase().indexOf(filters.keyword.toLowerCase()) !== -1;
      var byRole = !filters.role || u.role === filters.role;
      var byStatus = !filters.status || u.status === filters.status;
      return byKeyword && byRole && byStatus;
    });
  }

  function renderTable(rows) {
    var tbody = document.getElementById('users-list');
    var title = document.getElementById('users-table-title');
    if (!tbody) return;
    if (title) title.textContent = '用戶資料 (' + rows.length + ')';

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-3">找不到符合條件的用戶。</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (u) {
      return '<tr>' +
        '<td class="ps-3 fw-semibold">' + u.id + '</td>' +
        '<td>' + u.username + '</td>' +
        '<td>' + roleBadge(u.role) + '</td>' +
        '<td>' + accountStatusBadge(u.status) + '</td>' +
        '<td>' + u.reputation + '</td>' +
        '<td>' + u.balance + '</td>' +
        '<td>' + u.lastLogin + '</td>' +
      '</tr>';
    }).join('');
  }

  function draw() {
    var filters = getFilterValues();
    var rows = filterUsers(mockData.users, filters);
    renderTable(rows);
  }

  window.initUsers = function () {
    renderSummary(mockData.summary);
    draw();

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
