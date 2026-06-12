const markets = [
  {
    id: "btc-120k",
    title: "2026-06-30 前，BTC 是否會在 Coinbase 突破 120,000 美元？",
    category: "crypto",
    categoryLabel: "加密貨幣",
    status: "ACTIVE",
    yes: 64,
    no: 36,
    volume: "42.8K",
    closeAt: "2026-06-30",
    rule: "以 Coinbase 現貨價格為準，若在截止時間前突破門檻，Yes 結算為勝出。"
  },
  {
    id: "ai-phone",
    title: "下一場主要發表會是否會推出端側 AI 手機功能？",
    category: "tech",
    categoryLabel: "科技",
    status: "ACTIVE",
    yes: 57,
    no: 43,
    volume: "18.3K",
    closeAt: "2026-09-15",
    rule: "以官方發表會新聞稿與產品頁為準，需明確列出端側 AI 功能。"
  },
  {
    id: "baseball-final",
    title: "2026 台灣職棒總冠軍賽是否會打到第七戰？",
    category: "sports",
    categoryLabel: "體育",
    status: "ACTIVE",
    yes: 48,
    no: 52,
    volume: "9.7K",
    closeAt: "2026-11-30",
    rule: "以中華職棒官方賽程與賽果公告為準，總冠軍賽完成第七戰即為 Yes。"
  },
  {
    id: "chip-supply",
    title: "指定 AI 晶片供應量是否會較上一季成長 20% 以上？",
    category: "tech",
    categoryLabel: "科技",
    status: "PENDING",
    yes: 61,
    no: 39,
    volume: "4.1K",
    closeAt: "2026-08-20",
    rule: "以公司季報與公開法說會資料為準，需可比對上一季出貨量。"
  }
];

const marketList = document.querySelector("#marketList");
const marketSearch = document.querySelector("#marketSearch");
const filterButtons = [...document.querySelectorAll(".tab-button")];
const sideButtons = [...document.querySelectorAll(".side-button")];
const amountInput = document.querySelector("#amountInput");
const authModal = document.querySelector("#authModal");
const authTitle = document.querySelector("#authTitle");
const authStatus = document.querySelector("#authStatus");
const authOpenButtons = [...document.querySelectorAll("[data-auth-open]")];
const authCloseButtons = [...document.querySelectorAll("[data-auth-close]")];
const authTabs = [...document.querySelectorAll("[data-auth-tab]")];
const authPanels = [...document.querySelectorAll("[data-auth-panel]")];
const authForms = [...document.querySelectorAll("#authModal .auth-form")];
const pageAuthTabs = [...document.querySelectorAll("[data-page-auth-tab]")];
const pageAuthPanels = [...document.querySelectorAll("[data-page-auth-panel]")];
const pageAuthForms = [...document.querySelectorAll("[data-page-auth-panel]")];
const pageAuthStatus = document.querySelector("[data-page-auth-status]");
const menuButton = document.querySelector(".menu-button");

let activeFilter = "all";
let activeMarket = markets[0];
let activeSide = "yes";
let activeAuthMode = "login";

