import TradePanel from '../market/TradePanel';
import useGlowEffect from '../../hooks/useGlowEffect';
import './DetailPageTemplate.css';

export default function DetailPageTemplate({
  id,
  subtitle,
  heroExtras = null,
  children = null,
  marketId,
}) {
  useGlowEffect('.trade-market-card, .trade-panel');

  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div
        className="trade-hero"
        style={{
          textAlign: 'left',
          padding: '0 0 40px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 42 }}>市場 #{id}</h1>
          <p>{subtitle}</p>
        </div>
        {heroExtras}
      </div>

      <div className="trade-dashboard">
        <div>{children}</div>
        <div>
          <TradePanel marketId={marketId ?? id} />
        </div>
      </div>
    </div>
  );
}
