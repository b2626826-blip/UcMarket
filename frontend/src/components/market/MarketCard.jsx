import { Link } from 'react-router-dom';

const categoryToSlug = {
  '政治': 'politics',
  '運動': 'sports',
  '天氣': 'weather',
  '時事': 'current-affairs',
  '金融': 'finance',
};

export default function MarketCard({ market }) {
  const detailPath = categoryToSlug[market.category]
    ? `/markets/${categoryToSlug[market.category]}/${market.id}`
    : `/markets/${market.id}`;

  const getOdds = (odds, price) => {
    const explicitOdds = Number(odds);
    if (Number.isFinite(explicitOdds) && explicitOdds > 0) return explicitOdds;

    const probability = Number(price);
    return Number.isFinite(probability) && probability > 0 ? 1 / probability : 0;
  };

  const yesOdds = getOdds(market.yesOdds ?? market.yes_odds, market.yesPrice);
  const noOdds = getOdds(market.noOdds ?? market.no_odds, market.noPrice);

  return (
    <div className="market-card glass-card" style={{ display: 'block' }}>
      <Link to={detailPath} style={{ display: 'block' }}>
        <div className="market-header">
          <h4>{market.title}</h4>
          <span>{market.date}</span>
        </div>
      </Link>
      <div className="market-price">
        <Link className="market-outcome yes" to={detailPath} data-id={market.id} data-side="YES">
          <span className="market-outcome-label">買 YES</span>
          <small>目前賠率</small>
          <strong>{yesOdds.toFixed(2)}</strong>
        </Link>
        <Link className="market-outcome no" to={detailPath} data-id={market.id} data-side="NO">
          <span className="market-outcome-label">買 NO</span>
          <small>目前賠率</small>
          <strong>{noOdds.toFixed(2)}</strong>
        </Link>
      </div>
      <Link to={detailPath} style={{ display: 'block' }}>
        <div className="market-footer">
          <span>成交量 {market.volume}</span>
          <span>{market.traders} 位交易者</span>
        </div>
      </Link>
    </div>
  );
}
