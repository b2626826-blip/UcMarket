import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMarketDetail } from "../../../api/marketApi";
import DetailPageTemplate from "../../../components/common/DetailPageTemplate";
import TradePanel from "../../../components/market/TradePanel";
import usFlag from "./us-flag.png";
import politicsBanner from "./politics-banner.png";
import "./PoliticsDetailPage.css";

const MARKET_REFRESH_INTERVAL_MS = 10000;

const statusLabels = {
  DRAFT: "草稿",
  PENDING: "審核中",
  ACTIVE: "進行中",
  CLOSED: "已關閉",
  RESOLVED: "已結算",
  REJECTED: "已駁回",
  CANCELED: "已取消",
};

export default function PoliticsDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMarket = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await getMarketDetail(id);
        const category = String(data?.category ?? "").toLowerCase();

        if (!["politics", "政治"].includes(category)) {
          throw new Error("這不是政治市場");
        }

        setMarket(data);
        setError("");
      } catch (requestError) {
        setError(requestError.message || "政治市場載入失敗");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    let active = true;

    const guardedLoad = async (options) => {
      if (!active) {
        return;
      }
      await loadMarket(options);
    };

    guardedLoad();

    const intervalId = window.setInterval(() => {
      guardedLoad({ silent: true });
    }, MARKET_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [loadMarket]);

  if (loading || error || !market) {
    return (
      <DetailPageTemplate
        id={id}
        subtitle="政治議題預測市場"
        marketId={id}
        market={market}
        showHeroMain={false}
      >
        <p className={`politics-detail-message${error ? " error" : ""}`}>
          {loading ? "政治市場載入中..." : error || "找不到市場資料"}
        </p>
      </DetailPageTemplate>
    );
  }

  const yesPool = Number(market.yesPool) || 0;
  const noPool = Number(market.noPool) || 0;
  const totalPool = yesPool + noPool;
  const yesPercentage = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noPercentage = 100 - yesPercentage;

  return (
    <DetailPageTemplate
      id={market.code || id}
      subtitle="政治議題預測市場"
      marketId={id}
      market={market}
      showHeroMain={false}
      tradePanel={(
        <TradePanel
          marketId={id}
          market={market}
          onTradeSuccess={() => loadMarket({ silent: true })}
        />
      )}
    >
      <section className="politics-hero-banner">
        <img src={politicsBanner} alt="政治市場" />
        <div className="politics-hero-content">
          <h1>政治市場</h1>
          <strong>Independent</strong>
        </div>
      </section>

      <section className="featured-politics-event">
        <div className="featured-left">
          <div className="featured-image">
            <img src={usFlag} alt="政治議題" />
          </div>

          <h2>{market.title}</h2>
          {market.description && <p className="politics-event-description">{market.description}</p>}

          <div className="featured-actions">
            <span className="featured-actions__pill featured-actions__pill--yes">YES {yesPercentage}%</span>
            <span className="featured-actions__pill featured-actions__pill--no">NO {noPercentage}%</span>
            <Link to="/markets/politics" className="more-btn">
              回到政治市場
              <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="featured-stats">
          <div className="featured-stat-card">
            <div className="stat-icon"><i className="fa-solid fa-dollar-sign" /></div>
            <div>
              <span>總資金池</span>
              <strong>{formatCurrency(totalPool)}</strong>
            </div>
          </div>

          <div className="featured-stat-card">
            <div className="stat-icon"><i className="fa-regular fa-clock" /></div>
            <div>
              <span>截止時間</span>
              <strong>{formatDate(market.closeAt)}</strong>
            </div>
          </div>

          <div className="featured-stat-card">
            <div className="stat-icon"><i className="fa-solid fa-circle" /></div>
            <div>
              <span>市場狀態</span>
              <strong className={market.status === "ACTIVE" ? "green-text" : ""}>
                {statusLabels[market.status] || market.status}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-home-link-wrapper">
        <Link to="/" className="more-btn">
          回到首頁
        </Link>
      </div>
    </DetailPageTemplate>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未設定" : date.toLocaleDateString("zh-TW");
}
