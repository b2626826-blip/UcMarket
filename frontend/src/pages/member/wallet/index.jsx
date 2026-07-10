import { useState, Fragment, useEffect } from 'react';
import styles from './test.module.css';
import { useTrendChart } from './templates/trend/useTrendChart';   // 走勢圖 Chart.js 邏輯(hook)
import PetalAlloc from './templates/alloc/PetalAlloc';               // 葉片圖(定版純圖元件)
import useGlowEffect from '../../../hooks/useGlowEffect';            // 卡片滑鼠金色光暈
import useWalletStore from '../../../store/walletStore'

// ══════════════════════════════════════════════════════════════════
// 錢包頁 · 組裝【單頁 · CSS 全集中在 test.module.css】  網址 /wallet-preview/edit
//   ● 餘額 / 走勢 / 熱力 / 流水:markup 都寫在本檔,樣式全在 test.module.css
//       → 要調任何字/大小,通通去 test.module.css 找對應區塊(.balCard / .trend / .heat / .flow)
//   ● 重邏輯抽成 hook(不塞頁面):走勢 useTrendChart、葉片 usePetalAlloc
//   ↕ 想跟「CSS 分散」比較 → 看 A 版:/wallet-preview/test/a
// ══════════════════════════════════════════════════════════════════

// ── 熱力圖假資料(原 HeatWave 的產格子邏輯,搬進這頁)──
const HEAT_WEEKS = 21;
const HEAT_GOLD = [
  'var(--color-surface-low)',                                       // L0 無交易(最暗)
  'color-mix(in srgb, var(--gold) 30%, var(--color-surface-low))',  // L1
  'color-mix(in srgb, var(--gold) 60%, var(--color-surface-low))',  // L2
  'var(--gold)',                                                    // L3
  'var(--color-primary)',                                           // L4 最亮
];
const HEAT_MONTHS = ['2月', '', '', '', '3月', '', '', '', '', '4月', '', '', '', '5月', '', '', '', '6月', '', '', ''];
const HEAT_MAXSUM = (HEAT_WEEKS - 1) + 6;
const HEAT_CELLS = [];
const heatMonthActive = {};                      // 每月活躍格數
const heatWeekday = [0, 0, 0, 0, 0, 0, 0];        // 每星期幾(d:0=日…6=六)的資金總額
let heatActiveDays = 0, heatMaxDaily = 0, heatCurMonth = '';
for (let w = 0; w < HEAT_WEEKS; w++) {
  if (HEAT_MONTHS[w]) heatCurMonth = HEAT_MONTHS[w];   // 這週落在哪個月
  for (let d = 0; d < 7; d++) {
    const raw = Math.sin(w * 1.3 + d * 0.7) + Math.cos(w * 0.5 - d * 1.1);
    const norm = Math.abs(raw);                                   // 0 ~ ~2
    // 門檻 1.0:norm < 1.0 視為無交易(讓活躍天數更真實、不會天天有進出)
    const L = norm < 1.0 ? 0 : Math.min(4, 1 + Math.floor(Math.min(1, (norm - 1.0) / 1.0) * 4));
    const amt = L === 0 ? 0 : (L * 1300 + ((w * 7 + d) % 6) * 180);
    const title = L === 0 ? '無交易' : '現金進出 $' + amt.toLocaleString();
    HEAT_CELLS.push({ bg: HEAT_GOLD[L], delay: ((w + d) - HEAT_MAXSUM) * 0.09, title });
    if (L > 0) { heatActiveDays++; heatMonthActive[heatCurMonth] = (heatMonthActive[heatCurMonth] || 0) + 1; heatWeekday[d] += amt; }
    if (amt > heatMaxDaily) heatMaxDaily = amt;
  }
}
// 熱力圖小統計(填熱力卡下方空白):活躍天數 / 最活躍月 / 最高單日
const HEAT_TOP_MONTH = Object.keys(heatMonthActive).reduce((a, b) => (heatMonthActive[b] > (heatMonthActive[a] || 0) ? b : a), '2月');
const HEAT_STATS = [
  { label: '活躍天數', value: heatActiveDays + ' 天' },
  { label: '最活躍月', value: HEAT_TOP_MONTH },
  { label: '最高單日', value: '$' + heatMaxDaily.toLocaleString() },
];

