import { useParams } from "react-router-dom";
import DetailPageTemplate from "../../../components/common/DetailPageTemplate";
import usFlag from "./us-flag.png";
import politicsBanner from "./politics-banner.png";
const miniMarkets = [
  {
    id: 1,
    title: "聯儲局今年會降息幾次？",
    icon: "fa-solid fa-flag-usa",
    volume: "$40M 交易量",
    period: "每月",
    options: [
      { label: "0 次", percent: "28%", yes: "Yes", no: "No" },
      { label: "1 次以上", percent: "72%", yes: "Yes", no: "No" },
    ],
  },
  {
    id: 2,
    title: "聯儲局今年會降息幾次？",
    icon: "fa-solid fa-flag-usa",
    volume: "$40M 交易量",
    period: "每月",
    options: [
      { label: "0 次", percent: "28%", yes: "Yes", no: "No" },
      { label: "1 次以上", percent: "72%", yes: "Yes", no: "No" },
    ],
  },
  {
    id: 3,
    title: "聯儲局今年會降息幾次？",
    icon: "fa-solid fa-flag-usa",
    volume: "$40M 交易量",
    period: "每月",
    options: [
      { label: "0 次", percent: "28%", yes: "Yes", no: "No" },
      { label: "1 次以上", percent: "72%", yes: "Yes", no: "No" },
    ],
  },
];

export default function PoliticsDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate id={id} subtitle="政治事件預測市場" marketId={id}>
      <section className="politics-hero-banner">
        <img
          src={politicsBanner}
          alt="政治市場"
        />

        <div className="politics-hero-content">
          <span>POLITICS MARKET</span>
          <h1>政治市場</h1>
          <p>獨立事件</p>
          <strong>G7 峰會是否會發布新的共同制裁聲明？</strong>
        </div>
      </section>

      <section className="featured-politics-event">
        <div className="featured-left">
          <span className="featured-label">獨立事件</span>
<div className="featured-image">
    <img
        src={usFlag}
        alt="US Flag"
    />
</div>


          <h2>
            共和黨是否會贏得
            <br />
            下一屆美國總統大選？
          </h2>

          <div className="featured-actions">
            <button type="button">YES</button>
            <button type="button">NO</button>
              <a href="/markets/politics" className="more-btn">
        查看更多
        <i className="fa-solid fa-arrow-right"></i>
    </a>
          </div>
        </div>

 
        <div className="featured-stats">
          <div className="featured-stat-card">
            <div className="stat-icon">
              <i className="fa-solid fa-dollar-sign"></i>
            </div>

            <div>
              <span>總交易量</span>
              <strong>$125,430</strong>
            </div>
          </div>

          <div className="featured-stat-card">
            <div className="stat-icon">
              <i className="fa-regular fa-clock"></i>
            </div>

            <div>
              <span>截止日期</span>
              <strong>2026/08/31</strong>
            </div>
          </div>

          <div className="featured-stat-card">
            <div className="stat-icon">
              <i className="fa-solid fa-circle"></i>
            </div>

            <div>
              <span>狀態</span>
              <strong className="green-text">OPEN</strong>
            </div>
          </div>
        </div>
 
      </section>

   
    </DetailPageTemplate>
  );
}