import { useEffect, useState } from 'react';
import { getCurrentEventMarkets } from '../../../api/marketApi';
import CurrentEventMarketCard from '../../../components/market/CurrentEventMarketCard';
import MarketCard from '../../../components/market/MarketCard';
import MarketTrendCarousel from '../../../components/market/MarketTrendCarousel';
import useGlowEffect from '../../../hooks/useGlowEffect';

const heroSlides = [
  { badge: '熱門市場', title: '預測未來', text: '透過市場價格反映真實世界機率', primary: '開始交易', secondary: '查看市場' },
  { badge: '加密市場', title: 'BTC 200K', text: '預測比特幣是否突破歷史新高', primary: '立即參與', secondary: '查看走勢' },
  { badge: '政治市場', title: '美國大選', text: '即時追蹤全球政治預測市場', primary: '查看盤口', secondary: '了解玩法' },
];

const initialMarkets = [
  { id: 1, category: '政治', title: '共和黨是否會贏得下一屆美國總統大選？', date: '2028 年 11 月', yesPrice: 0.61, noPrice: 0.39, volume: '$5.8M', traders: '4,451' },
  { id: 2, category: '政治', title: '台灣某重大政策是否會在 2026 年底前通過？', date: '2026 年 12 月', yesPrice: 0.52, noPrice: 0.48, volume: '$1.9M', traders: '2,104' },
  { id: 3, category: '運動', title: '湖人是否能拿下下一屆 NBA 總冠軍？', date: '2027 賽季', yesPrice: 0.44, noPrice: 0.56, volume: '$3.2M', traders: '3,211' },
  { id: 4, category: '運動', title: '2026 世界盃足球賽冠軍是否會是南美洲球隊？', date: '2026 年 7 月', yesPrice: 0.58, noPrice: 0.42, volume: '$4.5M', traders: '3,890' },
  { id: 5, category: '天氣', title: '明天台中最高溫會超過 30°C 嗎？', date: '明天', yesPrice: 0.55, noPrice: 0.45, volume: '$320K', traders: '812' },
  { id: 6, category: '天氣', title: '本週台北會下雨超過 3 天嗎？', date: '本週', yesPrice: 0.62, noPrice: 0.38, volume: '$280K', traders: '756' }, { id: 9, category: '金融', title: '美國 Fed 是否會在今年降息兩次以上？', date: '2026 年', yesPrice: 0.57, noPrice: 0.43, volume: '$9.5M', traders: '6,892' },
  { id: 10, category: '金融', title: 'WTI 原油在 2026 年 5 月收盤是否會高過 75 美元？', date: '2026 年 5 月', yesPrice: 0.51, noPrice: 0.49, volume: '$2.3M', traders: '1,243' },
];

const categories = ['全部', '政治', '運動', '天氣', '時事', '金融'];