// 週間資金活躍占比:依星期幾彙總熱力圖金額 → 傳給風扇圖(排成 週一~週日)
const WD_TOTAL = heatWeekday.reduce((s, v) => s + v, 0) || 1;
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];   // 熱力 d:0=日/1=一…6=六 → 一~日
const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKDAY_FILLS = WEEKDAY_ORDER.map((d) => Math.round((heatWeekday[d] / WD_TOTAL) * 100));

// ── 流水假資料(原 FlowStyleGold 的,搬進這頁)──
const FLOW_OPENING = 113120;
const FLOW_RAW = [
  { d: '2026-06-12', time: '08:30', t: '買入', tag: 'buy', amount: -2400, ref: 'TXN-0612A', note: '市場:台積電漲?' },
  { d: '2026-06-15', time: '11:20', t: '賣出', tag: 'sell', amount: 1500, ref: 'TXN-0615B', note: '市場:Fed 降息?' },
  { d: '2026-06-18', time: '10:05', t: '結算', tag: 'settle', amount: 3210, ref: 'TXN-0618C', note: '市場結算入帳' },
  { d: '2026-06-20', time: '16:20', t: '買入', tag: 'buy', amount: -800, ref: 'TXN-0620D', note: '市場:油價破百?' },
  { d: '2026-06-22', time: '09:45', t: '賣出', tag: 'sell', amount: 2000, ref: 'TXN-0622E', note: '市場:颱風假?' },
  { d: '2026-06-23', time: '12:10', t: '買入', tag: 'buy', amount: -1200, ref: 'TXN-0623F', note: '市場:金價新高?' },
  { d: '2026-06-23', time: '14:32', t: '結算', tag: 'settle', amount: 5000, ref: 'TXN-0623G', note: '市場結算入帳' },
  { d: '2026-06-25', time: '11:05', t: '賣出', tag: 'sell', amount: 2600, ref: 'TXN-0625H', note: '市場:世足冠軍?' },
  { d: '2026-06-27', time: '15:40', t: '買入', tag: 'buy', amount: -1800, ref: 'TXN-0627I', note: '市場:BTC 破十萬?' },
  { d: '2026-06-28', time: '09:12', t: '結算', tag: 'settle', amount: 4200, ref: 'TXN-0628J', note: '市場結算入帳' },
];
const FLOW_TODAY = '2026-06-30';
const flowAddDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default function WalletPage() {
  const balance = useWalletStore((s) => s.balance);          // 【A】拿餘額,用 const 接住,之後才叫得出 balance
  const fetchWallet = useWalletStore((s) => s.fetchWallet);  // 【B】拿「抓取動作」這個工具
  useEffect(() => {
    fetchWallet();   // 【C】頁面一出現,就去後端抓一次餘額
  }, []);            //     空陣列 = 只在第一次載入時做（不加會無限迴圈）

  // 餘額卡 KPI(對齊下方流水的期間統計,避免同頁數字矛盾)
  const kpi = [
    { label: '本月流入', value: '+$18,510', cls: 'pos' },
    { label: '本月流出', value: '-$6,200', cls: 'neg' },
    { label: '淨額', value: '+$12,310', cls: 'pos' },
    { label: '交易筆數', value: '10', cls: '' },
  ];

  const trend = useTrendChart();   // 走勢圖:canvasRef + 期初基準開關 + 上方大數字要顯示的值
  useGlowEffect('.glowcard');      // 所有卡片的滑鼠金色光暈(還原原版)

  // ── 流水查詢:狀態 + 計算 ──
  let bal = FLOW_OPENING;
  const ledger = FLOW_RAW.map((r) => { bal += r.amount; return { ...r, balance: bal }; });
  const closing = bal;
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('2026-06-01');
  const [to, setTo] = useState('2026-06-30');
  const [q, setQ] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [perPage, setPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const flowTabs = [['all', '全部'], ['buy', '登入送點'], ['sell', '賣出'], ['settle', '結算']];
  const flowPresets = [
    ['近7天', () => { setFrom(flowAddDays(FLOW_TODAY, -6)); setTo(FLOW_TODAY); }],
    ['本月', () => { setFrom(FLOW_TODAY.slice(0, 7) + '-01'); setTo(FLOW_TODAY); }],
    ['全部', () => { setFrom(''); setTo(''); }],
  ];
  const hit = ledger.filter((r) =>
    (type === 'all' || r.tag === type) &&
    (from === '' || r.d >= from) &&
    (to === '' || r.d <= to) &&
    (q === '' || (r.d + ' ' + r.time).includes(q) || String(Math.abs(r.amount)).includes(q))
  );
  const rows = [...hit].reverse();
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = rows.slice((curPage - 1) * perPage, curPage * perPage);
  const firstNo = rows.length === 0 ? 0 : (curPage - 1) * perPage + 1;
  const lastNo = Math.min(curPage * perPage, rows.length);
  const inflow = hit.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const outflow = hit.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);
  const money = (n) => '$' + Math.abs(n).toLocaleString();
  function exportCSV() {
    const head = ['日期', '時間', '類型', '金額', '結餘'];
    const body = rows.map((r) => [r.d, r.time, r.t, r.amount, r.balance].join(','));
    const csv = '﻿' + [head.join(','), ...body].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `對帳單_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>

      {/* 頁面標題 */}
      <div className={styles.title}>
        <h1>錢包</h1>
      </div>

      {/* ═══ 區塊1 餘額卡 ═══ */}
      <section className={`${styles.balCard} glowcard`}>
        <span className={styles.balLabel}>可用現金</span>
        <span className={styles.balNum}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <div className={styles.kpi}>
          {kpi.map((k) => (
            <div className={styles.kpiCell} key={k.label}>
              <p className={styles.kpiLabel}>{k.label}</p>
              <strong className={`${styles.kpiVal} ${styles[k.cls] || ''}`}>{k.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 區塊2 現金走勢圖(邏輯在 useTrendChart;字/大小改 test.module.css 的 .trend)═══ */}
      <section className={styles.section}>
        <div className={styles.trend}>
          <div className="card glowcard">
            <div className="head">
              <div>
                <span className="label">現金走勢</span>
                <div className="val">${trend.shownValue.toLocaleString()}</div>
                <div className="meta">
                  <span className={`chg ${trend.up ? 'up' : 'down'}`}>{trend.up ? '▲ +' : '▼ −'}${Math.abs(trend.diff).toLocaleString()} ({Math.abs(trend.pct)}%) 較期初</span>
                  <span className="date">{trend.dateLabel}</span>
                </div>
              </div>
              <button className={`toggle ${trend.baseOn ? 'on' : ''}`} onClick={() => trend.setBaseOn((v) => !v)}>
                期初基準:{trend.baseOn ? '開' : '關'}
              </button>
            </div>
            <div className="box"><canvas ref={trend.canvasRef}></canvas></div>
            {trend.baseOn && (
              <div className="legend">
                <span><i className="sw-green"></i>高於期初</span>
                <span style={{ marginLeft: 14 }}><i className="sw-red"></i>低於期初</span>
                <span style={{ marginLeft: 14 }}>虛線 = 期初 ${trend.base.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ 區塊3 分析排:二左 熱力圖(大)/ 二右 葉片圖(小)· 黃金比例 1.618:1 ═══ */}
      <section className={`${styles.section} ${styles.row}`}>
        <div>
          <div className={styles.heat}>
            <div className="panel glowcard">
              <h3>資金活躍度</h3>
              <div className="months">{HEAT_MONTHS.map((m, i) => <span key={i}>{m}</span>)}</div>
              <div className="chart">
                <div className="days"><span /><span>一</span><span /><span>三</span><span /><span>五</span><span /></div>
                <div className="grid">
                  {HEAT_CELLS.map((c, i) => (
                    <div className={styles.cell} key={i} style={{ background: c.bg, animationDelay: `${c.delay}s` }} title={c.title} />
                  ))}
                </div>
              </div>
              <div className="stats">
                {HEAT_STATS.map((s) => (
                  <div className="stat" key={s.label}>
                    <span>{s.label}</span>
                    <strong>{s.value}</strong>
                  </div>
                ))}
              </div>
              <div className="legend">少 {HEAT_GOLD.map((c, i) => <i key={i} style={{ background: c }} />)} 多</div>
            </div>
          </div>
        </div>
        <div><PetalAlloc names={WEEKDAY_NAMES} fills={WEEKDAY_FILLS} title="歷史週一至週日每日流量比" /></div>
      </section>

      {/* ═══ 區塊4 資金流水查詢(字/大小改 test.module.css 的 .flow)═══ */}
      <section className={styles.section}>
        <div className={styles.flow}>
          <div className="head">
            <div>
              <h1>資金明細查詢</h1>
            </div>
          </div>

          <div className="card glowcard">
            {/* 篩選列 */}
            <div className="bar">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="arrow">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <div className="presets">
                {flowPresets.map(([label, fn]) => (
                  <button key={label} onClick={fn}>{label}</button>
                ))}
              </div>

              <input className="search" type="text" placeholder="搜尋金額或日期" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="csv" onClick={exportCSV}>⤓ 匯出 CSV</button>
            </div>
            <div>
              <div className="tabs">
                {flowTabs.map(([k, l]) => (
                  <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>
                ))}
              </div>
            </div>

            {/* KPI */}
            <div className="kpi">
              <div><div className="k">期間流入</div><div className="v serif" style={{ color: 'var(--color-green)' }}>+{money(inflow)}</div></div>
              <div><div className="k">期間流出</div><div className="v serif" style={{ color: 'var(--color-red)' }}>−{money(outflow)}</div></div>
              <div><div className="k">淨額</div><div className="v serif" style={{ color: 'var(--gd)' }}>{inflow - outflow < 0 ? '−' : '+'}{money(inflow - outflow)}</div></div>
              <div><div className="k">筆數</div><div className="v serif">{hit.length}</div></div>
            </div>

            {/* 帳表 */}
            <table>
              <thead>
                <tr><th>日期</th><th>摘要</th><th>支出</th><th>收入</th><th>結餘</th></tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <Fragment key={r.ref}>
                    <tr className="row" onClick={() => setOpenRow(openRow === r.ref ? null : r.ref)}>
                      <td className="date">{r.d.slice(5).replace('-', '/')} {r.time}</td>
                      <td><span className={`tag ${r.tag}`}>{r.t}</span></td>
                      <td className={r.amount < 0 ? 'out' : 'muted'}>{r.amount < 0 ? '−' + money(r.amount) : '—'}</td>
                      <td className={r.amount > 0 ? 'in' : 'muted'}>{r.amount > 0 ? '+' + money(r.amount) : '—'}</td>
                      <td className="balcol serif">{money(r.balance)}</td>
                    </tr>
                    {openRow === r.ref && (
                      <tr className="detail">
                        <td colSpan="5">
                          <div className="box">
                            <span>交易編號<b>{r.ref}</b></span>
                            <span>完整時間<b>{r.d} {r.time}</b></span>
                            <span>說明<b>{r.note}</b></span>
                            <span>狀態<b style={{ color: 'var(--color-green)' }}>已完成</b></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {rows.length === 0 && <tr><td colSpan="5" className="empty">查無資料</td></tr>}
              </tbody>
            </table>

            <div className="foot">
              <span>顯示 <b className="serif" style={{ color: 'var(--gd)' }}>{firstNo}–{lastNo}</b> / 共 {rows.length} 筆</span>
              <div className="pager">
                <label>每頁
                  <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  筆
                </label>
                <button disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>‹ 上一頁</button>
                <span className="pageno">第 <b className="serif" style={{ color: 'var(--gd)' }}>{curPage}</b> / {totalPages} 頁</span>
                <button disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>下一頁 ›</button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
