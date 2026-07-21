/*import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMarketsByCategory, getPagedCurrentEventMarkets } from '../../../api/marketApi';
import { groupWeatherMarkets, parseMetadata } from '../../../utils/weatherHelpers';
import CurrentEventMarketCard from '../../../components/market/CurrentEventMarketCard';
import MarketCard from '../../../components/market/MarketCard';
import WeatherEventCard from '../../../components/market/WeatherEventCard';
import MarketTrendCarousel from '../../../components/market/MarketTrendCarousel';
import useGlowEffect from '../../../hooks/useGlowEffect';
import { CURRENT_EVENT_CATEGORY } from '../../../types/market';

const initialMarkets = [
  { id: 1, category: '政治', title: '共和黨是否會贏得下一屆美國總統大選？', date: '2028 年 11 月', yesPrice: 0.61, noPrice: 0.39, volume: '$5.8M', traders: '4,451' },
  { id: 2, category: '政治', title: '台灣某重大政策是否會在 2026 年底前通過？', date: '2026 年 12 月', yesPrice: 0.52, noPrice: 0.48, volume: '$1.9M', traders: '2,104' },
  { id: 3, category: '運動', title: '湖人是否能拿下下一屆 NBA 總冠軍？', date: '2027 賽季', yesPrice: 0.44, noPrice: 0.56, volume: '$3.2M', traders: '3,211' },
  { id: 4, category: '運動', title: '2026 世界盃足球賽冠軍是否會是南美洲球隊？', date: '2026 年 7 月', yesPrice: 0.58, noPrice: 0.42, volume: '$4.5M', traders: '3,890' },
  { id: 9, category: '金融', title: '美國 Fed 是否會在今年降息兩次以上？', date: '2026 年', yesPrice: 0.57, noPrice: 0.43, volume: '$9.5M', traders: '6,892' },
  { id: 10, category: '金融', title: 'WTI 原油在 2026 年 5 月收盤是否會高過 75 美元？', date: '2026 年 5 月', yesPrice: 0.51, noPrice: 0.49, volume: '$2.3M', traders: '1,243' },
];

const categories = ['全部', '政治', '運動', '天氣', CURRENT_EVENT_CATEGORY, '金融'];

export default function HomePage() {
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState(initialMarkets);
  const [currentEventMarkets, setCurrentEventMarkets] = useState([]);
  const [currentEventLoading, setCurrentEventLoading] = useState(true);
  const [currentEventError, setCurrentEventError] = useState('');
  const [currentEventPage, setCurrentEventPage] = useState(0);
  const [currentEventPageInfo, setCurrentEventPageInfo] = useState({
    totalPages: 0,
    hasNext: false,
  });
  const [weatherMarkets, setWeatherMarkets] = useState([]);
  const [weatherIndividuals, setWeatherIndividuals] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    if (category !== CURRENT_EVENT_CATEGORY) {
      return;
    }

    setCurrentEventLoading(true);
    setCurrentEventError('');

    getPagedCurrentEventMarkets({ page: currentEventPage })
      .then(({ content, totalPages, hasNext }) => {
        setCurrentEventMarkets(content);
        setCurrentEventPageInfo({ totalPages, hasNext });
      })
      .catch(() => {
        setCurrentEventMarkets([]);
        setCurrentEventPageInfo({ totalPages: 0, hasNext: false });
        setCurrentEventError('時事市場載入失敗，請稍後再試。');
      })
      .finally(() => {
        setCurrentEventLoading(false);
      });
  }, [category, currentEventPage]);

  useEffect(() => {
    if (category !== '天氣') return;
    if (weatherLoading) return;
    if (weatherMarkets.length > 0) return;

    setWeatherLoading(true);
    setWeatherError('');

    getMarketsByCategory('WEATHER')
      .then((data) => {
        const withMeta = [];
        const withoutMeta = [];
        data.forEach((market) => {
          const metadata = parseMetadata(market);
          if (metadata.city && metadata.date && metadata.metric) {
            withMeta.push(market);
            return;
          }

          const yesPool = Number(market.yesPool || 0);
          const noPool = Number(market.noPool || 0);
          const total = yesPool + noPool;
          const yesPrice = total > 0 ? +(yesPool / total).toFixed(4) : 0.5;
          const volume = total >= 1000000
            ? `$${(total / 1000000).toFixed(1)}M`
            : total >= 1000
              ? `$${(total / 1000).toFixed(1)}K`
              : `$${total.toFixed(1)}`;
          withoutMeta.push({
            ...market,
            category: '天氣',
            yesPrice,
            noPrice: +(1 - yesPrice).toFixed(4),
            volume,
            traders: '0',
            eventCount: 1,
          });
        });
        setWeatherMarkets(groupWeatherMarkets(withMeta).slice(0, 6));
        setWeatherIndividuals(withoutMeta.slice(0, 3));
      })
      .catch(() => {
        setWeatherMarkets([]);
        setWeatherIndividuals([]);
        setWeatherError('天氣市場載入失敗，請稍後再試。');
      })
      .finally(() => {
        setWeatherLoading(false);
      });
  }, [category, weatherMarkets.length]);

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


  const filtered = markets.filter((m) => {
    const matchCat = category === '全部' || m.category === category;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredCurrentEvents = currentEventMarkets.filter((market) =>
    market.title.toLowerCase().includes(search.toLowerCase())
  );

  function handleTrade(market, side) {
    alert('交易確認\n\n市場：' + market.title + '\n方向：' + side + '\n價格：$' + (side === 'YES' ? market.yesPrice.toFixed(2) : market.noPrice.toFixed(2)));
  }

  return (
    <div className="markets-dashboard-page">
      <div className="dashboard home-dashboard">
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

      <section id="markets" className="markets">
        <div className="section-title">
          <h2>預測市場</h2>
        </div>
        <div className="market-tabs">
          {categories.map((cat) => (
            <button key={cat} className={category === cat ? 'active' : ''} onClick={() => {
              setCategory(cat);
              if (cat === CURRENT_EVENT_CATEGORY) setCurrentEventPage(0);
            }}>
              {cat}
            </button>
          ))}
        </div>
        <div className="market-search">
          <input id="marketSearch" placeholder="搜尋市場..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button><i className="fa-solid fa-magnifying-glass"></i></button>
        </div>
        <div className="market-grid" id="marketGrid">
          {category === '天氣' && weatherLoading && (
            <p>天氣市場載入中...</p>
          )}

          {category === '天氣' && !weatherLoading && weatherError && (
            <p role="alert">{weatherError}</p>
          )}

          {category === '天氣' && !weatherLoading && !weatherError && weatherMarkets.length === 0 && weatherIndividuals.length === 0 && (
            <p>目前沒有符合條件的天氣市場。</p>
          )}

          {category === '天氣' && !weatherLoading && !weatherError &&
            weatherMarkets.map((group) => (
              <WeatherEventCard key={group.id} group={group} />
            ))}

          {category === '天氣' && !weatherLoading && !weatherError && weatherIndividuals.length > 0 && (
            <div className="weather-section-divider">
              <span>其他天氣事件</span>
            </div>
          )}

          {category === '天氣' && !weatherLoading && !weatherError &&
            weatherIndividuals.map((item) => (
              <WeatherEventCard key={item.id} group={item} />
            ))}

          {category === CURRENT_EVENT_CATEGORY && currentEventLoading && (
            <p>時事市場載入中...</p>
          )}

          {category !== '天氣' && category !== CURRENT_EVENT_CATEGORY &&
            filtered.map((market) => (
              <MarketCard key={market.id} market={market} onClickTrade={handleTrade} />
            ))}

          {category === CURRENT_EVENT_CATEGORY && !currentEventLoading && currentEventError && (
            <p role="alert">{currentEventError}</p>
          )}

        {category === '天氣' && (
          <div className="view-all-weather">
            <Link to="/markets/weather" className="view-all-weather-link">
              查看全部天氣市場 <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>
        )}

        {category === CURRENT_EVENT_CATEGORY &&
            !currentEventLoading &&
            !currentEventError &&
            filteredCurrentEvents.length === 0 && (
              <p>目前沒有符合條件的時事市場。</p>
            )}

          {category === CURRENT_EVENT_CATEGORY &&
            !currentEventLoading &&
            !currentEventError &&
            filteredCurrentEvents.map((market) => (
              <CurrentEventMarketCard key={market.id} market={market} />
            ))}
        </div>

        {category === CURRENT_EVENT_CATEGORY &&
          !currentEventLoading &&
          !currentEventError &&
          currentEventPageInfo.totalPages > 1 && (
            <nav aria-label="時事市場分頁">
              <button
                type="button"
                disabled={currentEventPage === 0}
                onClick={() => setCurrentEventPage((page) => page - 1)}
              >
                上一頁
              </button>
              <span>{currentEventPage + 1} / {currentEventPageInfo.totalPages}</span>
              <button
                type="button"
                disabled={!currentEventPageInfo.hasNext}
                onClick={() => setCurrentEventPage((page) => page + 1)}
              >
                下一頁
              </button>
            </nav>
          )}
      </section>
    </div>
  );
}
*/

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMarkets, getPagedCurrentEventMarkets, getMarketsByCategory } from '../../../api/marketApi';
import { groupWeatherMarkets, parseMetadata } from '../../../utils/weatherHelpers';
import CurrentEventMarketCard from '../../../components/market/CurrentEventMarketCard';
import MarketCard from '../../../components/market/MarketCard';
import WeatherEventCard from '../../../components/market/WeatherEventCard';
import MarketTrendCarousel from '../../../components/market/MarketTrendCarousel';
import useGlowEffect from '../../../hooks/useGlowEffect';
import { CURRENT_EVENT_CATEGORY } from '../../../types/market';

