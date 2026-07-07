import TradePanel from '../market/TradePanel';
import useGlowEffect from '../../hooks/useGlowEffect';
import './DetailPageTemplate.css';

export default function DetailPageTemplate({
  id,
  subtitle,
  category,
  heroLayout = 'full',
  heroExtras = null,
  children = null,
  marketId,
  market = null,
  tradePanel = null,
}) {
  useGlowEffect('.trade-market-card, .trade-panel');

  const heroContent = (
    <div
      className="trade-hero"
      style={{
        textAlign: 'left',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '24px',
        flexWrap: 'wrap',
        ...(heroLayout === 'left'
          ? { padding: '40px', borderRadius: '28px' }
          : { padding: '0 0 40px' }),
      }}
    >
      <div>
        <h1 style={{ fontSize: 42 }}>{category || `市場 #${id}`}</h1>
        <p>{subtitle}</p>
      </div>
      {heroExtras}
    </div>
  );

  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      {heroLayout === 'full' && heroContent}

      <div className="trade-dashboard">
        <div>
          {heroLayout === 'left' && heroContent}
          {children}
        </div>
        <div className="trade-panel-sticky">
          {tradePanel ?? <TradePanel marketId={marketId ?? id} market={market} />}
        </div>
      </div>
    </div>
  );
}
