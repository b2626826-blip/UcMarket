// HERO SLIDER
// ===============================

const heroSlides = [
    {
        badge: "熱門市場",
        title: "預測未來",
        text: "透過市場價格反映真實世界機率",
        primary: "開始交易",
        secondary: "查看市場"
    },
    {
        badge: "加密市場",
        title: "BTC 200K",
        text: "預測比特幣是否突破歷史新高",
        primary: "立即參與",
        secondary: "查看走勢"
    },
    {
        badge: "政治市場",
        title: "美國大選",
        text: "即時追蹤全球政治預測市場",
        primary: "查看盤口",
        secondary: "了解玩法"
    }
];

const slide = document.querySelector(".slide");

let slideIndex = 0;

function renderHeroSlide() {
    const item = heroSlides[slideIndex];

    slide.innerHTML = `
        <span class="badge">${item.badge}</span>

        <h1>${item.title}</h1>

        <p>${item.text}</p>

        <div class="hero-buttons">
            <button class="primary-btn">${item.primary}</button>
            <button class="secondary-btn">${item.secondary}</button>
        </div>
    `;
}

renderHeroSlide();

setInterval(() => {
    slideIndex++;

    if (slideIndex >= heroSlides.length) {
        slideIndex = 0;
    }

    slide.style.opacity = 0;

    setTimeout(() => {
        renderHeroSlide();
        slide.style.opacity = 1;
    }, 400);

}, 4000);


// ===============================
// CHART.JS
// ===============================

const chartCanvas = document.getElementById("marketChart");

if (chartCanvas) {
    const ctx = chartCanvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);

    gradient.addColorStop(0, "rgba(217, 170, 67, 0.35)");
    gradient.addColorStop(1, "rgba(217, 170, 67, 0)");

    new Chart(ctx, {
        type: "line",

        data: {
            labels: [
                "1月", "2月", "3月", "4月", "5月", "6月",
                "7月", "8月", "9月", "10月", "11月", "12月"
            ],

            datasets: [
                {
                    label: "Yes 價格",
                    data: [42, 45, 47, 51, 58, 62, 60, 65, 68, 72, 70, 75],
                    borderColor: "#d9aa43",
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.45,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: "#d9aa43"
                },
                {
                    label: "No 價格",
                    data: [58, 55, 53, 49, 42, 38, 40, 35, 32, 28, 30, 25],
                    borderColor: "#00d66f",
                    backgroundColor: "transparent",
                    fill: false,
                    tension: 0.45,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#00d66f"
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    backgroundColor: "#111",
                    titleColor: "#fff",
                    bodyColor: "#d9aa43",
                    borderColor: "rgba(217,170,67,.35)",
                    borderWidth: 1,
                    padding: 12
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#888"
                    },
                    grid: {
                        color: "rgba(255,255,255,.04)"
                    }
                },

                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: "#888",
                        callback: value => value + "%"
                    },
                    grid: {
                        color: "rgba(255,255,255,.06)"
                    }
                }
            }
        }
    });
}


// ===============================
// TAIPEI TIME
// ===============================

const timeText = document.querySelector(".chart-time strong");

function updateTaipeiTime() {
    if (!timeText) return;

    const now = new Date();

    const taipeiTime = now.toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    timeText.textContent = taipeiTime;
}

updateTaipeiTime();
setInterval(updateTaipeiTime, 1000);


// ===============================
// MARKET DATA
// ===============================

