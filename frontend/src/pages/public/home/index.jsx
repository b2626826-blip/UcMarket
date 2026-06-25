import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import MarketCard from '../../../components/market/MarketCard';
import useGlowEffect from '../../../hooks/useGlowEffect';

const heroSlides = [
  { badge: '熱門市場', title: '預測未來', text: '透過市場價格反映真實世界機率', primary: '開始交易', secondary: '查看市場' },
  { badge: '加密市場', title: 'BTC 200K', text: '預測比特幣是否突破歷史新高', primary: '立即參與', secondary: '查看走勢' },
  { badge: '政治市場', title: '美國大選', text: '即時追蹤全球政治預測市場', primary: '查看盤口', secondary: '了解玩法' },
];

const initialMarkets = [
  { id: 1, category: '金融', title: 'WTI 原油在 2026 年 5 月收盤是否會高過 55？', date: '2026 年 5 月', yesPrice: 0.55, noPrice: 0.45, volume: '$2.3M', traders: '1,243' },
  { id: 2, category: '金融', title: '美國債務上限是否會被永久取消？', date: '2026 年', yesPrice: 0.41, noPrice: 0.59, volume: '$8.7M', traders: '4,820' },
  { id: 3, category: '加密', title: 'BTC 是否會在 2027 年前突破 200K？', date: '2027 年', yesPrice: 0.72, noPrice: 0.28, volume: '$12.4M', traders: '8,921' },
  { id: 4, category: '政治', title: '共和黨是否會贏得下一屆美國總統大選？', date: '2028 年 11 月', yesPrice: 0.61, noPrice: 0.39, volume: '$5.8M', traders: '4,451' },
  { id: 5, category: '體育', title: '湖人是否能拿下 NBA 總冠軍？', date: '2027 賽季', yesPrice: 0.44, noPrice: 0.56, volume: '$3.2M', traders: '3,211' },
  { id: 6, category: '科技', title: 'AI 公司是否會在今年創下新 IPO 紀錄？', date: '2026 年', yesPrice: 0.68, noPrice: 0.32, volume: '$4.9M', traders: '2,987' },
  { id: 7, category: '娛樂', title: '年度票房冠軍是否會突破 20 億美元？', date: '2026 年', yesPrice: 0.36, noPrice: 0.64, volume: '$1.6M', traders: '1,042' },
  { id: 8, category: '加密', title: 'Ethereum 是否會在年底突破 10,000？', date: '2026 年底', yesPrice: 0.49, noPrice: 0.51, volume: '$6.1M', traders: '5,604' },
  { id: 9, category: '金融', title: '美國 Fed 是否會在今年降息兩次以上？', date: '2026 年', yesPrice: 0.57, noPrice: 0.43, volume: '$9.5M', traders: '6,892' },
];

const categories = ['全部', '金融', '加密', '政治', '體育', '科技', '娛樂'];

export default function HomePage() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState(initialMarkets);
  const [taipeiTime, setTaipeiTime] = useState('');
  const chartRef = useRef(null);
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
    setTaipeiTime(new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setTaipeiTime(new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
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

  useEffect(() => {
    const canvas = document.getElementById('marketChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(217, 170, 67, 0.35)');
    gradient.addColorStop(1, 'rgba(217, 170, 67, 0)');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
        datasets: [
          { label: 'Yes 價格', data: [42,45,47,51,58,62,60,65,68,72,70,75], borderColor: '#d9aa43', backgroundColor: gradient, fill: true, tension: 0.45, borderWidth: 3, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#d9aa43' },
          { label: 'No 價格', data: [58,55,53,49,42,38,40,35,32,28,30,25], borderColor: '#00d66f', backgroundColor: 'transparent', fill: false, tension: 0.45, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#00d66f' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111', titleColor: '#fff', bodyColor: '#d9aa43', borderColor: 'rgba(217,170,67,.35)', borderWidth: 1, padding: 12 } },
        scales: { x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.04)' } }, y: { min: 0, max: 100, ticks: { color: '#888', callback: function(v) { return v + '%'; } }, grid: { color: 'rgba(255,255,255,.06)' } } }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, []);

  const filtered = markets.filter((m) => {
    const matchCat = category === '全部' || m.category === category;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
        <div className="chart-card">
          <div className="chart-title">
            <div className="chart-icon"><i className="fa-solid fa-chart-line"></i></div>
            <div>
              <h2>市場趨勢</h2>
              <p>即時預測價格走勢</p>
            </div>
          </div>
          <div className="chart-labels">
            <span className="yes-dot"><i className="fa-solid fa-circle"></i> Yes 價格</span>
            <span className="no-dot"><i className="fa-solid fa-circle"></i> No 價格</span>
          </div>
          <div className="chart-container">
            <canvas id="marketChart"></canvas>
          </div>
          <div className="chart-time">
            <span>台北時間 (UTC+8)</span>
            <strong id="taipeiTime">{taipeiTime || '--'}</strong>
          </div>
        </div>
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
          {filtered.map((m) => (
            <MarketCard key={m.id} market={m} onClickTrade={handleTrade} />
          ))}
        </div>
      </section>
    </div>
  );
}
