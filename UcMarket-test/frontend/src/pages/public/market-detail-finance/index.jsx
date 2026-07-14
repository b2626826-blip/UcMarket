import { useParams } from 'react-router-dom';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import TradingViewWidget from '../../../components/finance/TradingViewWidget';
import TradingViewNewsWidget from '../../../components/finance/TradingViewNewsWidget';
import './FinanceDetailPage.css';

export default function FinanceDetailPage() {
  const { id } = useParams();

  return (
    <DetailPageTemplate
      id={id}
      subtitle="金融價格預測市場"
      status="LIVE"
      startTime="即日起開放交易"
      settleTime="2025 年 12 月 31 日 23:59（UTC+8）"
      settlementRule="本市場預測比特幣（BTC）現貨價格是否會於 2025 年 12 月 31 日 23:59（UTC+8）前首次突破並觸及 100,000 美元。若在截止時間前曾達到或超過 100,000 美元，即判定為 YES；否則為 NO。"
      marketId={id}
    >
      <div className="trade-market-card finance-market-card">
        <div className="trade-card-header" style={{ marginBottom: 24 }}>
          <div>
            <div className="market-type">
              <i className="fa-solid fa-chart-line"></i> Finance
            </div>
            <h2 style={{ fontSize: 34, lineHeight: 1.35, marginTop: 14 }}>
              BTCUSD 即時技術走勢
            </h2>
            <p style={{ marginTop: 12, color: '#8f8f8f', lineHeight: 1.8 }}>
              這裡作為 finance 主題的資訊主卡，可承接 TradingView 圖表、金融脈絡與後續 KOL 觀點整理。
            </p>
          </div>
        </div>

        <div
          className="finance-embed finance-chart-embed"
          style={{
            height: 560,
            minHeight: 560,
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(217,170,67,.22)',
            background: '#050505',
            boxShadow: 'inset 0 0 0 1px rgba(217,170,67,.05)',
          }}
        >
          <TradingViewWidget />
        </div>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            borderRadius: 18,
            background: 'rgba(255,255,255,.02)',
            border: '1px solid rgba(217,170,67,.16)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div className="market-type" style={{ marginBottom: 10 }}>
              <i className="fa-regular fa-newspaper"></i> 消息面
            </div>
            <p style={{ margin: 0, color: '#8f8f8f', lineHeight: 1.7 }}>
              這裡直接嵌入 TradingView Top Stories，讓玩家看完 K 線後，能立即接續閱讀市場新聞。
            </p>
          </div>

          <div
            className="finance-embed finance-news-embed"
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(217,170,67,.14)',
              background: '#050505',
            }}
          >
            <TradingViewNewsWidget />
          </div>
        </section>
      </div>
    </DetailPageTemplate>
  );
}
