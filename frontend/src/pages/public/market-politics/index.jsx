import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './MarketPolitics.css';
import bannerImg from './politics-banner.jpg';

const PAGE_SIZE = 6;

const markets = [
  {
    id: 1,
    categories: 'election usa',
    icon: 'fa-solid fa-landmark',
    title: '2028 美國總統大選，共和黨會勝選嗎？',
    outcomes: [
      { label: 'YES 勝選', percent: '64%', price: 0.64 },
      { label: 'NO 未勝選', percent: '36%', price: 0.36 },
    ],
    volume: '$12M 交易量',
    volumeValue: 12000000,
    cycle: '每週',
  },
  {
    id: 2,
    categories: 'policy usa',
    icon: 'fa-solid fa-flag-usa',
    title: '聯儲局今年會降息幾次？',
    outcomes: [
      { label: '0 次', percent: '28%', price: 0.28 },
      { label: '1 次以上', percent: '72%', price: 0.72 },
    ],
    volume: '$40M 交易量',
    volumeValue: 40000000,
    cycle: '每月',
  },
  {
    id: 3,
    categories: 'election taiwan',
    icon: 'fa-solid fa-building-columns',
    title: '台灣 2028 總統大選，執政黨會連任嗎？',
    outcomes: [
      { label: '會連任', percent: '57%', price: 0.57 },
      { label: '不會連任', percent: '43%', price: 0.43 },
    ],
    volume: '$8M 交易量',
    volumeValue: 8000000,
    cycle: '每週',
  },
  {
    id: 4,
    categories: 'international policy',
    icon: 'fa-solid fa-earth-asia',
    title: 'G7 峰會是否會發布新的共同制裁聲明？',
    outcomes: [
      { label: '會發布', percent: '61%', price: 0.61 },
      { label: '不會發布', percent: '39%', price: 0.39 },
    ],
    volume: '$3M 交易量',
    volumeValue: 3000000,
    cycle: '每日',
  },
  {
    id: 5,
    categories: 'congress policy usa',
    icon: 'fa-solid fa-scale-balanced',
    title: '美國最高法院今年是否會推翻重大政策？',
    outcomes: [
      { label: '會', percent: '48%', price: 0.48 },
      { label: '不會', percent: '52%', price: 0.52 },
    ],
    volume: '$6M 交易量',
    volumeValue: 6000000,
    cycle: '每月',
  },
  {
    id: 6,
    categories: 'poll election',
    icon: 'fa-solid fa-newspaper',
    title: '下次總統辯論是否會出現民調大幅反轉？',
    outcomes: [
      { label: '會反轉', percent: '33%', price: 0.33 },
      { label: '不會反轉', percent: '67%', price: 0.67 },
    ],
    volume: '$980K 交易量',
    volumeValue: 980000,
    cycle: '每日',
  },
];

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

const sortOptions = ['預設排序', '交易量最高', '最高價格', '最新市場'];

export default function MarketPolitics() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('預設排序');
  const [page, setPage] = useState(1);

  const filteredMarkets = useMemo(() => {
    let result = markets.filter((market) => {
      const matchCategory = activeCategory === 'all' || market.categories.includes(activeCategory);
      const text = `${market.title} ${market.volume} ${market.cycle}`.toLowerCase();
      return matchCategory && text.includes(search.toLowerCase());
    });

    if (sort === '交易量最高') result = [...result].sort((a, b) => b.volumeValue - a.volumeValue);
    if (sort === '最高價格') {
      result = [...result].sort((a, b) => getHighestPrice(b) - getHighestPrice(a));
    }
    if (sort === '最新市場') result = [...result].reverse();

    return result;
  }, [activeCategory, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleMarkets = filteredMarkets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedMarket = visibleMarkets[0] ?? markets[0];
  const selectedPrice = selectedMarket.outcomes[0].price;

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
            <button
              key={value}
              type="button"
              className={activeCategory === value ? 'active' : ''}
              onClick={() => selectCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="politics-page__tools">
          <label className="politics-page__search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="search"
              value={search}
              placeholder="搜尋政治盤口"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="politics-page__layout">
        <div>
          <div className="politics-page__grid">
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
            <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
              上一頁
            </button>
            <span>{safePage} / {totalPages}</span>
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
              下一頁
            </button>
          </div>
        </div>

        <aside className="politics-page__trade">
          <span>目前焦點</span>
          <h2>{selectedMarket.title}</h2>
          <div className="politics-page__trade-prices">
            <div>
              <small>YES</small>
              <strong>${selectedPrice.toFixed(2)}</strong>
            </div>
            <div>
              <small>NO</small>
              <strong>${(1 - selectedPrice).toFixed(2)}</strong>
            </div>
          </div>
          <Link to={`/markets/politics/${selectedMarket.id}`}>
            進入交易頁 <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </aside>
      </div>
    </section>
  );
}

function getHighestPrice(market) {
  return Math.max(...market.outcomes.map((outcome) => outcome.price));
}
