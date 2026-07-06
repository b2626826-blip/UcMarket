import TradePanel from '../market/TradePanel';
import useGlowEffect from '../../hooks/useGlowEffect';
import './DetailPageTemplate.css';

export default function DetailPageTemplate({
  id,
  subtitle,
  startTime = '',
  settleTime = '',
  status = '',
  settlementRule = '',
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
            <div className="detail-template-hero-main">
              <h1>市場 #{id}</h1>
              <p>{subtitle}</p>

              {(status || startTime || settleTime) && (
                <div className="detail-template-meta-row">
                  {status && (
                    <div className="detail-template-meta-chip detail-template-meta-chip-live">
                      <i className="fa-solid fa-circle"></i>
                      <span>{status}</span>
                    </div>
                  )}
                  {startTime && (
                    <div className="detail-template-meta-chip">
                      <label>開始時間</label>
                      <strong>{startTime}</strong>
                    </div>
                  )}
                  {settleTime && (
                    <div className="detail-template-meta-chip">
                      <label>結算時間</label>
                      <strong>{settleTime}</strong>
                    </div>
                  )}
                </div>
              )}

              {settlementRule && (
                <div className="detail-template-rule-bar">
                  <span className="detail-template-rule-label">結算規則</span>
                  <p>{settlementRule}</p>
                </div>
              )}
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
