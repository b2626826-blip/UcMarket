import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMarketDetail } from "../../../api/marketApi";
import DetailPageTemplate from "../../../components/common/DetailPageTemplate";
import usFlag from "./us-flag.png";
import politicsBanner from "./politics-banner.png";
import "./PoliticsDetailPage.css";

const statusLabels = {
  DRAFT: "草稿",
  PENDING: "審核中",
  ACTIVE: "進行中",
  CLOSED: "已截止",
  RESOLVED: "已結算",
  REJECTED: "已拒絕",
  CANCELED: "已取消",
};

export default function PoliticsDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getMarketDetail(id)
      .then((data) => {
        if (!active) return;
        if (!["政治", "politics"].includes(String(data?.category).toLowerCase())) {
          throw new Error("這筆資料不是政治市場");
        }
        setMarket(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "市場詳情載入失敗");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading || error || !market) {
    return (
      <DetailPageTemplate id={id} subtitle="政治事件預測市場" marketId={id} market={market} showHeroMain={false}>
        <p className={`politics-detail-message${error ? " error" : ""}`}>
          {loading ? "政治市場載入中..." : error || "找不到政治市場"}
        </p>
      </DetailPageTemplate>
    );
  }

  const yesPool = Number(market.yesPool) || 0;
  const noPool = Number(market.noPool) || 0;
  const totalPool = yesPool + noPool;
  const yesPrice = totalPool > 0 ? yesPool / totalPool : 0.5;
  const noPrice = 1 - yesPrice;

  return (
    <DetailPageTemplate id={market.code || id} subtitle="政治事件預測市場" marketId={id} market={market} showHeroMain={false}>
      <section className="politics-hero-banner">
        <img src={politicsBanner} alt="政治市場" />
        <div className="politics-hero-content">
          <span>POLITICS MARKET</span>
          <h1>政治市場</h1>
          <p>{market.category}</p>
          <strong>{market.title}</strong>
        </div>
      </section>

      <section className="featured-politics-event">
        <div className="featured-left">
          <span className="featured-label">{market.marketType === "BINARY" ? "二元事件" : market.marketType}</span>
          <div className="featured-image">
            <img src={usFlag} alt="政治事件" />
          </div>

          <h2>{market.title}</h2>
          {market.description && <p className="politics-event-description">{market.description}</p>}

          <div className="featured-actions">
            <button type="button">YES {Math.round(yesPrice * 100)}%</button>
            <button type="button">NO {Math.round(noPrice * 100)}%</button>
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
              <span>流動池</span>
              <strong>{formatCurrency(totalPool)}</strong>
            </div>
          </div>

          <div className="featured-stat-card">
            <div className="stat-icon"><i className="fa-regular fa-clock" /></div>
            <div>
              <span>截止日期</span>
              <strong>{formatDate(market.closeAt)}</strong>
            </div>
          </div>

          <div className="featured-stat-card">
            <div className="stat-icon"><i className="fa-solid fa-circle" /></div>
            <div>
              <span>狀態</span>
              <strong className={market.status === "ACTIVE" ? "green-text" : ""}>
                {statusLabels[market.status] || market.status}
              </strong>
            </div>
          </div>
        </div>
      </section>
      <div className="detail-home-link-wrapper">
        <Link to="/" className="more-btn">
          返回首頁
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
