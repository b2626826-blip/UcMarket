import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMarketDetail } from '../../../api/marketApi';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import politicsBanner from './politics-banner.png';
import usFlag from './us-flag.png';
import './PoliticsDetailPage.css';

const statusLabels = {
  DRAFT: '草稿',
  PENDING: '審核中',
  ACTIVE: '進行中',
  CLOSED: '已截止',
  RESOLVED: '已結算',
  REJECTED: '已拒絕',
  CANCELED: '已取消',
};

export default function PoliticsDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getMarketDetail(id)
      .then((data) => {
        if (!active) return;
        if (!['政治', 'politics'].includes(String(data?.category).toLowerCase())) {
          throw new Error('這筆資料不是政治市場');
        }
        setMarket(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || '市場詳情載入失敗');
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
      <DetailPageTemplate id={id} subtitle="政治事件預測市場" marketId={id}>
        <p className={`politics-detail-message${error ? ' error' : ''}`}>
          {loading ? '政治市場載入中...' : error || '找不到政治市場'}
        </p>
      </DetailPageTemplate>
    );
  }

  const yesPool = Number(market.yesPool) || 0;
  const noPool = Number(market.noPool) || 0;
  const totalPool = yesPool + noPool;
  const yesPrice = totalPool > 0 ? yesPool / totalPool : 0.5;
  const noPrice = 1 - yesPrice;
  const isActive = market.status === 'ACTIVE';

  return (
    <DetailPageTemplate id={market.code || id} subtitle="政治事件預測市場" marketId={id} market={market}>
      <section className="politics-detail-hero">
        <img src={politicsBanner} alt="政治市場" />
        <div className="politics-detail-hero__content">
          <span>POLITICS MARKET</span>
          <h1>政治市場</h1>
          <p>{market.category}</p>
          <strong>{market.title}</strong>
        </div>
      </section>

      <section className="politics-detail-feature">
        <div className="politics-detail-feature__copy">
          <span>{market.marketType === 'BINARY' ? '二元事件' : market.marketType}</span>
          <div className="politics-detail-feature__image"><img src={usFlag} alt="政治事件" /></div>
          <h2>{market.title}</h2>
          {market.description && <p className="politics-detail-description">{market.description}</p>}
          <div className="politics-detail-feature__actions">
            <button type="button">YES {Math.round(yesPrice * 100)}%</button>
            <button type="button">NO {Math.round(noPrice * 100)}%</button>
            <Link to="/markets/politics">查看更多 <i className="fa-solid fa-arrow-right"></i></Link>
          </div>
        </div>

        <div className="politics-detail-feature__stats">
          <div><span><i className="fa-solid fa-dollar-sign"></i></span><p>流動池</p><strong>{formatCurrency(totalPool)}</strong></div>
          <div><span><i className="fa-regular fa-clock"></i></span><p>截止日期</p><strong>{formatDate(market.closeAt)}</strong></div>
          <div><span><i className="fa-solid fa-circle"></i></span><p>狀態</p><strong className={isActive ? 'green-text' : ''}>{statusLabels[market.status] || market.status}</strong></div>
        </div>
      </section>

      <div className="trade-market-card">
        <div className="trade-card-header">
          <div>
            <div className="market-type"><i className="fa-solid fa-landmark"></i> 政治</div>
            <h2>{market.title}</h2>
            <p>{market.description || '本市場將依公開的政治事件結果結算。'}</p>
          </div>
          <div className={`market-status${isActive ? ' live' : ''}`}><i className="fa-solid fa-circle"></i> {statusLabels[market.status] || market.status}</div>
        </div>

        <div className="price-board">
          <div className="price-box yes-price"><span>YES 價格</span><strong>${yesPrice.toFixed(2)}</strong><p>{Math.round(yesPrice * 100)}% 預測 YES</p></div>
          <div className="price-box no-price"><span>NO 價格</span><strong>${noPrice.toFixed(2)}</strong><p>{Math.round(noPrice * 100)}% 預測 NO</p></div>
        </div>

        <div className="market-option-section">
          <h3>可選擇方向</h3>
          <div className="option-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <button className="option-card active"><span>YES</span><strong>${yesPrice.toFixed(2)}</strong></button>
            <button className="option-card"><span>NO</span><strong>${noPrice.toFixed(2)}</strong></button>
          </div>
        </div>

        <div className="market-meta">
          <div><span>流動池</span><strong>{formatCurrency(totalPool)}</strong></div>
          <div><span>建立時間</span><strong>{formatDate(market.createdAt)}</strong></div>
          <div><span>截止時間</span><strong>{formatDate(market.closeAt)}</strong></div>
        </div>
      </div>
    </DetailPageTemplate>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value) {
  if (!value) return '未設定';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未設定' : date.toLocaleDateString('zh-TW');
}
