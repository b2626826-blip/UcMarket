import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMarketsByCategory } from '../../../api/marketApi';
import { groupWeatherMarkets, parseMetadata } from '../../../utils/weatherHelpers';
import WeatherEventCard from '../../../components/market/WeatherEventCard';
import heroImg from './weather-list-hero.png';
import './WeatherListPage.css';

const PAGE_SIZE = 9;

const WEATHER_HERO_LINES = [
  '賭狗們，天氣也給你們賭 !',
  '預報準？那你還在這幹嘛？',
  '別裝了，承認你就是手癢。',
  '隨便下注，輸了記得怪天不怪自己。',
  '一時看天一時爽，一直下注一直爽 !',
  '如果不拚高賠，那你還是別玩了吧 !',
  '雨下多少，賭狗說了算。',
  '看天吃飯？不，看盤吃飯。',
];

export default function WeatherListPage() {
  const [groups, setGroups] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCity, setSelectedCity] = useState('全部');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [heroLineIndex, setHeroLineIndex] = useState(0);
  const pillTrackRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroLineIndex((index) => (index + 1) % WEATHER_HERO_LINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
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
        setGroups(groupWeatherMarkets(withMeta));
        withoutMeta.sort((a, b) => (a.status === 'ACTIVE' ? 0 : 1) - (b.status === 'ACTIVE' ? 0 : 1));
        setIndividuals(withoutMeta);
      })
      .catch(() => setError('載入天氣市場失敗，請稍後再試。'))
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => {
    const s = new Set();
    groups.forEach((g) => s.add(g.city));
    return [...s].sort((a, b) => a.localeCompare(b, 'zh-TW'));
  }, [groups]);

  const pills = useMemo(() => {
    const list = ['全部'];
    if (individuals.length > 0) list.push('個人盤口');
    list.push(...cities);
    return list;
  }, [cities, individuals]);

  const updateScrollState = useCallback(() => {
    const el = pillTrackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = pillTrackRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [pills, updateScrollState]);

  const scrollPills = (dir) => {
    const el = pillTrackRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.7, 160);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const isOtherFilter = selectedCity === '個人盤口';
  const isAllFilter = selectedCity === '全部';

  const filteredGroups = useMemo(() => {
    if (isOtherFilter) return [];
    return isAllFilter ? [...groups] : groups.filter((g) => g.city === selectedCity);
  }, [groups, selectedCity, isOtherFilter, isAllFilter]);

  const showIndividuals = isAllFilter || isOtherFilter;

  const displayed = filteredGroups.slice(0, visibleCount);
  const hasMore = visibleCount < filteredGroups.length;

  const handlePillClick = (pill) => {
    setSelectedCity(pill);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="weather-list-page">
      <section className="weather-list-hero" aria-label="天氣預測市場">
        <img className="weather-list-hero__bg" src={heroImg} alt="" aria-hidden="true" />
        <div className="weather-list-hero__content">
          <h1>天氣預測市場</h1>
          <p key={heroLineIndex} className="weather-list-hero__line">
            {WEATHER_HERO_LINES[heroLineIndex]}
          </p>
        </div>
        <div className="weather-list-hero__filter">
          <div className={`weather-city-filter${canScrollLeft ? ' is-left' : ''}${canScrollRight ? ' is-right' : ''}`}>
            <button
              type="button"
              className="weather-city-filter__arrow weather-city-filter__arrow--left"
              aria-label="向左捲動篩選"
              disabled={!canScrollLeft}
              onClick={() => scrollPills(-1)}
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>

            <div className="weather-city-filter__track" ref={pillTrackRef}>
              {pills.map((pill) => (
                <button
                  key={pill}
                  className={selectedCity === pill ? 'active' : ''}
                  onClick={() => handlePillClick(pill)}
                  type="button"
                >
                  {pill}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="weather-city-filter__arrow weather-city-filter__arrow--right"
              aria-label="向右捲動篩選"
              disabled={!canScrollRight}
              onClick={() => scrollPills(1)}
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {loading && <p className="weather-list-loading">載入中...</p>}
      {error && <p className="weather-list-error">{error}</p>}

      {!loading && !error && filteredGroups.length === 0 && !showIndividuals && (
        <p className="weather-list-empty">沒有符合條件的天氣市場。</p>
      )}

      {!loading && !error && ((showIndividuals && individuals.length > 0) || displayed.length > 0) && (
        <>
          <div className="market-grid">
            {showIndividuals && individuals.map((item) => (
              <WeatherEventCard key={item.id} group={item} />
            ))}
            {displayed.map((group) => (
              <WeatherEventCard key={group.id} group={group} />
            ))}
          </div>
          {hasMore && (
            <div className="load-more-wrapper">
              <button
                className="load-more-btn"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                type="button"
              >
                載入更多
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