const initialMarkets = [
  { id: 1, category: '政治', title: '共和黨是否會贏得下一屆美國總統大選？', date: '2028 年 11 月', yesPrice: 0.61, noPrice: 0.39, volume: '$5.8M', traders: '4,451' },
  { id: 2, category: '政治', title: '台灣某重大政策是否會在 2026 年底前通過？', date: '2026 年 12 月', yesPrice: 0.52, noPrice: 0.48, volume: '$1.9M', traders: '2,104' },
  { id: 3, category: '運動', title: '湖人是否能拿下下一屆 NBA 總冠軍？', date: '2027 賽季', yesPrice: 0.44, noPrice: 0.56, volume: '$3.2M', traders: '3,211' },
  { id: 4, category: '運動', title: '2026 世界盃足球賽冠軍是否會是南美洲球隊？', date: '2026 年 7 月', yesPrice: 0.58, noPrice: 0.42, volume: '$4.5M', traders: '3,890' },
  { id: 9, category: '金融', title: '美國 Fed 是否會在今年降息兩次以上？', date: '2026 年', yesPrice: 0.57, noPrice: 0.43, volume: '$9.5M', traders: '6,892' },
  { id: 10, category: '金融', title: 'WTI 原油在 2026 年 5 月收盤是否會高過 75 美元？', date: '2026 年 5 月', yesPrice: 0.51, noPrice: 0.49, volume: '$2.3M', traders: '1,243' },
];

