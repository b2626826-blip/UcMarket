import { Link } from 'react-router-dom';

const categoryToSlug = {
  '政治': 'politics',
  '運動': 'sports',
  '天氣': 'weather',
  'WEATHER': 'weather',
  '時事': 'current-affairs',
  '金融': 'finance',
};

export default function MarketCard({ market, onClickTrade }) {
  const slug = categoryToSlug[market.category];
  const detailPath = `/markets/${slug}/${market.id}`;

  return (
    <div className="market-card" style={{ display: 'block' }}>
      <Link to={detailPath} style={{ display: 'block' }}>
        <div className="market-header">
          <h4>{market.title}</h4>
          <span>{market.date}</span>
        </div>
      </Link>
      <div className="market-price">
        <div className="yes">
          <small>YES</small>
          <h3>${market.yesPrice.toFixed(2)}</h3>
          <button className="trade-btn buy-btn" data-id={market.id} data-side="YES" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickTrade?.(market, 'YES'); }}>Buy Yes</button>
        </div>
        <div className="no">
          <small>NO</small>
          <h3>${market.noPrice.toFixed(2)}</h3>
          <button className="trade-btn sell-btn" data-id={market.id} data-side="NO" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClickTrade?.(market, 'NO'); }}>Buy No</button>
        </div>
      </div>
      <Link to={detailPath} style={{ display: 'block' }}>
        <div className="market-footer">
          <span>Volume {market.volume}</span>
          <span>{market.traders} traders</span>
        </div>
      </Link>
    </div>
  );
}