export default function HomePage() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState(initialMarkets);
  const [currentEventMarkets, setCurrentEventMarkets] = useState([]);
  const [currentEventLoading, setCurrentEventLoading] = useState(true);
  const [currentEventError, setCurrentEventError] = useState('');

  useEffect(() => {
    if (category !== '時事') {
      return;
    }

    setCurrentEventLoading(true);
    setCurrentEventError('');

    getCurrentEventMarkets()
      .then(({ content }) => {
        setCurrentEventMarkets(content);
      })
      .catch(() => {
        setCurrentEventMarkets([]);
        setCurrentEventError('時事市場載入失敗，請稍後再試。');
      })
      .finally(() => {
        setCurrentEventLoading(false);
      });
  }, [category]);

  useGlowEffect('.chart-card, .stats-card, .market-card');

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlideIdx((i) => (i + 1) % heroSlides.length);
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearInterval(timer);
  }, []);


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


  const filtered = markets.filter((m) => {
    const matchCat = category === '全部' || m.category === category;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredCurrentEvents = currentEventMarkets.filter((market) =>
    market.title.toLowerCase().includes(search.toLowerCase())
  );

  const slide = heroSlides[slideIdx];

  function handleTrade(market, side) {
    alert('交易確認\n\n市場：' + market.title + '\n方向：' + side + '\n價格：$' + (side === 'YES' ? market.yesPrice.toFixed(2) : market.noPrice.toFixed(2)));
  }

  return (
    <div>
      <section className="hero">
        <div className="ticker-layer">
          <div className="ticker-row row-1">BTC 200K&nbsp;&nbsp;&nbsp;ETH 10K&nbsp;&nbsp;&nbsp;SOL 500&nbsp;&nbsp;&nbsp;DOGE 1</div>
          <div className="ticker-row row-2">美國大選&nbsp;&nbsp;&nbsp;Fed 降息&nbsp;&nbsp;&nbsp;AI 監管&nbsp;&nbsp;&nbsp;NBA 冠軍</div>
          <div className="ticker-row row-3">預測未來&nbsp;&nbsp;&nbsp;套利機會&nbsp;&nbsp;&nbsp;即時價格&nbsp;&nbsp;&nbsp;分散風險</div>
        </div>
        <div className="hero-slider">
          <div className="slide" key={slideIdx} style={{ opacity: fading ? 0 : 1, transition: 'opacity .6s ease' }}>
            <span className="badge">{slide.badge}</span>
            <h1>{slide.title}</h1>
            <p>{slide.text}</p>
            <div className="hero-buttons">
              <button className="primary-btn">{slide.primary}</button>
              <button className="secondary-btn">{slide.secondary}</button>
            </div>
          </div>
        </div>
      </section>

      <div className="dashboard" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <MarketTrendCarousel />
        <div className="stats-card">
          <div className="stats-glow"></div>
          <div className="card-top">
            <div className="card-icon"><i className="fa-solid fa-trophy"></i></div>
            <h3>平台數據</h3>
            <p>即時更新市場統計</p>
          </div>
          <div className="stats-list">
            {[
              { label: '總市場數', value: markets.length },
              { label: '總交易量', value: '$48.2M' },
              { label: '總交易者', value: '8,421' },
              { label: '活躍市場', value: '6' },
            ].map((s) => (
              <div className="stat-row" key={s.label}>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="info-grid">
        <div className="info-card">
          <h3>走勢摘要</h3>
          <ul>
            {[
              { name: '2028 美國總統大選', pct: '+12.5%', cls: 'green' },
              { name: 'BTC 突破 150,000', pct: '+8.3%', cls: 'green' },
              { name: 'GDP 達到 3%', pct: '-2.1%', cls: 'red' },
            ].map((item) => (
              <li key={item.name}><span>{item.name}</span><span className={item.cls}>{item.pct}</span></li>
            ))}
          </ul>
        </div>
        <div className="info-card">
          <h3>熱門事件</h3>
          <ol>
            <li>美國總統大選</li><li>BTC 200K</li><li>NBA 總冠軍</li><li>GDP 預測</li><li>電影票房</li>
          </ol>
        </div>
        <div className="info-card">
          <h3>搜尋結果</h3>
          <ul>
            <li>WTI 原油預測</li><li>布蘭特原油</li><li>OPEC 減產</li><li>全球能源需求</li><li>新能源車</li>
          </ul>
        </div>
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
        <div className="market-search">
          <input id="marketSearch" placeholder="搜尋市場..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button><i className="fa-solid fa-magnifying-glass"></i></button>
        </div>
        <div className="market-grid" id="marketGrid">
          {category === '時事' && currentEventLoading && (
            <p>時事市場載入中...</p>
          )}

          {category !== '時事' &&
            filtered.map((market) => (
              <MarketCard key={market.id} market={market} onClickTrade={handleTrade} />
            ))}

          {category === '時事' && !currentEventLoading && currentEventError && (
            <p role="alert">{currentEventError}</p>
          )}

          {category === '時事' &&
            !currentEventLoading &&
            !currentEventError &&
            filteredCurrentEvents.length === 0 && (
              <p>目前沒有符合條件的時事市場。</p>
            )}

          {category === '時事' &&
            !currentEventLoading &&
            !currentEventError &&
            filteredCurrentEvents.map((market) => (
              <CurrentEventMarketCard key={market.id} market={market} />
            ))}
        </div>
      </section>
    </div>
  );
}
