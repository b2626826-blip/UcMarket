(function () {
  'use strict';

  var amountInput, currentPrice, estimatedShares, estimatedReturn, submitTradeBtn;

  function calculateTrade() {
    var amount = Number(amountInput.value) || 0;
    var price = 0.62;
    var activeChoice = document.querySelector(".trade-choice .active");
    if (activeChoice) {
      var type = activeChoice.dataset.choice;
      if (type === "YES") price = 0.62;
      else if (type === "NO") price = 0.38;
      else if (type === "OPTION") price = 0.42;
    }
    var shares = amount / price;
    estimatedShares.textContent = shares.toFixed(2) + " shares";
    estimatedReturn.textContent = "$" + (shares * 1).toFixed(2);
  }

  function showTradeSuccess() {
    submitTradeBtn.innerHTML = '<i class="fa-solid fa-check"></i> 交易成功';
    submitTradeBtn.style.background = "#00d66f";
    setTimeout(function() {
      submitTradeBtn.innerHTML = "送出交易";
      submitTradeBtn.style.background = "";
    }, 2000);
  }

  function showTradeError(msg) {
    submitTradeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> ' + msg;
    submitTradeBtn.style.background = "#ff476d";
    setTimeout(function() {
      submitTradeBtn.innerHTML = "送出交易";
      submitTradeBtn.style.background = "";
    }, 2500);
  }

  function initGlowEffect() {
    document.addEventListener("mousemove", function(event) {
      var target = event.target.closest(".trade-market-card, .trade-panel, .trade-status-card, .trade-history-section");
      if (!target) return;
      var rect = target.getBoundingClientRect();
      target.style.setProperty("--mouse-x", (event.clientX - rect.left) + "px");
      target.style.setProperty("--mouse-y", (event.clientY - rect.top) + "px");
    });
  }

  window.initTrading = function () {
    amountInput = document.getElementById("tradeAmount");
    currentPrice = document.getElementById("currentPrice");
    estimatedShares = document.getElementById("estimatedShares");
    estimatedReturn = document.getElementById("estimatedReturn");
    submitTradeBtn = document.getElementById("submitTradeBtn");
    if (!amountInput || !submitTradeBtn) return;

    document.querySelectorAll(".trade-tabs button").forEach(function(btn) {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".trade-tabs button").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
      });
    });

    document.querySelectorAll(".trade-choice button").forEach(function(btn) {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".trade-choice button").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var type = btn.dataset.choice;
        if (type === "YES") currentPrice.textContent = "$0.62";
        else if (type === "NO") currentPrice.textContent = "$0.38";
        else if (type === "OPTION") currentPrice.textContent = "42%";
        calculateTrade();
      });
    });

    document.querySelectorAll(".option-card").forEach(function(card) {
      card.addEventListener("click", function() {
        document.querySelectorAll(".option-card").forEach(function(c) { c.classList.remove("active"); });
        card.classList.add("active");
      });
    });

    amountInput.addEventListener("input", calculateTrade);

    submitTradeBtn.addEventListener("click", function() {
      var amount = Number(amountInput.value);
      if (!amount) { showTradeError("請輸入下注金額"); return; }
      if (amount < 10) { showTradeError("最低下注金額為 $10"); return; }
      if (amount > 50000) { showTradeError("餘額不足，交易失敗"); return; }
      showTradeSuccess();
    });

    document.querySelectorAll(".trade-filter-tabs button").forEach(function(btn) {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".trade-filter-tabs button").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var filter = btn.dataset.filter;
        document.querySelectorAll("#tradeHistoryBody tr").forEach(function(row) {
          row.style.display = (filter === "all" || row.dataset.status === filter) ? "" : "none";
        });
      });
    });

    calculateTrade();
    initGlowEffect();

    setInterval(function() {
      var activeChoice = document.querySelector(".trade-choice .active");
      if (!activeChoice || !currentPrice) return;
      var type = activeChoice.dataset.choice;
      if (type === "YES") currentPrice.textContent = "$" + (0.55 + Math.random() * 0.15).toFixed(2);
      else if (type === "NO") currentPrice.textContent = "$" + (0.30 + Math.random() * 0.15).toFixed(2);
    }, 5000);
  };
})();
