import { useEffect, useMemo, useState } from "react";
import "./style.css";
import { fetchRankings } from "../../../api/rankingApi";
import useAuthStore from "../../../store/authStore";
import rankingHeroGif from "../../../assets/ranking-hero.gif";


function formatCurrency(value) {
  if (value == null) return "—";

  return `$${Number(value).toLocaleString("en-US")}`;
}

function formatProfit(value) {
  if (value == null) return "—";

  const amount = Number(value);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";

  return `${sign}$${Math.abs(amount).toLocaleString("en-US")}`;
}

function formatPercent(value) {
  if (value == null) return "—";

  const percent = Number(value);
  if (!Number.isFinite(percent)) return "—";

  return `${percent.toLocaleString("en-US", {
    maximumFractionDigits: 2
  })}%`;
}

function formatText(value) {
  if (value == null || value === "") return "—";

  return value;
}

export function getRankingMetric(type, user) {
  if (type === "win-rate") {
    return {
      label: "勝率",
      value: formatPercent(user.winRate),
      secondaryLabel: "收益",
      secondaryValue: formatProfit(user.profit),
    };
  }

  if (type === "assets") {
    return { label: "資產", value: formatCurrency(user.assets) };
  }

  return {
    label: "收益",
    value: formatProfit(user.profit),
    secondaryLabel: "勝率",
    secondaryValue: formatPercent(user.winRate),
  };
}

const TABS = [
  { type: "profit", label: "盈虧榜" },
  { type: "win-rate", label: "勝率榜" },
  { type: "assets", label: "資產榜" },
];

function MyRankingCard({ data, currentUserId }) {
  const currentUser = currentUserId
    ? data.find((u) => u.userId === currentUserId)
    : null;

  return (
    <section className="my-ranking-card" aria-label="我的排名">
      <h2>我的排名</h2>

      {!currentUserId ? (
        <p className="my-ranking-login-message">登入可以查看排名</p>
      ) : !currentUser ? (
        <p>目前沒有你的排行榜資料。</p>
      ) : (
        <div className="my-ranking-content">
          <strong className="my-ranking-rank">#{currentUser.rank}</strong>
          <strong className="my-ranking-user">{currentUser.name}</strong>
          <div className="my-ranking-stat">
            <span>盈虧</span>
            <strong className="green">{formatProfit(currentUser.profit)}</strong>
          </div>
          <div className="my-ranking-stat">
            <span>勝率</span>
            <strong>{formatPercent(currentUser.winRate)}</strong>
          </div>
          <div className="my-ranking-stat">
            <span>資產</span>
            <strong>{formatCurrency(currentUser.assets)}</strong>
          </div>
        </div>
      )}

    </section>
  );
}

function TopRankGrid({ data, type }) {
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
      {topThree.map((user) => {
        const metric = getRankingMetric(type, user);

        return (
          <article key={user.rank} className={`top-card top-${user.rank}`}>
            <div className="rank-medal">#{user.rank}</div>
            <h2>{user.name}</h2>
            <strong className="top-card-profit">{metric.label} {metric.value}</strong>
            {metric.secondaryLabel && (
              <span className="top-card-win-rate">
                {metric.secondaryLabel}{metric.secondaryValue}
              </span>
            )}
          </article>
        );
      })}
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
                <small>{formatText(user.account)}</small>
              </span>
              <span>{formatText(user.market)}</span>
              <span className="green">{formatProfit(user.profit)}</span>
              <span>{formatPercent(user.winRate)}</span>
              <span>{formatCurrency(user.assets)}</span>
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

  const [allData, setAllData] = useState([]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchRankings(activeTab)
      .then((data) => {
        if (!ignore) {
          setAllData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("排行榜載入失敗:", err);
          setError("排行榜載入失敗，請稍後再試。");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return allData;

    return allData.filter(
      (u) =>
        u.name.toLowerCase().includes(kw) ||
        (u.account ?? "").toLowerCase().includes(kw) ||
        (u.market ?? "").toLowerCase().includes(kw)
    );
  }, [allData, search]);

  const authUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  return (
    <main className="ranking-page">
      <section className="ranking-hero">
        <div>
          <p className="ranking-badge">一時賭 一時爽</p>
          <h1>排行榜</h1>
          <p className="ranking-description">一直賭 一直爽。</p>
        </div>
        <div className="ranking-hero-aside">
          <img
            className="ranking-hero-gif"
            src={rankingHeroGif}
            alt="自從開始用 UcMarket"
          />
        </div>
      </section>

      <MyRankingCard data={allData} currentUserId={authUser?.id} />

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

      {loading ? (
        <section className="empty-state" role="status" aria-live="polite">
          <h2>排行榜載入中...</h2>
          <p>正在取得最新排名資料。</p>
        </section>
      ) : error ? (
        <section className="empty-state" role="alert">
          <h2>排行榜載入失敗</h2>
          <p>{error}</p>
        </section>
      ) : (
        <>
          <TopRankGrid data={filtered} type={activeTab} />
          <RankingTable data={filtered} />
        </>
      )}
    </main>
  );
}
