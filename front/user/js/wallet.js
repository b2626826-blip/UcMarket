(function () {
  'use strict';

  var walletChart = null;

  function initChart() {
    var canvas = document.getElementById('walletChart');
    if (!canvas || typeof Chart === 'undefined') return;

    var chartData = {
      7: [119000,121000,122300,123100,124200,124800,125430],
      30: [87800,92500,98000,103000,110500,114800,118000,122300,120400,123600,124700,125430],
      90: [70000,76000,81000,89000,97000,103000,109000,114000,120000,125430],
      365: [42000,51000,60000,69000,76000,84000,92000,102000,111000,118000,122000,125430],
      all: [18000,26000,34000,47000,62000,76000,91000,108000,125430]
    };

    function renderChart(range) {
      range = range || "30";
      var ctx = canvas.getContext("2d");
      var values = chartData[range];
      if (walletChart) walletChart.destroy();
      var gradient = ctx.createLinearGradient(0, 0, 0, 450);
      gradient.addColorStop(0, "rgba(0,214,79,.35)");
      gradient.addColorStop(1, "rgba(0,214,79,0)");
      walletChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: values.map(function(_, i) { return i + 1; }),
          datasets: [{ data: values, borderColor: "#00d64f", backgroundColor: gradient, fill: true, borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: "#00d64f" }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0b0b0b", borderColor: "#222", borderWidth: 1, callbacks: { label: function(ctx) { return "$" + ctx.raw.toLocaleString(); } } } },
          scales: { x: { display: false }, y: { border: { display: false }, grid: { color: "rgba(255,255,255,.05)" }, ticks: { color: "#777", callback: function(v) { return "$" + v.toLocaleString(); } } } }
        }
      });
    }

    renderChart("30");

    document.querySelectorAll(".range-tabs button").forEach(function(btn) {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".range-tabs button").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderChart(btn.dataset.range);
      });
    });
  }

  function initModal() {
    var modal = document.getElementById("walletModal");
    var modalTitle = document.getElementById("modalTitle");
    var modalDesc = document.getElementById("modalDesc");
    var modalAmount = document.getElementById("modalAmount");
    var modalType = "";

    if (!modal) return;

    function openModal(type) {
      modalType = type;
      modal.classList.add("active");
      modalTitle.textContent = type;
      if (type === "充值") modalDesc.textContent = "輸入要充值至錢包的金額";
      else if (type === "提現") modalDesc.textContent = "輸入要提現至銀行帳戶的金額";
      else if (type === "交易") modalDesc.textContent = "輸入本次交易投入金額";
      modalAmount.value = "";
    }

    function closeModal() {
      modal.classList.remove("active");
    }

    document.getElementById("depositBtn").addEventListener("click", function() { openModal("充值"); });
    document.getElementById("withdrawBtn").addEventListener("click", function() { openModal("提現"); });
    document.getElementById("tradeBtn").addEventListener("click", function() { openModal("交易"); });
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalCancel").addEventListener("click", closeModal);
    modal.addEventListener("click", function(e) { if (e.target === modal) closeModal(); });
    document.getElementById("modalConfirm").addEventListener("click", function() {
      var amount = Number(modalAmount.value);
      if (!amount || amount <= 0) { alert("請輸入有效金額"); return; }
      alert(modalType + "成功\n\n金額：$" + amount.toLocaleString());
      closeModal();
    });
  }

  function initTransactionFilter() {
    document.querySelectorAll(".transaction-tabs button").forEach(function(btn) {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".transaction-tabs button").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var filter = btn.dataset.filter;
        document.querySelectorAll(".transaction-table tbody tr").forEach(function(row) {
          row.style.display = (filter === "all" || row.dataset.type === filter) ? "" : "none";
        });
      });
    });
  }

  function initDrawCanvas() {
    var drawCanvas = document.getElementById("drawCanvas");
    if (!drawCanvas) return;
    var ctx = drawCanvas.getContext("2d");
    var drawing = false, startX = 0, startY = 0;
    var lines = [];
    function resizeCanvas() { drawCanvas.width = drawCanvas.offsetWidth; drawCanvas.height = drawCanvas.offsetHeight; redraw(); }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    function redraw() {
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      ctx.strokeStyle = "#d9aa43";
      ctx.lineWidth = 2;
      lines.forEach(function(line) {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        drawPoint(line.x1, line.y1);
        drawPoint(line.x2, line.y2);
      });
    }
    function drawPoint(x, y) {
      ctx.fillStyle = "#d9aa43";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    drawCanvas.addEventListener("mousedown", function(e) { drawing = true; startX = e.offsetX; startY = e.offsetY; });
    drawCanvas.addEventListener("mouseup", function(e) {
      if (!drawing) return;
      drawing = false;
      lines.push({ x1: startX, y1: startY, x2: e.offsetX, y2: e.offsetY });
      redraw();
    });
  }

  function initGlowEffect() {
    document.addEventListener("mousemove", function(event) {
      var target = event.target.closest(".wallet-balance-section, .asset-chart-card, .asset-allocation-card, .transaction-section, .profit-card, .asset-item");
      if (!target) return;
      var rect = target.getBoundingClientRect();
      target.style.setProperty("--mouse-x", (event.clientX - rect.left) + "px");
      target.style.setProperty("--mouse-y", (event.clientY - rect.top) + "px");
    });
  }

  window.initWallet = function () {
    initChart();
    initModal();
    initTransactionFilter();
    initDrawCanvas();
    initGlowEffect();

    var registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
      registerBtn.addEventListener("click", function() { alert("註冊功能之後可串接會員系統"); });
    }
  };
})();
