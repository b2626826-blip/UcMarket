(function () {
  'use strict';

  var mockData = {
    stats: [
      { label: "待審核事件", value: 12, tone: "primary", icon: "bi-clock-history" },
      { label: "已核准", value: 28, tone: "success", icon: "bi-check-circle" },
      { label: "已拒絕", value: 5, tone: "danger", icon: "bi-x-circle" },
      { label: "要求修改", value: 3, tone: "warning", icon: "bi-pencil-square" }
    ],
    reviews: [
      { id: "mk-001", title: "比特幣會在 2025 年底前突破 12 萬美元嗎？", creator: "user_1234", submittedAt: "2024-05-26 14:30", category: "加密貨幣", closeAt: "2025-12-31", status: "pending" },
      { id: "mk-002", title: "輝達 2024 Q3 財報營收會超過市場預期嗎？", creator: "trader_nick", submittedAt: "2024-05-26 13:15", category: "股票", closeAt: "2024-10-15", status: "pending" },
      { id: "mk-003", title: "台灣總統選舉投票率會超過 70%？", creator: "crypto_king", submittedAt: "2024-05-26 12:05", category: "政治", closeAt: "2024-01-13", status: "pending" },
      { id: "mk-004", title: "iPhone 16 會在 9 月發布嗎？", creator: "apple_fan", submittedAt: "2024-05-26 11:20", category: "科技", closeAt: "2024-09-30", status: "pending" }
    ],
    systemInfo: [
      { label: "總用戶數", value: "1,248" },
      { label: "進行中事件", value: "86" },
      { label: "今日交易量", value: "12,345,678" },
      { label: "平台總點數", value: "98,765,432" },
      { label: "系統狀態", value: "正常運行" }
    ]
  };

  function renderStats(stats) {
    var ids = ['stat-pending', 'stat-approved', 'stat-rejected', 'stat-changes'];
    stats.forEach(function (s, i) {
      var el = document.getElementById(ids[i]);
      if (el) el.textContent = s.value;
    });
  }

  function actionButton(label, className) {
    return '<button type="button" class="btn btn-sm ' + className + '">' + label + '</button>';
  }

  function renderReviews(reviews) {
    var tbody = document.getElementById('dashboard-reviews');
    if (!tbody) return;
    tbody.innerHTML = reviews.map(function (r) {
      return '<tr>' +
        '<td class="ps-3">' + r.title + '</td>' +
        '<td>' + r.creator + '</td>' +
        '<td>' + r.submittedAt + '</td>' +
        '<td><span class="status-badge status-pending">' + r.category + '</span></td>' +
        '<td>' + r.closeAt + '</td>' +
        '<td><div class="table-actions">' +
          actionButton("檢視", "btn-outline-secondary") +
          actionButton("核准", "btn-outline-success") +
          actionButton("拒絕", "btn-outline-danger") +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function renderSystemInfo(info) {
    var container = document.getElementById('system-info');
    if (!container) return;
    container.innerHTML = info.map(function (item) {
      var cls = item.value === "正常運行" ? ' class="text-success"' : '';
      return '<div class="system-item">' +
        '<span class="text-secondary">' + item.label + '</span>' +
        '<span class="fw-semibold"' + cls + '>' + item.value + '</span>' +
      '</div>';
    }).join('');
  }

  window.initDashboard = function () {
    renderStats(mockData.stats);
    renderReviews(mockData.reviews);
    renderSystemInfo(mockData.systemInfo);
  };
})();
