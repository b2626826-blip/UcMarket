import { Link } from 'react-router-dom';

const categoryToSlug = {
  '政治': 'politics',
  '運動': 'sports',
  '天氣': 'weather',
  'WEATHER': 'weather',
  '時事': 'current-affairs',
  '金融': 'finance',
};

export default function MarketCard({ market }) {
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
          <Link className="trade-btn buy-btn" data-id={market.id} data-side="YES" to={detailPath}>Buy Yes</Link>
        </div>
        <div className="no">
          <small>NO</small>
          <h3>${market.noPrice.toFixed(2)}</h3>
          <Link className="trade-btn sell-btn" data-id={market.id} data-side="NO" to={detailPath}>Buy No</Link>
        </div>
      </div>
      <Link to={detailPath} style={{ display: 'block' }}>
        <div className="market-footer">
          <span>Volume {market.volume}</span>
        </div>
      </Link>
    </div>
  );
}
