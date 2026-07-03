import { useState, useEffect } from 'react';
import MarketCard from '../../../components/market/MarketCard';
import MarketTrendCarousel from '../../../components/market/MarketTrendCarousel';
import useGlowEffect from '../../../hooks/useGlowEffect';

const initialMarkets = [
  { id: 1, category: '政治', title: '共和黨是否會贏得下一屆美國總統大選？', date: '2028 年 11 月', yesPrice: 0.61, noPrice: 0.39, volume: '$5.8M', traders: '4,451' },
  { id: 2, category: '政治', title: '台灣某重大政策是否會在 2026 年底前通過？', date: '2026 年 12 月', yesPrice: 0.52, noPrice: 0.48, volume: '$1.9M', traders: '2,104' },
  { id: 3, category: '運動', title: '湖人是否能拿下下一屆 NBA 總冠軍？', date: '2027 賽季', yesPrice: 0.44, noPrice: 0.56, volume: '$3.2M', traders: '3,211' },
  { id: 4, category: '運動', title: '2026 世界盃足球賽冠軍是否會是南美洲球隊？', date: '2026 年 7 月', yesPrice: 0.58, noPrice: 0.42, volume: '$4.5M', traders: '3,890' },
  { id: 5, category: '天氣', title: '明天台中最高溫會超過 30°C 嗎？', date: '明天', yesPrice: 0.55, noPrice: 0.45, volume: '$320K', traders: '812' },
  { id: 6, category: '天氣', title: '本週台北會下雨超過 3 天嗎？', date: '本週', yesPrice: 0.62, noPrice: 0.38, volume: '$280K', traders: '756' },
  { id: 7, category: '時事', title: '某熱門社會議題是否會在本月登上主流媒體頭條？', date: '本月', yesPrice: 0.48, noPrice: 0.52, volume: '$410K', traders: '1,023' },
  { id: 8, category: '時事', title: '某新興科技監管法案是否會在季內完成初審？', date: '本季', yesPrice: 0.37, noPrice: 0.63, volume: '$560K', traders: '1,245' },
  { id: 9, category: '金融', title: '美國 Fed 是否會在今年降息兩次以上？', date: '2026 年', yesPrice: 0.57, noPrice: 0.43, volume: '$9.5M', traders: '6,892' },
  { id: 10, category: '金融', title: 'WTI 原油在 2026 年 5 月收盤是否會高過 75 美元？', date: '2026 年 5 月', yesPrice: 0.51, noPrice: 0.49, volume: '$2.3M', traders: '1,243' },
];

function parseMetric(value) {
  if (typeof value === 'number') return value;

  const normalized = String(value ?? '').replace(/[$,\s]/g, '').toUpperCase();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return 0;
  if (normalized.endsWith('B')) return amount * 1_000_000_000;
  if (normalized.endsWith('M')) return amount * 1_000_000;
  if (normalized.endsWith('K')) return amount * 1_000;
  return amount;
}

const categories = ['全部', '政治', '運動', '天氣', '時事', '金融'];

export default function HomePage() {
  const [category, setCategory] = useState('全部');
  const [rankingType, setRankingType] = useState('traders');
  const [markets, setMarkets] = useState(initialMarkets);
  useGlowEffect('.chart-card, .stats-card, .market-card');



  useEffect(() => {
    const timer = setInterval(() => {
      setMarkets((prev) => prev.map((m) => {
        const move = Math.random() * 0.04 - 0.02;
        let yp = m.yesPrice + move;
        yp = Math.max(0.05, Math.min(0.95, yp));
        return { ...m, yesPrice: yp, noPrice: +(1 - yp).toFixed(2) };
      }));
    }, 6000);
    return () => clearInterval(timer);
  }, []);


  const filtered = markets.filter((market) => category === categories[0] || market.category === category);
  const rankedMarkets = [...markets]
    .sort((a, b) => (
      rankingType === 'traders'
        ? parseMetric(b.traders) - parseMetric(a.traders)
        : parseMetric(b.volume) - parseMetric(a.volume)
    ))
    .slice(0, 4);


  return (
    <div className="markets-dashboard-page">
      <div className="dashboard" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <MarketTrendCarousel />
        <div className="stats-card">
          <div className="stats-glow"></div>
          <div className="card-top">
            <div className="card-icon"><i className="fa-solid fa-trophy"></i></div>
            <h3>熱門排行</h3>
            <p>{rankingType === 'traders' ? '依盤口參與人數排序' : '依盤口交易金額排序'}</p>
          </div>

          <div className="market-ranking-tabs" role="tablist" aria-label="熱門排行切換">
            <button
              type="button"
              className={rankingType === 'traders' ? 'active' : ''}
              onClick={() => setRankingType('traders')}
            >
              熱門市場排行
            </button>
            <button
              type="button"
              className={rankingType === 'volume' ? 'active' : ''}
              onClick={() => setRankingType('volume')}
            >
              熱門交易排行
            </button>
          </div>

          <div className="market-ranking-list">
            {rankedMarkets.map((market, index) => (
              <div className="market-ranking-row" key={market.id}>
                <span className="market-ranking-position">{index + 1}</span>
                <span className="market-ranking-title">{market.title}</span>
                <strong>{rankingType === 'traders' ? `${market.traders} 人` : market.volume}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="platform-metrics" aria-label="平台統計">
        {[
          { label: '本平台註冊人數', value: '12,680', unit: '人', icon: 'fa-user-plus' },
          { label: '本平台交易金額', value: '$48.2M', unit: '', icon: 'fa-coins' },
          { label: '本平台盤口數量', value: '10', unit: '個', icon: 'fa-chart-column' },
          { label: '本平台預測人數', value: '8,421', unit: '人', icon: 'fa-users' },
        ].map((metric) => (
          <article className="platform-metric-card" key={metric.label}>
            <div className="platform-metric-icon" aria-hidden="true">
              <i className={`fa-solid ${metric.icon}`}></i>
            </div>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.unit && <small>{metric.unit}</small>}
          </article>
        ))}
      </section>

      <section className="markets">
        <div className="section-title">
          <h2>預測市場</h2>
        </div>
        <div className="market-tabs">
          {categories.map((cat) => (
            <button key={cat} className={category === cat ? 'active' : ''} onClick={() => setCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
        <div className="market-grid" id="marketGrid">
          {filtered.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
