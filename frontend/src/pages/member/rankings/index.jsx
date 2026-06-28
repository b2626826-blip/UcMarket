import { useEffect, useMemo, useState } from "react";
import "./style.css";
import { mockRankingData } from "./mockRankingData";


const mockCurrentUserAccount = "@nova777";

function formatMoney(value) {
  return value.toLocaleString("en-US");
}

const TABS = [
  { type: "profit", label: "盈虧榜" },
  { type: "win-rate", label: "勝率榜" },
  { type: "assets", label: "資產榜" },
];

function MyRankingCard({ data }) {
  const currentUser = data.find((u) => u.account === mockCurrentUserAccount);

  return (
    <section className="my-ranking-card" aria-label="我的排名">
      <h2>我的排名</h2>
      {!mockCurrentUserAccount ? (
        <p>登入後可查看你的排行榜名次。</p>
      ) : !currentUser ? (
        <p>目前沒有你的排行榜資料。</p>
      ) : (
        <div className="my-ranking-content">
          <strong>#{currentUser.rank}</strong>
          <span>{currentUser.name}</span>
          <span className="green">+${formatMoney(currentUser.profit)}</span>
          <span>勝率 {currentUser.winRate}%</span>
          <span>資產 ${formatMoney(currentUser.assets)}</span>
        </div>
      )}
    </section>
  );
}

function TopRankGrid({ data }) {
  const topThree = data.slice(0, 3);

  if (!topThree.length) {
    return (
      <section className="top-rank-grid" aria-label="前三名排行榜">
        <section className="empty-state">
          <h2>目前尚無排行榜資料</h2>
          <p>請稍後再回來查看，或換一個搜尋條件。</p>
        </section>
      </section>
    );
  }

  return (
    <section className="top-rank-grid" aria-label="前三名排行榜">
      {topThree.map((user) => (
        <article key={user.rank} className={`top-card top-${user.rank}`}>
          <div className="rank-medal">#{user.rank}</div>
          <h2>{user.name}</h2>
          <p>{user.account}</p>
          <strong>+${formatMoney(user.profit)}</strong>
          <span>勝率 {user.winRate}%</span>
        </article>
      ))}
    </section>
  );
}

function RankingTable({ data }) {
  const restUsers = data.slice(3);

  return (
    <section className="ranking-table-card" aria-label="完整排行榜">
      <div className="ranking-table">
        <div className="ranking-row table-title">
          <span>排名</span>
          <span>使用者</span>
          <span>主要市場</span>
          <span>收益</span>
          <span>勝率</span>
          <span>資產</span>
        </div>
        {restUsers.length === 0 ? (
          <div className="ranking-row empty-row">
            <span></span>
            <span>沒有更多排名資料</span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          restUsers.map((user) => (
            <div key={user.rank} className="ranking-row">
              <span className="rank-number">#{user.rank}</span>
              <span>
                <strong>{user.name}</strong>
                <br />
                <small>{user.account}</small>
              </span>
              <span>{user.market}</span>
              <span className="green">+${formatMoney(user.profit)}</span>
              <span>{user.winRate}%</span>
              <span>${formatMoney(user.assets)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState("profit");
  const [search, setSearch] = useState("");

  const [allData, setAllData] = useState(mockRankingData.profit || []);

  useEffect(() => {
    setAllData(mockRankingData[activeTab] || []);
  }, [activeTab]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return allData;
    return allData.filter(
      (u) =>
        u.name.toLowerCase().includes(kw) ||
        u.account.toLowerCase().includes(kw) ||
        u.market.toLowerCase().includes(kw)
    );
  }, [allData, search]);

  return (
    <main className="ranking-page">
      <section className="ranking-hero">
        <div>
          <p className="ranking-badge">一時賭 一時爽</p>
          <h1>排行榜</h1>
          <p className="ranking-description">一直賭 一直爽。</p>
        </div>
        <MyRankingCard data={allData} />
      </section>

      <div className="ranking-tabs" aria-label="排行榜類型">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            className={activeTab === tab.type ? "active" : ""}
            onClick={() => setActiveTab(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ranking-toolbar">
        <input
          type="search"
          placeholder="搜尋使用者、帳號或市場..."
          aria-label="搜尋排行榜"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <TopRankGrid data={filtered} />
      <RankingTable data={filtered} />
    </main>
  );
}
