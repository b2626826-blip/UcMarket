import { useState, useEffect } from 'react';
import useGlowEffect from '../../../hooks/useGlowEffect';

const initialData = [
  { name: 'MarketWolf', account: '@wolf88', market: '政治', profit: 128430, winRate: 92.8, volume: 2400000, status: '熱門' },
  { name: 'CryptoKing', account: '@btc_king', market: '加密', profit: 94280, winRate: 86.2, volume: 1800000, status: '活躍' },
  { name: 'FutureAce', account: '@futureace', market: '金融', profit: 76540, winRate: 81.5, volume: 1200000, status: '活躍' },
  { name: 'TradeNova', account: '@nova777', market: '體育', profit: 52810, winRate: 78.9, volume: 980000, status: '穩定' },
  { name: 'AlphaRoy', account: '@roy_market', market: '科技', profit: 41230, winRate: 74.6, volume: 740000, status: '熱門' },
  { name: 'DataHunter', account: '@hunter01', market: '娛樂', profit: 36900, winRate: 71.3, volume: 620000, status: '穩定' },
  { name: 'PredictionGod', account: '@god999', market: '政治', profit: 33120, winRate: 69.5, volume: 510000, status: '活躍' },
  { name: 'SmartMoney', account: '@smart888', market: '金融', profit: 28750, winRate: 68.1, volume: 470000, status: '穩定' },
];

export default function RankingsPage() {
  const [tab, setTab] = useState('總收益');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(initialData);
  useGlowEffect('.ranking-stat-card, .top-card, .ranking-table-card');

  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) => prev.map((u) => ({ ...u, profit: Math.max(0, u.profit + Math.floor(Math.random() * 2000) - 1000) })));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  function sortFn(a, b) {
    switch (tab) {
      case '勝率': return b.winRate - a.winRate;
      case '交易量': return b.volume - a.volume;
      case '本週排行': return (b.profit * 0.7 + b.winRate * 1000) - (a.profit * 0.7 + a.winRate * 1000);
      case '本月排行': return (b.profit + b.volume * 0.01) - (a.profit + a.volume * 0.01);
      default: return b.profit - a.profit;
    }
  }

  const filtered = data
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.account.toLowerCase().includes(search.toLowerCase()) || u.market.toLowerCase().includes(search.toLowerCase()))
    .sort(sortFn);

  function fmt(v) { return v.toLocaleString('en-US'); }

  const top3 = filtered.slice(0, 3);
  const medals = ['first', 'second', 'third'];

  return (
    <div>
      <div className="ranking-hero">
        <div className="badge"><i className="fa-solid fa-trophy"></i> 排行榜</div>
        <h1>頂尖交易者</h1>
        <p>看看誰是預測市場中最準確的交易者</p>
      </div>
      <div className="ranking-stats">
        {[
          { label: '總交易者', value: '8,421', sub: '+12%' },
          { label: '總收益', value: '$12.4M', sub: '+8.7%' },
          { label: '平均勝率', value: '68.3%', sub: '+2.1%' },
          { label: '總交易量', value: '$48.2M', sub: '+15.3%' },
        ].map((s) => (
          <div className="ranking-stat-card" key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
            <p>{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="ranking-section">
        <div className="top-rank-grid">
          {top3.map((u, i) => (
            <div className={`top-card ${medals[i] || ''}`} key={u.account} style={i === 0 ? { transform: 'scale(1.05)' } : undefined}>
              <div className={`rank-medal ${i === 0 ? 'gold' : ''}`}>#{i + 1}</div>
              <div className={`avatar ${i === 0 ? 'champion' : ''}`}><i className="fa-solid fa-user"></i></div>
              <h3>{u.name}</h3>
              <p>{u.account}</p>
              <p style={{ fontSize: 13 }}>{u.market}</p>
              <strong className="green" style={{ fontSize: 22 }}>+${fmt(u.profit)}</strong>
              <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>勝率 {u.winRate}% | Vol ${fmt(u.volume)}</p>
            </div>
          ))}
        </div>
        <div className="ranking-tabs">
          {['總收益', '勝率', '交易量', '本週排行', '本月排行'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="ranking-table-card">
          <div className="table-header">
            <h3>交易者排行</h3>
            <div className="table-search">
              <input id="rankingSearch" placeholder="搜尋交易者..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button><i className="fa-solid fa-search"></i></button>
            </div>
          </div>
          <div className="ranking-table" id="rankingTable">
            <div className="ranking-row table-title">
              <span>排名</span><span>使用者</span><span>主要市場</span><span>收益</span><span>勝率</span><span>交易量</span><span>狀態</span>
            </div>
            {filtered.map((u, i) => (
              <div className="ranking-row" key={u.account}>
                <span className="rank-number">#{i + 1}</span>
                <span className="user-info"><b>{u.name}</b><small>{u.account}</small></span>
                <span>{u.market}</span>
                <span className="green">+${fmt(u.profit)}</span>
                <span>{u.winRate}%</span>
                <span>${fmt(u.volume)}</span>
                <span className={`status ${u.status === '熱門' ? 'hot' : u.status === '活躍' ? 'active-status' : 'normal'}`}>{u.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
