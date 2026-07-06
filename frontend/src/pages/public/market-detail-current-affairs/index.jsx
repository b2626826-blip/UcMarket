import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import { useEffect, useState } from 'react';
import { StatusLabel } from '../../../types/market';
import './CurrentAffairsDetailPage.css';
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
      subtitle={market.title}
      status={StatusLabel[market.status] ?? market.status}
      settleTime={new Date(market.closeAt).toLocaleString('zh-TW')}
      settlementRule={market.resolutionRule}
      marketId={market.id}
    >
      <div className="trade-market-card">
        <header className="current-affairs-info__header">
          <div>
            <span className="current-affairs-info__badge">時事市場</span>
            <h2>{market.title}</h2>
          </div>
          <span className="current-affairs-info__status">
            {StatusLabel[market.status] ?? market.status}
          </span>
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
      </div>

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
    </DetailPageTemplate>
  );
}
