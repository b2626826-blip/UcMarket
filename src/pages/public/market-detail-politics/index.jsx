import { Link, useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import politicsBanner from './politics-banner.png';
import usFlag from './us-flag.png';
import './PoliticsDetailPage.css';

export default function PoliticsDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate
      id={id}
      subtitle="政治事件預測市場"
      marketId={id}
    >
      <section className="politics-detail-hero">
        <img src={politicsBanner} alt="政治市場" />
        <div className="politics-detail-hero__content">
          <span>POLITICS MARKET</span>
          <h1>政治市場</h1>
          <p>獨立事件</p>
          <strong>G7 峰會是否會發布新的共同制裁聲明？</strong>
        </div>
      </section>

      <section className="politics-detail-feature">
        <div className="politics-detail-feature__copy">
          <span>獨立事件</span>
          <div className="politics-detail-feature__image">
            <img src={usFlag} alt="US Flag" />
          </div>

          <h2>
            共和黨是否會贏得
            <br />
            下一屆美國總統大選？
          </h2>

          <div className="politics-detail-feature__actions">
            <button type="button">YES</button>
            <button type="button">NO</button>
            <Link to="/markets/politics">
              查看更多 <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>
        </div>

        <div className="politics-detail-feature__stats">
          <div>
            <span><i className="fa-solid fa-dollar-sign"></i></span>
            <p>總交易量</p>
            <strong>$125,430</strong>
          </div>
          <div>
            <span><i className="fa-regular fa-clock"></i></span>
            <p>截止日期</p>
            <strong>2026/08/31</strong>
          </div>
          <div>
            <span><i className="fa-solid fa-circle"></i></span>
            <p>狀態</p>
            <strong className="green-text">OPEN</strong>
          </div>
        </div>
      </section>

      <div className="trade-market-card">
        <div className="trade-card-header">
          <div>
            <div className="market-type"><i className="fa-solid fa-landmark"></i> 政治</div>
            <h2>共和黨是否會贏得下一屆美國總統大選？</h2>
            <p>若共和黨候選人在 2028 年美國總統大選中當選，本市場結算為 YES；否則結算為 NO。</p>
          </div>
          <div className="market-status live">
            <i className="fa-solid fa-circle"></i> LIVE
          </div>
        </div>

        <div className="price-board">
          <div className="price-box yes-price">
            <span>YES 價格</span>
            <strong>$0.61</strong>
            <p>61% 預測共和黨勝選</p>
          </div>
          <div className="price-box no-price">
            <span>NO 價格</span>
            <strong>$0.39</strong>
            <p>39% 預測共和黨落選</p>
          </div>
        </div>

        <div className="market-option-section">
          <h3>可選擇方向</h3>
          <div className="option-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <button className="option-card active"><span>YES 勝選</span><strong>$0.61</strong></button>
            <button className="option-card"><span>NO 落選</span><strong>$0.39</strong></button>
          </div>
        </div>

        <div className="market-meta">
          <div><span>成交量</span><strong>$5.8M</strong></div>
          <div><span>交易者</span><strong>4,451</strong></div>
          <div><span>截止時間</span><strong>2028 年 11 月</strong></div>
        </div>
      </div>

      <section className="trade-status-grid">
        <div className="trade-status-card"><span>24 小時成交</span><strong>$328K</strong><p className="green-text">較昨日 +8.4%</p></div>
        <div className="trade-status-card"><span>YES 持有人</span><strong>2,716</strong><p>目前領先</p></div>
        <div className="trade-status-card"><span>NO 持有人</span><strong>1,735</strong><p>占比 39%</p></div>
        <div className="trade-status-card"><span>市場狀態</span><strong>開放中</strong><p>等待選舉結果</p></div>
      </section>
    </DetailPageTemplate>
  );
}
