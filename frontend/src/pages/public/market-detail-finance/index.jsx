import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMarketDetail } from '../../../api/marketApi';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import TradingViewWidget from '../../../components/finance/TradingViewWidget';
import TradingViewNewsWidget from '../../../components/finance/TradingViewNewsWidget';
import './FinanceDetailPage.css';

const STATUS_LABELS = {
  DRAFT: '草稿',
  PENDING: '審核中',
  ACTIVE: '進行中',
  CLOSED: '已截止',
  RESOLVED: '已結算',
  REJECTED: '已拒絕',
  CANCELED: '已取消',
};

function parseMetadata(metadata) {
  if (!metadata) return {};
  try {
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch {
    return {};
  }
}

function formatDateTime(value) {
  if (!value) return '未設定';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未設定' : date.toLocaleString('zh-TW', { hour12: false });
}

export default function FinanceDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getMarketDetail(id)
      .then((data) => {
        if (!active) return;
        if (data?.category !== '金融') {
          throw new Error('這不是金融市場');
        }
        setMarket(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || '金融市場載入失敗');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading || error || !market) {
    return (
      <DetailPageTemplate id={id} subtitle="金融市場" marketId={id} tradePanel={<div />}>
        <p style={{ padding: '48px 16px', textAlign: 'center', color: error ? '#ff476d' : '#8f8f8f' }}>
          {loading ? '金融市場載入中...' : error || '找不到金融市場'}
        </p>
      </DetailPageTemplate>
    );
  }

  const metadata = parseMetadata(market.metadata);
  const tradingViewSymbol = metadata.tradingViewSymbol ?? '';

  return (
    <DetailPageTemplate
      id={market.code || id}
      subtitle={market.description || '金融市場'}
      status={STATUS_LABELS[market.status] || market.status}
      settleTime={formatDateTime(market.closeAt)}
      settlementRule={market.resolutionRule || '未提供裁決規則'}
      marketId={market.id ?? id}
      market={market}
      category={market.title}
    >
      <div className="trade-market-card finance-market-card">
        <div className="trade-card-header" style={{ marginBottom: 24 }}>
          <div>
            <div className="market-type">
              <i className="fa-solid fa-chart-line"></i> Finance
            </div>
            <h2 style={{ fontSize: 34, lineHeight: 1.35, marginTop: 14 }}>{market.title}</h2>
            <p style={{ marginTop: 12, color: '#8f8f8f', lineHeight: 1.8 }}>
              {market.description || '此金融市場尚未提供描述。'}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 18, color: '#c7b27c' }}>
          TradingView Symbol: {tradingViewSymbol || '尚未設定金融商品'}
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
          <TradingViewWidget symbol={tradingViewSymbol} />
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
              <i className="fa-regular fa-newspaper"></i> 市場資訊
            </div>
            <p style={{ margin: 0, color: '#8f8f8f', lineHeight: 1.7 }}>
              這個頁面會直接使用 getMarketDetail(id) 取得標題、描述、狀態、截止時間、裁決規則與 metadata。
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
