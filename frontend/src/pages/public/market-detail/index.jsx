import { useParams } from 'react-router-dom';
import TradePanel from '../../../components/market/TradePanel';
import useGlowEffect from '../../../hooks/useGlowEffect';

export default function MarketDetailPage() {
  const { id } = useParams();
  useGlowEffect('.trade-market-card, .trade-panel');

  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div className="trade-hero" style={{ textAlign: 'left', padding: '0 0 40px' }}>
        <h1 style={{ fontSize: 42 }}>市場 #{id}</h1>
        <p>WTI 原油在 2026 年 5 月收盤是否會高過 55？</p>
      </div>
      <div className="trade-dashboard">
        <div>
          <div className="trade-market-card">
            <div className="trade-card-header">
              <div>
                <div className="market-type"><i className="fa-solid fa-chart-line"></i> 金融</div>
                <h2 style={{ fontSize: 34, lineHeight: 1.35 }}>WTI 原油在 2026 年 5 月收盤是否會高過 55？</h2>
                <p style={{ marginTop: 12, color: '#8f8f8f' }}>根據 ICE 官方結算價，若 WTI 原油 2026 年 5 月合約收盤價高於 55 USD，則此市場結算為 YES。</p>
              </div>
              <div className="market-status live">
                <i className="fa-solid fa-circle"></i> LIVE
              </div>
            </div>
            <div className="price-board">
              <div className="price-box yes-price">
                <span>YES 價格</span>
                <strong>$0.62</strong>
                <p>58.3% 看漲</p>
              </div>
              <div className="price-box no-price">
                <span>NO 價格</span>
                <strong>$0.38</strong>
                <p>41.7% 看跌</p>
              </div>
            </div>
            <div className="market-option-section">
              <h3>可選擇方向</h3>
              <div className="option-grid">
                {[
                  { label: 'YES 看漲', price: '$0.62', active: true },
                  { label: 'NO 看跌', price: '$0.38', active: false },
                  { label: 'OPTION 選擇權', price: '42%', active: false },
                  { label: '自訂合約', price: '—', active: false },
                ].map((opt) => (
                  <button key={opt.label} className={`option-card ${opt.active ? 'active' : ''}`}>
                    <span>{opt.label}</span>
                    <strong>{opt.price}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="market-meta">
              <div><span>成交量</span><strong>$2.3M</strong></div>
              <div><span>交易者</span><strong>1,243</strong></div>
              <div><span>截止</span><strong>2026 年 5 月</strong></div>
            </div>
          </div>
        </div>
        <div>
          <TradePanel marketId={id} />
        </div>
      </div>
      <section className="trade-status-grid">
        <div className="trade-status-card"><span>今日交易</span><strong>24</strong><p className="green-text">成功 21 筆</p></div>
        <div className="trade-status-card"><span>處理中</span><strong>2</strong><p>等待撮合</p></div>
        <div className="trade-status-card"><span>失敗交易</span><strong>1</strong><p className="red-text">餘額不足</p></div>
        <div className="trade-status-card"><span>目前餘額</span><strong>$89,230</strong><p>可用資金</p></div>
      </section>
    </div>
  );
}