function setupSiteMenu() {
  if (!menuButton) return;

  const menu = document.createElement("nav");
  menu.className = "site-menu";
  menu.setAttribute("aria-label", "快速選單");
  menu.innerHTML = `
    <a href="./portfolio.html">我的資產</a>
    <a href="./create-market.html">建立市場</a>
    <a href="./rankings.html">排行榜</a>
    <a href="./admin.html">管理員審核</a>
    <span class="site-menu-divider" aria-hidden="true"></span>
    <a href="./index.html#markets">玩法介紹</a>
    <a href="./AI_CONTEXT.md">專案文件</a>
    <span class="site-menu-divider" aria-hidden="true"></span>
    <a href="./auth.html">登入 / 註冊</a>
  `;

  menuButton.setAttribute("aria-expanded", "false");
  menuButton.insertAdjacentElement("afterend", menu);

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    menu.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

function drawHeroChart() {
  const canvas = document.querySelector("#heroChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 28, right: 54, bottom: 42, left: 40 };
  const series = [
    { color: "#356dff", values: [40, 46, 43, 58, 61, 55, 66, 70, 68, 64] },
    { color: "#93c5fd", values: [55, 62, 60, 69, 72, 71, 74, 69, 65, 57] },
    { color: "#f7b500", values: [26, 30, 48, 39, 51, 46, 42, 28, 18, 17] },
    { color: "#ff7a1a", values: [72, 66, 42, 22, 31, 39, 34, 18, 11, 9] }
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b111b";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 5]);
  [0, 25, 50, 75, 100].forEach((tick) => {
    const y = height - padding.bottom - (tick / 100) * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = "#8b96a6";
    ctx.font = "700 16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(`${tick}%`, width - padding.right + 12, y + 5);
  });
  ctx.setLineDash([]);

  series.forEach((line) => {
    const coords = line.values.map((point, index) => {
      const x =
        padding.left +
        ((width - padding.left - padding.right) / (line.values.length - 1)) * index;
      const y =
        height -
        padding.bottom -
        (point / 100) * (height - padding.top - padding.bottom);
      return { x, y };
    });

    ctx.beginPath();
    coords.forEach((coord, index) => {
      if (index === 0) ctx.moveTo(coord.x, coord.y);
      else ctx.lineTo(coord.x, coord.y);
    });
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    const last = coords[coords.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = line.color;
    ctx.fill();
  });

  ctx.fillStyle = "#687386";
  ctx.font = "700 16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ["5月 25", "5月 17", "5月 28", "5月 31"].forEach((label, index) => {
    const x = padding.left + 120 + index * 170;
    ctx.fillText(label, x, height - 10);
  });
}

function renderMarkets() {
  if (!marketList || !marketSearch) return;

  const query = marketSearch.value.trim().toLowerCase();
  const filtered = markets.filter((market) => {
    const matchesFilter = activeFilter === "all" || market.category === activeFilter;
    const text = `${market.title} ${market.categoryLabel} ${market.status}`.toLowerCase();
    return matchesFilter && text.includes(query);
  });

  marketList.innerHTML = filtered
    .map((market) => {
      const selectedClass = market.id === activeMarket.id ? " is-selected" : "";
      return `
        <button class="market-card${selectedClass}" type="button" data-id="${market.id}">
          <div>
            <div class="market-meta">
              <span>${market.categoryLabel}</span>
              <span>${market.status}</span>
              <span>截止 ${market.closeAt}</span>
            </div>
            <h3>${market.title}</h3>
            <div class="market-stats">
              <span>成交量 ${market.volume}</span>
              <span>No ${market.no}%</span>
            </div>
          </div>
          <div class="probability">
            <strong>${market.yes}%</strong>
            <div class="meter" aria-hidden="true">
              <span style="--value: ${market.yes}%"></span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".market-card").forEach((card) => {
    card.addEventListener("click", () => {
      activeMarket = markets.find((market) => market.id === card.dataset.id) || markets[0];
      updateSelectedMarket();
      renderMarkets();
    });
  });
}

function updateSelectedMarket() {
  const selectedCategory = document.querySelector("#selectedCategory");
  const selectedTitle = document.querySelector("#selectedTitle");
  const selectedRule = document.querySelector("#selectedRule");

  if (selectedCategory) selectedCategory.textContent = activeMarket.categoryLabel;
  if (selectedTitle) selectedTitle.textContent = activeMarket.title;
  if (selectedRule) selectedRule.textContent = activeMarket.rule;

  updateQuote();
}

function updateQuote() {
  if (!amountInput) return;

  const amount = Math.max(Number(amountInput.value) || 0, 0);
  const price = activeSide === "yes" ? activeMarket.yes / 100 : activeMarket.no / 100;
  const shares = price > 0 ? amount / price : 0;
  const possibleReturn = shares;

  const quotePrice = document.querySelector("#quotePrice");
  const quoteShares = document.querySelector("#quoteShares");
  const quoteReturn = document.querySelector("#quoteReturn");

  if (quotePrice) quotePrice.textContent = price.toFixed(2);
  if (quoteShares) quoteShares.textContent = shares.toFixed(2);
  if (quoteReturn) quoteReturn.textContent = Math.round(possibleReturn).toLocaleString();
}

function setAuthMode(mode) {
  if (!authTitle || !authStatus) return;

  activeAuthMode = mode;
  const isRegister = mode === "register";

  authTitle.textContent = isRegister ? "建立 UcMarket 帳號" : "登入 UcMarket";
  authStatus.textContent = "";

  authTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.authTab === mode);
  });

  authPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.authPanel === mode);
  });
}

function openAuthModal(mode = "login") {
  if (!authModal) return;

  setAuthMode(mode);
  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const firstInput = authModal.querySelector(`[data-auth-panel="${mode}"] input`);
  if (firstInput) firstInput.focus();
}

function closeAuthModal() {
  if (!authModal) return;

  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setPageAuthMode(mode) {
  pageAuthTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.pageAuthTab === mode);
  });

  pageAuthPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.pageAuthPanel === mode);
  });

  if (pageAuthStatus) pageAuthStatus.textContent = "";
}

function updateDetailQuote() {
  const amountInputEl = document.querySelector("#detailAmount");
  const priceEl = document.querySelector("#detailPrice");
  const sharesEl = document.querySelector("#detailShares");
  const returnEl = document.querySelector("#detailReturn");
  const activeSideButton = document.querySelector("[data-detail-side].is-active");
  if (!amountInputEl || !priceEl || !sharesEl || !returnEl || !activeSideButton) return;

  const amount = Math.max(Number(amountInputEl.value) || 0, 0);
  const price = activeSideButton.dataset.detailSide === "yes" ? 0.64 : 0.36;
  const shares = price > 0 ? amount / price : 0;

  priceEl.textContent = price.toFixed(2);
  sharesEl.textContent = shares.toFixed(2);
  returnEl.textContent = Math.round(shares).toLocaleString();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderMarkets();
  });
});

sideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeSide = button.dataset.side;
    sideButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    updateQuote();
  });
});

if (marketSearch) marketSearch.addEventListener("input", renderMarkets);
if (amountInput) amountInput.addEventListener("input", updateQuote);

authOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openAuthModal(button.dataset.authOpen));
});

authCloseButtons.forEach((button) => {
  button.addEventListener("click", closeAuthModal);
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
});

authForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message =
      activeAuthMode === "register"
        ? "註冊入口已建立，正式版可串接 POST /api/auth/register。"
        : "登入入口已建立，正式版可串接 POST /api/auth/login。";

    authStatus.textContent = message;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && authModal?.classList.contains("is-open")) {
    closeAuthModal();
  }
});

pageAuthTabs.forEach((tab) => {
  tab.addEventListener("click", () => setPageAuthMode(tab.dataset.pageAuthTab));
});

pageAuthForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const mode = form.dataset.pageAuthPanel;
    if (pageAuthStatus) {
      pageAuthStatus.textContent =
        mode === "register"
          ? "註冊表單已建立，正式版可串接 POST /api/auth/register。"
          : "登入表單已建立，正式版可串接 POST /api/auth/login。";
    }
  });
});

const urlMode = new URLSearchParams(window.location.search).get("mode");
if (urlMode === "register") setPageAuthMode("register");

const createMarketForm = document.querySelector("#createMarketForm");
if (createMarketForm) {
  createMarketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = document.querySelector("#createMarketStatus");
    if (status) status.textContent = "市場已送出審核，狀態：PENDING。";

    document.querySelectorAll(".check-list li").forEach((item) => {
      item.classList.add("is-pass");
    });
  });
}

document.querySelectorAll("[data-detail-side]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-detail-side]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    updateDetailQuote();
  });
});

const detailAmount = document.querySelector("#detailAmount");
if (detailAmount) detailAmount.addEventListener("input", updateDetailQuote);

const detailTradeButton = document.querySelector("#detailTradeButton");
if (detailTradeButton) {
  detailTradeButton.addEventListener("click", () => {
    const status = document.querySelector("#detailTradeStatus");
    if (status) status.textContent = "交易試算已確認，正式版可串接 POST /api/markets/:id/trades。";
  });
}

document.querySelectorAll("[data-review-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-review-card]");
    const status = card?.querySelector("[data-review-status]");
    const action = button.dataset.reviewAction;
    const text = {
      approved: "已標記為通過，正式版可呼叫 approve API。",
      changes: "已標記為要求修改，正式版可寫入審核意見。",
      rejected: "已標記為拒絕，正式版可呼叫 reject API。"
    }[action];

    card?.classList.toggle("is-approved", action === "approved");
    card?.classList.toggle("is-rejected", action === "rejected");
    if (status) status.textContent = text;
  });
});

const resolveButton = document.querySelector("#resolveButton");
if (resolveButton) {
  resolveButton.addEventListener("click", () => {
    const selected = document.querySelector("#resolutionSelect")?.value;
    const status = document.querySelector("#resolveStatus");
    if (status) status.textContent = `已設定結果：${selected}。正式版可串接 resolve API。`;
  });
}

const leaderboardData = {
  profit: [
    ["chen_qa", "+3,420 pts"],
    ["market_tim", "+2,850 pts"],
    ["eagle_admin", "+2,110 pts"],
    ["roy_position", "+1,680 pts"]
  ],
  reputation: [
    ["market_tim", "980 rep"],
    ["eagle_admin", "870 rep"],
    ["harry_wallet", "720 rep"],
    ["roy_position", "690 rep"]
  ],
  volume: [
    ["chen_qa", "86.4K pts"],
    ["tim_trade", "72.1K pts"],
    ["shung_market", "65.8K pts"],
    ["eagle_admin", "58.0K pts"]
  ]
};

function renderLeaderboard(type = "profit") {
  const list = document.querySelector("#leaderboardList");
  if (!list) return;

  list.innerHTML = leaderboardData[type]
    .map(
      ([name, value], index) =>
        `<li><span>${index + 1}</span><strong>${name}</strong><em>${value}</em></li>`
    )
    .join("");
}

document.querySelectorAll("[data-ranking-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-ranking-tab]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    renderLeaderboard(button.dataset.rankingTab);
  });
});

drawHeroChart();
renderMarkets();
updateSelectedMarket();
updateDetailQuote();
renderLeaderboard();
setupSiteMenu();
