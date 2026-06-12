// ======================================
// 排行榜資料
// ======================================

const rankingData = [
    {
        name: "MarketWolf",
        account: "@wolf88",
        market: "政治",
        profit: 128430,
        winRate: 92.8,
        volume: 2400000,
        status: "熱門"
    },
    {
        name: "CryptoKing",
        account: "@btc_king",
        market: "金融",
        profit: 94280,
        winRate: 86.2,
        volume: 1800000,
        status: "活躍"
    },
    {
        name: "FutureAce",
        account: "@futureace",
        market: "金融",
        profit: 76540,
        winRate: 81.5,
        volume: 1200000,
        status: "活躍"
    },
    {
        name: "TradeNova",
        account: "@nova777",
        market: "運動",
        profit: 52810,
        winRate: 78.9,
        volume: 980000,
        status: "穩定"
    },
    {
        name: "StormReader",
        account: "@weather_edge",
        market: "天氣",
        profit: 46920,
        winRate: 77.4,
        volume: 820000,
        status: "熱門"
    },
    {
        name: "NewsPulse",
        account: "@pulse24",
        market: "時事",
        profit: 41230,
        winRate: 74.6,
        volume: 740000,
        status: "熱門"
    },
    {
        name: "PredictionGod",
        account: "@god999",
        market: "政治",
        profit: 33120,
        winRate: 69.5,
        volume: 510000,
        status: "活躍"
    },
    {
        name: "SmartMoney",
        account: "@smart888",
        market: "金融",
        profit: 28750,
        winRate: 68.1,
        volume: 470000,
        status: "穩定"
    }
];

const rankingViews = {
    profit: {
        label: "盈虧榜",
        column: "盈虧",
        topLabel: "盈虧",
        sort: (a, b) => b.profit - a.profit,
        value: user => `+$${formatMoney(user.profit)}`
    },
    winRate: {
        label: "勝率榜",
        column: "勝率",
        topLabel: "勝率",
        sort: (a, b) => b.winRate - a.winRate,
        value: user => `${user.winRate}%`
    },
    volume: {
        label: "交易量榜",
        column: "交易量",
        topLabel: "交易量",
        sort: (a, b) => b.volume - a.volume,
        value: user => `$${formatCompactMoney(user.volume)}`
    }
};

// ======================================
// DOM
// ======================================

const table = document.querySelector(".ranking-table");
const topRankGrid = document.querySelector(".top-rank-grid");
const searchInput = document.querySelector(".table-search input");
const tabButtons = document.querySelectorAll(".ranking-tabs button");

let currentView = "profit";

// ======================================
// 格式化
// ======================================

function getStatusClass(status) {
    if (status === "熱門") {
        return "hot";
    }

    if (status === "活躍") {
        return "active-status";
    }

    return "normal";
}

function formatMoney(value) {
    return Math.round(value).toLocaleString("en-US");
}

function formatCompactMoney(value) {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
        return `${Math.round(value / 1000)}K`;
    }

    return formatMoney(value);
}

// ======================================
// 排序與搜尋
// ======================================

function getFilteredData() {
    const keyword = searchInput.value.trim().toLowerCase();

    const filtered = rankingData.filter(user => {
        return (
            user.name.toLowerCase().includes(keyword) ||
            user.account.toLowerCase().includes(keyword) ||
            user.market.toLowerCase().includes(keyword)
        );
    });

    return [...filtered].sort(rankingViews[currentView].sort);
}

// ======================================
// Top 3
// ======================================

function renderTopRank(data) {
    const view = rankingViews[currentView];
    const topUsers = data.slice(0, 3);

    if (!topUsers.length) {
        topRankGrid.innerHTML = `
            <div class="top-card empty">
                <div class="avatar">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3>查無排名</h3>
                <p>請換一個關鍵字搜尋</p>
            </div>
        `;

        return;
    }

    const displayOrder = [
        { user: topUsers[1], rank: 2, className: "second", icon: "fa-user" },
        { user: topUsers[0], rank: 1, className: "first", icon: "fa-crown" },
        { user: topUsers[2], rank: 3, className: "third", icon: "fa-user" }
    ].filter(item => item.user);

    topRankGrid.innerHTML = displayOrder.map(item => {
        const isChampion = item.rank === 1;

        return `
            <div class="top-card ${item.className}">
                <div class="rank-medal ${isChampion ? "gold" : ""}">
                    ${item.rank}
                </div>
                <div class="avatar ${isChampion ? "champion" : ""}">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <h3>${item.user.name}</h3>
                <p>${view.topLabel} ${view.value(item.user)}</p>
                <span class="green">${item.user.market} · 勝率 ${item.user.winRate}%</span>
            </div>
        `;
    }).join("");
}

// ======================================
// 表格
// ======================================

function renderTable(data) {
    const tableUsers = data.slice(3);

    table.innerHTML = `
        <div class="ranking-row table-title">
            <span>排名</span>
            <span>使用者</span>
            <span>主要市場</span>
            <span>盈虧</span>
            <span>勝率</span>
            <span>交易量</span>
            <span>狀態</span>
        </div>
    `;

    if (!tableUsers.length) {
        table.insertAdjacentHTML("beforeend", `
            <div class="ranking-row empty-row">
                <span></span>
                <span class="user-info">
                    <b>沒有更多排名</b>
                    <small>前三名已顯示在上方</small>
                </span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        `);

        return;
    }

    tableUsers.forEach((user, index) => {
        const row = document.createElement("div");

        row.className = "ranking-row";

        row.innerHTML = `
            <span class="rank-number">
                #${index + 4}
            </span>
            <span class="user-info">
                <b>${user.name}</b>
                <small>${user.account}</small>
            </span>
            <span>${user.market}</span>
            <span class="green">+$${formatMoney(user.profit)}</span>
            <span>${user.winRate}%</span>
            <span>$${formatCompactMoney(user.volume)}</span>
            <span class="status ${getStatusClass(user.status)}">
                ${user.status}
            </span>
        `;

        table.appendChild(row);
    });
}

function renderRanking() {
    const data = getFilteredData();

    renderTopRank(data);
    renderTable(data);
}

// ======================================
// 事件
// ======================================

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        tabButtons.forEach(btn => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        currentView = button.dataset.rank;

        renderRanking();
    });
});

searchInput.addEventListener("input", renderRanking);

// ======================================
// 即時排行榜動畫
// ======================================

setInterval(() => {
    rankingData.forEach(user => {
        const randomProfit = Math.floor(Math.random() * 1400) - 500;

        user.profit += randomProfit;

        if (user.profit < 0) {
            user.profit = 0;
        }
    });

    renderRanking();
}, 8000);

// ======================================
// Hover glow
// ======================================

document.addEventListener("mousemove", event => {
    const target = event.target.closest(
        ".ranking-stat-card, .top-card, .ranking-table-card"
    );

    if (!target) return;

    const rect = target.getBoundingClientRect();

    target.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
});

// ======================================
// 初始化
// ======================================

renderRanking();