const categories = ['全部', '政治', '運動', '天氣', CURRENT_EVENT_CATEGORY, '金融'];

export function showsCurrentEventMarkets(category) {
  return category === '全部' || category === CURRENT_EVENT_CATEGORY;
}

function toHomeMarket(market) {
  const yesPool = Number(market.yesPool || 0);
  const noPool = Number(market.noPool || 0);
  const totalPool = yesPool + noPool;
  const yesPrice = totalPool > 0 ? +(yesPool / totalPool).toFixed(4) : 0.5;
  const volume = Number(market.volume || 0);

  return {
    ...market,
    date: market.closeAt ? new Date(market.closeAt).toLocaleDateString('zh-TW') : '未設定',
    yesPrice,
    noPrice: +(1 - yesPrice).toFixed(4),
    volume: volume >= 1000000 ? `$${(volume / 1000000).toFixed(1)}M` : volume >= 1000 ? `$${(volume / 1000).toFixed(1)}K` : `$${volume.toFixed(1)}`,
    traders: '0',
  };
}

export default function HomePage() {
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState(initialMarkets);
  const [currentEventMarkets, setCurrentEventMarkets] = useState([]);
  const [currentEventLoading, setCurrentEventLoading] = useState(true);
  const [currentEventError, setCurrentEventError] = useState('');
  const [currentEventPage, setCurrentEventPage] = useState(0);
  const [currentEventPageInfo, setCurrentEventPageInfo] = useState({
    totalPages: 0,
    hasNext: false,
  });
  const [weatherMarkets, setWeatherMarkets] = useState([]);
  const [weatherIndividuals, setWeatherIndividuals] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    getMarkets({ size: 100 })
      .then((data) => {
        setMarkets(data
          .filter((market) => market.category !== 'WEATHER' && market.category !== 'CURRENT_AFFAIRS')
          .map(toHomeMarket));
      })
      .catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    if (!showsCurrentEventMarkets(category)) return;
    setCurrentEventLoading(true);
    setCurrentEventError('');
    getPagedCurrentEventMarkets({ page: currentEventPage })
      .then(({ content, totalPages, hasNext }) => {
        setCurrentEventMarkets(content);
        setCurrentEventPageInfo({ totalPages, hasNext });
      })
      .catch(() => {
        setCurrentEventMarkets([]);
        setCurrentEventPageInfo({ totalPages: 0, hasNext: false });
        setCurrentEventError('時事市場載入失敗，請稍後再試。');
      })
      .finally(() => setCurrentEventLoading(false));
  }, [category, currentEventPage]);

  useEffect(() => {
    if (category !== '天氣') return;
    if (weatherLoading) return;
    if (weatherMarkets.length > 0) return;
    setWeatherLoading(true);
    setWeatherError('');
    getMarketsByCategory('WEATHER')
      .then((data) => {
        const withMeta = [];
        const withoutMeta = [];
        data.forEach((m) => {
          const meta = parseMetadata(m);
          if (meta.city && meta.date && meta.metric) {
            withMeta.push(m);
          } else {
            const yp = Number(m.yesPool || 0);
            const np = Number(m.noPool || 0);
            const total = yp + np;
            const yesPrice = total > 0 ? +(yp / total).toFixed(4) : 0.5;
            const vol = total >= 1000000 ? `$${(total / 1000000).toFixed(1)}M` : total >= 1000 ? `$${(total / 1000).toFixed(1)}K` : `$${total.toFixed(1)}`;
            withoutMeta.push({ ...m, category: '天氣', yesPrice, noPrice: +(1 - yesPrice).toFixed(4), volume: vol, traders: '0', eventCount: 1 });
          }
        });
        const groups = groupWeatherMarkets(withMeta);
        setWeatherMarkets(groups.slice(0, 6));
        setWeatherIndividuals(withoutMeta.slice(0, 3));
      })
      .catch(() => {
        setWeatherMarkets([]);
        setWeatherIndividuals([]);
        setWeatherError('天氣市場載入失敗，請稍後再試。');
      })
      .finally(() => setWeatherLoading(false));
  }, [category, weatherMarkets.length]);

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


  const filtered = markets.filter((m) => {
    const matchCat = category === '全部' || m.category === category;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredCurrentEvents = currentEventMarkets.filter((market) =>
    market.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="markets-dashboard-page">
      <div className="dashboard home-dashboard">
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

      <section id="markets" className="markets">
        <div className="section-title">
          <h2>預測市場</h2>
        </div>
        <div className="market-tabs">
          {categories.map((cat) => (
            <button key={cat} className={category === cat ? 'active' : ''} onClick={() => {
              setCategory(cat);
              if (showsCurrentEventMarkets(cat)) setCurrentEventPage(0);
            }}>
              {cat}
            </button>
          ))}
        </div>
        <div className="market-search">
          <input id="marketSearch" placeholder="搜尋市場..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button><i className="fa-solid fa-magnifying-glass"></i></button>
        </div>
        <div className="market-grid" id="marketGrid">
          {category === '天氣' && weatherLoading && (
            <p>天氣市場載入中...</p>
          )}

          {category === '天氣' && !weatherLoading && weatherError && (
            <p role="alert">{weatherError}</p>
          )}

          {category === '天氣' && !weatherLoading && !weatherError && weatherMarkets.length === 0 && weatherIndividuals.length === 0 && (
            <p>目前沒有符合條件的天氣市場。</p>
          )}

          {category === '天氣' && !weatherLoading && !weatherError &&
            weatherIndividuals.map((item) => (
              <WeatherEventCard key={item.id} group={item} />
            ))}

          {category === '天氣' && !weatherLoading && !weatherError &&
            weatherMarkets.map((group) => (
              <WeatherEventCard key={group.id} group={group} />
            ))}

          {category === CURRENT_EVENT_CATEGORY && currentEventLoading && (
            <p>時事市場載入中...</p>
          )}

          {category !== '天氣' && category !== CURRENT_EVENT_CATEGORY &&
            filtered.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}

          {category === CURRENT_EVENT_CATEGORY && !currentEventLoading && currentEventError && (
            <p role="alert">{currentEventError}</p>
          )}

          {category === CURRENT_EVENT_CATEGORY &&
            !currentEventLoading &&
            !currentEventError &&
            filteredCurrentEvents.length === 0 && (
              <p>目前沒有符合條件的時事市場。</p>
            )}

          {showsCurrentEventMarkets(category) &&
            !currentEventLoading &&
            !currentEventError &&
            filteredCurrentEvents.map((market) => (
              <CurrentEventMarketCard key={market.id} market={market} />
            ))}
        </div>

        {category === '政治' && (
          <div className="view-all-weather">
            <Link to="/markets/politics" className="view-all-weather-link">
              查看更多政治 <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>
        )}

        {category === '天氣' && (
          <div className="view-all-weather">
            <Link to="/markets/weather" className="view-all-weather-link">
              查看更多天氣 <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>
        )}

        {category === CURRENT_EVENT_CATEGORY &&
          !currentEventLoading &&
          !currentEventError &&
          currentEventPageInfo.totalPages > 1 && (
            <nav aria-label="時事市場分頁">
              <button
                type="button"
                disabled={currentEventPage === 0}
                onClick={() => setCurrentEventPage((page) => page - 1)}
              >
                上一頁
              </button>
              <span>{currentEventPage + 1} / {currentEventPageInfo.totalPages}</span>
              <button
                type="button"
                disabled={!currentEventPageInfo.hasNext}
                onClick={() => setCurrentEventPage((page) => page + 1)}
              >
                下一頁
              </button>
            </nav>
          )}
      </section>
    </div>
  );
}
