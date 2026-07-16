import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCurrentEventMarketDetail,
  getCurrentEventMarkets
} from '../../../api/marketApi';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import CurrentEventMarketCard from '../../../components/market/CurrentEventMarketCard';
import { StatusLabel } from '../../../types/market';
import './CurrentAffairsDetailPage.css';
import currentAffairsBanner from './current-affairs-banner.gif';

function getSourceDisplay(sourceUrl) {
  if (!sourceUrl) {
    return { href: null, label: '尚未提供' };
  }

  try {
    const url = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      return { href: null, label: sourceUrl };
    }

    return {
      href: url.href,
      label: url.hostname.replace(/^www\./, '')
    };
  } catch {
    return { href: null, label: sourceUrl };
  }
}

export default function CurrentAffairsDetailPage() {
  const { id } = useParams();

  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherMarkets, setOtherMarkets] = useState([]);
  const [error, setError] = useState('');
  const [notFoundMessage, setNotFoundMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setMarket(null);
    setNotFoundMessage('');

    getCurrentEventMarketDetail(id)
      .then((currentMarket) => {
        if (!currentMarket) {
          setNotFoundMessage('此市場不是時事分類，無法在時事詳情頁顯示。');
          return;
        }

        setMarket(currentMarket);
      })
      .catch((apiError) => {
        if (apiError.status === 404) {
          setNotFoundMessage('找不到此時事市場。');
          return;
        }

        setError('時事市場載入失敗，請稍後再試。');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    getCurrentEventMarkets({ status: 'ACTIVE', size: 6 })
      .then(({ content }) => {
        setOtherMarkets(content.filter((item) => item.id !== id));
      })
      .catch(() => {
        setOtherMarkets([]);
      });
  }, [id]);

  if (loading) {
    return <p>市場資料載入中...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (notFoundMessage) {
    return <p>{notFoundMessage}</p>;
  }

  if (!market) {
    return <p>找不到此時事市場。</p>;
  }

  const updatedAt = market.updatedAt ?? market.createdAt;
  const source = getSourceDisplay(market.sourceUrl);

  return (

    <DetailPageTemplate
      id={market.code}
      category={market.title}
      subtitle={`市場 #${market.code}`}
      marketId={market.id}
      market={market}
      heroBanner={(
        <div className="current-affairs-showcase">
          <strong className="current-affairs-showcase__label">時事</strong>
          <img src={currentAffairsBanner} alt="時事市場展示" />
        </div>
      )}
      belowDashboard={(
        <section className="current-affairs-related">
          <header>
            <h2>其他時事市場</h2>
            <p>點擊卡片切換到其他時事市場</p>
          </header>

          <div className="current-affairs-related__grid">
            {otherMarkets.map((item) => (
              <CurrentEventMarketCard key={item.id} market={item} />
            ))}
          </div>
        </section>
      )}
    >
      <div className="trade-market-card current-affairs-market-card">
        <div className="current-affairs-overview">
          <section className="current-affairs-editorial" aria-label="事件摘要與資料來源">
            <span className="current-affairs-info__badge">事件摘要</span>
            <p className="current-affairs-info__description">{market.description}</p>

            <div className="current-affairs-source">
              <span>資料來源</span>
              {source.href ? (
                <a href={source.href} target="_blank" rel="noreferrer">
                  {source.label}
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                </a>
              ) : (
                <strong>{source.label}</strong>
              )}
              <time dateTime={updatedAt}>
                更新於 {new Date(updatedAt).toLocaleString('zh-TW')}
              </time>
            </div>
          </section>

          <section className="current-affairs-info__prices" aria-label="目前機率">
            <div className="current-affairs-odds-bar">
              <div className="current-affairs-odds-bar__labels">
                <span className="current-affairs-odds-bar__label current-affairs-odds-bar__label--yes">
                  YES {market.yesProbability}%
                </span>
                <span className="current-affairs-odds-bar__label current-affairs-odds-bar__label--no">
                  NO {market.noProbability}%
                </span>
              </div>
              <div className="current-affairs-odds-bar__track">
                <div
                  className="current-affairs-odds-bar__yes"
                  style={{ width: `${market.yesProbability}%` }}
                />
                <div
                  className="current-affairs-odds-bar__no"
                  style={{ width: `${market.noProbability}%` }}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="current-affairs-market-meta">
          <footer className="current-affairs-info__stats">
            <span>交易量</span>
            <strong>{market.volume == null ? '—' : market.volume.toLocaleString('zh-TW')}</strong>
          </footer>

          <div className="current-affairs-info__details">
            <div className="detail-template-meta-row">
              <div className="detail-template-meta-chip detail-template-meta-chip-live">
                <i className="fa-solid fa-circle"></i>
                <span>{StatusLabel[market.status] ?? market.status}</span>
              </div>
              <div className="detail-template-meta-chip">
                <label>結算時間</label>
                <strong>{new Date(market.closeAt).toLocaleString('zh-TW')}</strong>
              </div>
            </div>

            <div className="detail-template-rule-bar">
              <span className="detail-template-rule-label">結算規則</span>
              <p>{market.resolutionRule}</p>
            </div>
          </div>
        </div>
      </div>
    </DetailPageTemplate>
  );
}
