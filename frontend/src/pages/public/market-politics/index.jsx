import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMarkets } from '../../../api/marketApi';
import './MarketPolitics.css';
import bannerImg from './politics-banner.jpg';

const PAGE_SIZE = 6;

const categories = [
  ['all', '全部'],
  ['election', '總統大選'],
  ['poll', '民調'],
  ['policy', '政策'],
  ['international', '國際政治'],
  ['congress', '國會'],
  ['taiwan', '台灣'],
  ['usa', '美國'],
];

const categoryKeywords = {
  election: ['選舉', '大選', '總統', '市長', '立委'],
  poll: ['民調', '支持率'],
  policy: ['政策', '法案', '立法', '降息'],
  international: ['國際', '外交', 'G7', '峰會', '制裁'],
  congress: ['國會', '立法院', '參議院', '眾議院'],
  taiwan: ['台灣', '臺灣'],
  usa: ['美國', '川普', '特朗普', 'Fed', '聯準會'],
};

const sortOptions = ['預設排序', '交易量最高', '最高價格', '最新市場'];

export default function MarketPolitics() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('預設排序');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    getMarkets({ size: 100 })
      .then((data) => {
        if (!active) return;
        const politicsMarkets = (Array.isArray(data) ? data : [])
          .filter((market) => ['政治', 'politics'].includes(String(market.category).toLowerCase()))
          .filter((market) => market.status === 'ACTIVE')
          .map(toPoliticsMarket);
        setMarkets(politicsMarkets);
      })
      .catch((error) => {
        if (active) setLoadError(error.message || '政治市場載入失敗');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredMarkets = useMemo(() => {
    let result = markets.filter((market) => {
      const matchCategory = activeCategory === 'all' || market.categories.includes(activeCategory);
      const text = `${market.title} ${market.volume} ${market.cycle}`.toLowerCase();
      return matchCategory && text.includes(search.toLowerCase());
    });

    if (sort === '交易量最高') result = [...result].sort((a, b) => b.volumeValue - a.volumeValue);
    if (sort === '最高價格') result = [...result].sort((a, b) => getHighestPrice(b) - getHighestPrice(a));
    if (sort === '最新市場') result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }, [markets, activeCategory, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleMarkets = filteredMarkets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedMarket = visibleMarkets[0] ?? filteredMarkets[0] ?? null;

  function selectCategory(category) {
    setActiveCategory(category);
    setPage(1);
  }

  return (
    <section className="politics-page">
      <div className="politics-page__hero">
        <img src={bannerImg} alt="" />
        <div>
          <span>POLITICS MARKET</span>
          <h1>政治市場</h1>
          <p>追蹤全球政策、選舉與民調事件，快速瀏覽 Yes / No 預測盤口。</p>
        </div>
      </div>

      <div className="politics-page__filters">
        <div className="politics-page__tabs" aria-label="政治市場分類">
          {categories.map(([value, label]) => (
            <button key={value} type="button" className={activeCategory === value ? 'active' : ''} onClick={() => selectCategory(value)}>
              {label}
            </button>
          ))}
        </div>

        <div className="politics-page__tools">
          <label className="politics-page__search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="search" value={search} placeholder="搜尋政治盤口" onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {sortOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>

      <div className="politics-page__layout">
        <div>
          <div className="politics-page__grid">
            {loading && <p className="politics-page__message">政治市場載入中...</p>}
            {!loading && loadError && <p className="politics-page__message error">載入失敗：{loadError}</p>}
            {!loading && !loadError && visibleMarkets.length === 0 && <p className="politics-page__message">目前沒有符合條件的政治市場</p>}
            {visibleMarkets.map((market) => (
              <article key={market.id} className="politics-card">
                <div className="politics-card__header">
                  <span><i className={market.icon}></i></span>
                  <h2>{market.title}</h2>
                </div>
                <div className="politics-card__outcomes">
                  {market.outcomes.map((outcome) => (
                    <div key={outcome.label}>
                      <span>{outcome.label}</span>
                      <strong>{outcome.percent}</strong>
                      <small>${outcome.price.toFixed(2)}</small>
                    </div>
                  ))}
                </div>
                <footer className="politics-card__footer">
                  <span>{market.volume}</span>
                  <span><i className="fa-solid fa-repeat"></i> {market.cycle}</span>
                  <Link to={`/markets/politics/${market.id}`}>查看詳情</Link>
                </footer>
              </article>
            ))}
          </div>

          <div className="politics-page__pagination">
            <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>上一頁</button>
            <span>{safePage} / {totalPages}</span>
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>下一頁</button>
          </div>
        </div>

        <aside className="politics-page__trade">
          <span>目前焦點</span>
          {selectedMarket ? (
            <>
              <h2>{selectedMarket.title}</h2>
              <div className="politics-page__trade-prices">
                <div><small>YES</small><strong>${selectedMarket.outcomes[0].price.toFixed(2)}</strong></div>
                <div><small>NO</small><strong>${selectedMarket.outcomes[1].price.toFixed(2)}</strong></div>
              </div>
              <Link to={`/markets/politics/${selectedMarket.id}`}>進入交易頁 <i className="fa-solid fa-arrow-right"></i></Link>
            </>
          ) : (
            <p>尚無可顯示的政治市場</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function toPoliticsMarket(market) {
  const yesPool = Number(market.yesPool) || 0;
  const noPool = Number(market.noPool) || 0;
  const totalPool = yesPool + noPool;
  const yesPrice = totalPool > 0 ? yesPool / totalPool : 0.5;
  const noPrice = 1 - yesPrice;
  const searchableText = `${market.title || ''} ${market.description || ''}`;
  const matchedCategories = Object.entries(categoryKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => searchableText.includes(keyword)))
    .map(([category]) => category);

  return {
    id: market.id,
    categories: matchedCategories.join(' '),
    icon: 'fa-solid fa-landmark',
    title: market.title,
    outcomes: [
      { label: 'YES', percent: `${Math.round(yesPrice * 100)}%`, price: yesPrice },
      { label: 'NO', percent: `${Math.round(noPrice * 100)}%`, price: noPrice },
    ],
    volume: `${formatCurrency(totalPool)} 流動池`,
    volumeValue: totalPool,
    cycle: formatCloseAt(market.closeAt),
    createdAt: market.createdAt,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatCloseAt(value) {
  if (!value) return '未設定截止時間';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未設定截止時間' : `${date.toLocaleDateString('zh-TW')} 截止`;
}

function getHighestPrice(market) {
  return Math.max(...market.outcomes.map((outcome) => outcome.price));
}
