const rankingData = {
  profit: [
    { rank: 1, name: "MarketWolf", account: "@wolf88", market: "政治", profit: 128430, winRate: 92.8, assets: 320000 },
    { rank: 2, name: "CryptoKing", account: "@btc_king", market: "金融", profit: 94280, winRate: 86.2, assets: 280000 },
    { rank: 3, name: "FutureAce", account: "@futureace", market: "金融", profit: 76540, winRate: 81.5, assets: 220000 },
    { rank: 4, name: "TradeNova", account: "@nova777", market: "運動", profit: 52810, winRate: 78.9, assets: 190000 }
  ],
  "win-rate": [
    { rank: 1, name: "MarketWolf", account: "@wolf88", market: "政治", profit: 128430, winRate: 92.8, assets: 320000 },
    { rank: 2, name: "CryptoKing", account: "@btc_king", market: "金融", profit: 94280, winRate: 86.2, assets: 280000 },
    { rank: 3, name: "FutureAce", account: "@futureace", market: "金融", profit: 76540, winRate: 81.5, assets: 220000 },
    { rank: 4, name: "TradeNova", account: "@nova777", market: "運動", profit: 52810, winRate: 78.9, assets: 190000 }
  ],
  assets: [
    { rank: 1, name: "MarketWolf", account: "@wolf88", market: "政治", profit: 128430, winRate: 92.8, assets: 320000 },
    { rank: 2, name: "CryptoKing", account: "@btc_king", market: "金融", profit: 94280, winRate: 86.2, assets: 280000 },
    { rank: 3, name: "FutureAce", account: "@futureace", market: "金融", profit: 76540, winRate: 81.5, assets: 220000 },
    { rank: 4, name: "TradeNova", account: "@nova777", market: "運動", profit: 52810, winRate: 78.9, assets: 190000 }
  ]
};

const topRankGrid = document.querySelector(".top-rank-grid");
const rankingTable = document.querySelector(".ranking-table");
let currentRankingType = "profit";

function formatMoney(value) {
    return value.toLocalString("en-US");
}

function renderTopRanks(data) {
    const topThree = data.slice(0, 3);

    topRankGrid.innerHTML = topThree.map((user) => {
        return 
        <article class="top-card top-${user.rank}">
            <div class="rank-medal">#${user.rank}</div>
            <h2>${user.name}</h2>
            <p>${user.account}</p>
            <strong>+${formatMoney(user.profit)}</strong>
            <span>勝率 ${user.winRate}</span>
        </article>;
    }).join("");
}

function renderTable(data) {
    const restUsers = data.slice(3);

    rankingTable.innerHTML = `
        <div class="ranking-row table-tittle">
            <span>排名</span>
            <span>使用者</span>
            <span>主要市場</span>
            <span>收益</span>
            <span>勝率</span>
            <span>資產</span>
        </div>`;

    restUsers.forEach((user) => {
    const row = document.createElement("div");

    row.className = "ranking-row";

    row.innerHTML = `
      <span class="rank-number">#${user.rank}</span>
      <span>
        <strong>${user.name}</strong><br>
        <small>${user.account}</small>
      </span>
      <span>${user.market}</span>
      <span class="green">+$${formatMoney(user.profit)}</span>
      <span>${user.winRate}%</span>
      <span>$${formatMoney(user.assets)}</span>
    `;

    rankingTable.appendChild(row);
  });
}

function renderRanking(type) {
  currentRankingType = type;

  const data = rankingData[type];

  console.log("目前排行榜類型:", type);
  console.table(data);
  renderTopRanks(data);
  renderTable(data);
}

document.querySelectorAll(".ranking-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".ranking-tabs button").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    renderRanking(button.dataset.rankingType);
  });
});

renderRanking(currentRankingType);