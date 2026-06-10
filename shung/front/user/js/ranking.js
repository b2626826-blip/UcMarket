(function () {
  'use strict';

  var rankingData = [
    { name: "MarketWolf", account: "@wolf88", market: "政治", profit: 128430, winRate: 92.8, volume: 2400000, status: "熱門" },
    { name: "CryptoKing", account: "@btc_king", market: "加密", profit: 94280, winRate: 86.2, volume: 1800000, status: "活躍" },
    { name: "FutureAce", account: "@futureace", market: "金融", profit: 76540, winRate: 81.5, volume: 1200000, status: "活躍" },
    { name: "TradeNova", account: "@nova777", market: "體育", profit: 52810, winRate: 78.9, volume: 980000, status: "穩定" },
    { name: "AlphaRoy", account: "@roy_market", market: "科技", profit: 41230, winRate: 74.6, volume: 740000, status: "熱門" },
    { name: "DataHunter", account: "@hunter01", market: "娛樂", profit: 36900, winRate: 71.3, volume: 620000, status: "穩定" },
    { name: "PredictionGod", account: "@god999", market: "政治", profit: 33120, winRate: 69.5, volume: 510000, status: "活躍" },
    { name: "SmartMoney", account: "@smart888", market: "金融", profit: 28750, winRate: 68.1, volume: 470000, status: "穩定" }
  ];

  var table, searchInput, tabButtons;
  var currentTab = "總收益";

  function getStatusClass(status) {
    if (status === "熱門") return "hot";
    if (status === "活躍") return "active-status";
    return "normal";
  }

  function formatMoney(value) {
    return value.toLocaleString("en-US");
  }

  function sortData(data) {
    var copy = data.slice();
    switch (currentTab) {
      case "勝率": copy.sort(function(a, b) { return b.winRate - a.winRate; }); break;
      case "交易量": copy.sort(function(a, b) { return b.volume - a.volume; }); break;
      case "本週排行": copy.sort(function(a, b) { return (b.profit * 0.7 + b.winRate * 1000) - (a.profit * 0.7 + a.winRate * 1000); }); break;
      case "本月排行": copy.sort(function(a, b) { return (b.profit + b.volume * 0.01) - (a.profit + a.volume * 0.01); }); break;
      default: copy.sort(function(a, b) { return b.profit - a.profit; });
    }
    return copy;
  }

  function renderTable(data) {
    if (!table) return;
    table.innerHTML = '<div class="ranking-row table-title"><span>排名</span><span>使用者</span><span>主要市場</span><span>收益</span><span>勝率</span><span>交易量</span><span>狀態</span></div>';
    data.forEach(function(user, index) {
      var row = document.createElement("div");
      row.className = "ranking-row";
      row.innerHTML = '<span class="rank-number">#' + (index + 1) + '</span><span class="user-info"><b>' + user.name + '</b><small>' + user.account + '</small></span><span>' + user.market + '</span><span class="green">+$' + formatMoney(user.profit) + '</span><span>' + user.winRate + '%</span><span>$' + formatMoney(user.volume) + '</span><span class="status ' + getStatusClass(user.status) + '">' + user.status + '</span>';
      table.appendChild(row);
    });
  }

  function filterData() {
    var keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var filtered = rankingData.filter(function(user) {
      return user.name.toLowerCase().includes(keyword) || user.account.toLowerCase().includes(keyword) || user.market.toLowerCase().includes(keyword);
    });
    filtered = sortData(filtered);
    renderTable(filtered);
  }

  function initGlowEffect() {
    document.addEventListener("mousemove", function(event) {
      var target = event.target.closest(".ranking-stat-card, .top-card, .ranking-table-card");
      if (!target) return;
      var rect = target.getBoundingClientRect();
      target.style.setProperty("--mouse-x", (event.clientX - rect.left) + "px");
      target.style.setProperty("--mouse-y", (event.clientY - rect.top) + "px");
    });
  }

  window.initRanking = function () {
    table = document.getElementById("rankingTable");
    searchInput = document.getElementById("rankingSearch");
    tabButtons = document.querySelectorAll(".ranking-tabs button");
    if (!table) return;
    tabButtons.forEach(function(button) {
      button.addEventListener("click", function() {
        tabButtons.forEach(function(btn) { btn.classList.remove("active"); });
        button.classList.add("active");
        currentTab = button.textContent.trim();
        filterData();
      });
    });
    if (searchInput) {
      searchInput.addEventListener("input", filterData);
    }
    filterData();
    initGlowEffect();
    setInterval(function() {
      rankingData.forEach(function(user) {
        user.profit += Math.floor(Math.random() * 2000) - 1000;
        if (user.profit < 0) user.profit = 0;
      });
      filterData();
    }, 8000);
  };
})();
