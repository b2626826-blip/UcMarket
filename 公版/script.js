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

let activeFilter = "all";
let activeMarket = markets[0];
let activeSide = "yes";

function drawHeroChart() {
  const canvas = document.querySelector("#heroChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const points = [42, 46, 44, 51, 55, 53, 58, 61, 59, 64];
  const padding = 28;
  const max = 75;
  const min = 30;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfbfd";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(17, 17, 20, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const coords = points.map((point, index) => {
    const x = padding + ((width - padding * 2) / (points.length - 1)) * index;
    const y = height - padding - ((point - min) / (max - min)) * (height - padding * 2);
    return { x, y };
  });

  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, "rgba(0, 113, 227, 0.2)");
  gradient.addColorStop(1, "rgba(10, 143, 98, 0)");

  ctx.beginPath();
  ctx.moveTo(coords[0].x, height - padding);
  coords.forEach((coord) => ctx.lineTo(coord.x, coord.y));
  ctx.lineTo(coords[coords.length - 1].x, height - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  coords.forEach((coord, index) => {
    if (index === 0) ctx.moveTo(coord.x, coord.y);
    else ctx.lineTo(coord.x, coord.y);
  });
  ctx.strokeStyle = "#0071e3";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  const last = coords[coords.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#0a8f62";
  ctx.stroke();
}

function renderMarkets() {
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
  document.querySelector("#selectedCategory").textContent = activeMarket.categoryLabel;
  document.querySelector("#selectedTitle").textContent = activeMarket.title;
  document.querySelector("#selectedRule").textContent = activeMarket.rule;
  updateQuote();
}

function updateQuote() {
  const amount = Math.max(Number(amountInput.value) || 0, 0);
  const price = activeSide === "yes" ? activeMarket.yes / 100 : activeMarket.no / 100;
  const shares = price > 0 ? amount / price : 0;
  const possibleReturn = shares;

  document.querySelector("#quotePrice").textContent = price.toFixed(2);
  document.querySelector("#quoteShares").textContent = shares.toFixed(2);
  document.querySelector("#quoteReturn").textContent = Math.round(possibleReturn).toLocaleString();
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

marketSearch.addEventListener("input", renderMarkets);
amountInput.addEventListener("input", updateQuote);

drawHeroChart();
renderMarkets();
updateSelectedMarket();