const marketData = [
    {
        id: 1,
        category: "金融",
        title: "WTI 原油在 2026 年 5 月收盤是否會高過 55？",
        date: "2026 年 5 月",
        yesPrice: 0.55,
        noPrice: 0.45,
        volume: "$2.3M",
        traders: "1,243"
    },
    {
        id: 2,
        category: "金融",
        title: "美國債務上限是否會被永久取消？",
        date: "2026 年",
        yesPrice: 0.41,
        noPrice: 0.59,
        volume: "$8.7M",
        traders: "4,820"
    },
    {
        id: 3,
        category: "加密",
        title: "BTC 是否會在 2027 年前突破 200K？",
        date: "2027 年",
        yesPrice: 0.72,
        noPrice: 0.28,
        volume: "$12.4M",
        traders: "8,921"
    },
    {
        id: 4,
        category: "政治",
        title: "共和黨是否會贏得下一屆美國總統大選？",
        date: "2028 年 11 月",
        yesPrice: 0.61,
        noPrice: 0.39,
        volume: "$5.8M",
        traders: "4,451"
    },
    {
        id: 5,
        category: "體育",
        title: "湖人是否能拿下 NBA 總冠軍？",
        date: "2027 賽季",
        yesPrice: 0.44,
        noPrice: 0.56,
        volume: "$3.2M",
        traders: "3,211"
    },
    {
        id: 6,
        category: "科技",
        title: "AI 公司是否會在今年創下新 IPO 紀錄？",
        date: "2026 年",
        yesPrice: 0.68,
        noPrice: 0.32,
        volume: "$4.9M",
        traders: "2,987"
    },
    {
        id: 7,
        category: "娛樂",
        title: "年度票房冠軍是否會突破 20 億美元？",
        date: "2026 年",
        yesPrice: 0.36,
        noPrice: 0.64,
        volume: "$1.6M",
        traders: "1,042"
    },
    {
        id: 8,
        category: "加密",
        title: "Ethereum 是否會在年底突破 10,000？",
        date: "2026 年底",
        yesPrice: 0.49,
        noPrice: 0.51,
        volume: "$6.1M",
        traders: "5,604"
    },
    {
        id: 9,
        category: "金融",
        title: "美國 Fed 是否會在今年降息兩次以上？",
        date: "2026 年",
        yesPrice: 0.57,
        noPrice: 0.43,
        volume: "$9.5M",
        traders: "6,892"
    }
];

const marketGrid = document.querySelector(".market-grid");
const searchInput = document.querySelector(".market-search input");
const tabButtons = document.querySelectorAll(".market-tabs button");

let currentCategory = "全部";

function renderMarkets(data) {
    if (!marketGrid) return;

    marketGrid.innerHTML = "";

    data.forEach(market => {
        const card = document.createElement("div");

        card.className = "market-card";

        card.innerHTML = `
            <div class="market-header">
                <h4>${market.title}</h4>
                <span>${market.date}</span>
            </div>

            <div class="market-price">
                <div class="yes">
                    <small>YES</small>
                    <h3>$${market.yesPrice.toFixed(2)}</h3>
                    <button class="trade-btn buy-btn" data-id="${market.id}" data-side="YES">
                        Buy Yes
                    </button>
                </div>

                <div class="no">
                    <small>NO</small>
                    <h3>$${market.noPrice.toFixed(2)}</h3>
                    <button class="trade-btn sell-btn" data-id="${market.id}" data-side="NO">
                        Buy No
                    </button>
                </div>
            </div>

            <div class="market-footer">
                <span>Volume ${market.volume}</span>
                <span>${market.traders} traders</span>
            </div>
        `;

        marketGrid.appendChild(card);
    });
}

function filterMarkets() {
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const filtered = marketData.filter(market => {
        const matchCategory =
            currentCategory === "全部" ||
            market.category === currentCategory;

        const matchKeyword =
            market.title.toLowerCase().includes(keyword) ||
            market.category.toLowerCase().includes(keyword);

        return matchCategory && matchKeyword;
    });

    renderMarkets(filtered);
}

renderMarkets(marketData);


// ===============================
// TAB FILTER
// ===============================

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        tabButtons.forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        currentCategory = button.textContent.trim();

        filterMarkets();
    });
});


// ===============================
// SEARCH FILTER
// ===============================

if (searchInput) {
    searchInput.addEventListener("input", filterMarkets);
}


// ===============================
// TRADE BUTTON
// ===============================

document.addEventListener("click", event => {
    const btn = event.target.closest(".trade-btn");

    if (!btn) return;

    const id = Number(btn.dataset.id);
    const side = btn.dataset.side;

    const market = marketData.find(item => item.id === id);

    alert(
        `交易確認\n\n` +
        `市場：${market.title}\n` +
        `方向：${side}\n` +
        `價格：$${side === "YES" ? market.yesPrice.toFixed(2) : market.noPrice.toFixed(2)}\n\n` +
        `之後這裡可以接你的 POST /trade API`
    );
});


// ===============================
// PRICE RANDOM UPDATE
// ===============================

setInterval(() => {
    marketData.forEach(market => {
        const move = Math.random() * 0.04 - 0.02;

        market.yesPrice += move;

        if (market.yesPrice > 0.95) {
            market.yesPrice = 0.95;
        }

        if (market.yesPrice < 0.05) {
            market.yesPrice = 0.05;
        }

        market.noPrice = 1 - market.yesPrice;
    });

    filterMarkets();

}, 6000);