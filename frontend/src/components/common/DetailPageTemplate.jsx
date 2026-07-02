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
      <div className="trade-dashboard">
        <main className="trade-main-column">
          <div className="trade-hero">
            <div>
              <h1>市場 #{id}</h1>
              <p>{subtitle}</p>
            </div>
            {heroExtras}
          </div>
          {children}
        </main>

        <aside className="trade-panel-column">
          <TradePanel marketId={marketId ?? id} />
        </aside>
      </div>
    </div>
  );
}
