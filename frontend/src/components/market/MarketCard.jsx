import { Link } from 'react-router-dom';

export default function MarketCard({ market, onClickTrade }) {
  return (
    <div className="market-card" style={{ display: 'block' }}>
      <Link to={`/markets/${market.id}`} style={{ display: 'block' }}>
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
      <Link to={`/markets/${market.id}`} style={{ display: 'block' }}>
        <div className="market-footer">
          <span>Volume {market.volume}</span>
          <span>{market.traders} traders</span>
        </div>
      </Link>
    </div>
  );
}
