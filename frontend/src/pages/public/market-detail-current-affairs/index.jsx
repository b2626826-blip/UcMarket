import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import { useEffect, useState } from 'react';
import { StatusLabel } from '../../../types/market';
import './CurrentAffairsDetailPage.css';
import currentAffairsBanner from './current-affairs-banner.gif';
import CurrentEventMarketCard from '../../../components/market/CurrentEventMarketCard';
import {
  getCurrentEventMarketDetail,
  getCurrentEventMarkets,
} from '../../../api/marketApi';

export default function CurrentAffairsDetailPage() {
  const { id } = useParams();

  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherMarkets, setOtherMarkets] = useState([]);

  useEffect(() => {
    setLoading(true);

    getCurrentEventMarketDetail(id).then((data) => {
      setMarket(data);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    getCurrentEventMarkets({ status: '', size: 6 }).then(({ content }) => {
      setOtherMarkets(content.filter((item) => item.id !== id));
    });
  }, [id]);

  if (loading) {
    return <p>市場資料載入中...</p>;
  }

  if (!market) {
    return <p>找不到此時事市場。</p>;
  }

  return (

    <DetailPageTemplate
      id={market.code}
      category={market.title}
      subtitle={`市場 #${market.code}`}
      marketId={market.id}
      heroBanner={(
        <div className="current-affairs-showcase">
          <strong className="current-affairs-showcase__label">時事</strong>
          <img src={currentAffairsBanner} alt="時事市場展示" />
        </div>
      )}
      belowDashboard={(
        <section className="current-affairs-related">
          <header>
            <h2>其他時事市場</h2>
            <p>點擊卡片切換到其他時事市場</p>
          </header>

          <div className="current-affairs-related__grid">
            {otherMarkets.map((item) => (
              <CurrentEventMarketCard key={item.id} market={item} />
            ))}
          </div>
        </section>
      )}
    >
      <div className="trade-market-card">
        <header className="current-affairs-info__header">
          <div>
            <span className="current-affairs-info__badge">時事市場</span>
            <h2>{market.title}</h2>
          </div>
        </header>

        <p className="current-affairs-info__description">{market.description}</p>

        <div className="current-affairs-info__prices">
          <div>
            <span>YES 價格</span>
            <strong>${(market.yesProbability / 100).toFixed(2)}</strong>
            <small>{market.yesProbability}%</small>
          </div>
          <div>
            <span>NO 價格</span>
            <strong>${(market.noProbability / 100).toFixed(2)}</strong>
            <small>{market.noProbability}%</small>
          </div>
        </div>

        <footer className="current-affairs-info__stats">
          <span>交易量</span>
          <strong>{market.volume == null ? '—' : market.volume.toLocaleString('zh-TW')}</strong>
        </footer>

        <div className="current-affairs-info__details">
          <div className="detail-template-meta-row">
            <div className="detail-template-meta-chip detail-template-meta-chip-live">
              <i className="fa-solid fa-circle"></i>
              <span>{StatusLabel[market.status] ?? market.status}</span>
            </div>
            <div className="detail-template-meta-chip">
              <label>結算時間</label>
              <strong>{new Date(market.closeAt).toLocaleString('zh-TW')}</strong>
            </div>
          </div>

          <div className="detail-template-rule-bar">
            <span className="detail-template-rule-label">結算規則</span>
            <p>{market.resolutionRule}</p>
          </div>
        </div>
      </div>
    </DetailPageTemplate>
  );
}
