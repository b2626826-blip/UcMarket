import { useState, Fragment, useEffect, useMemo } from 'react';
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

// ── 熱力圖:每格=一個真實日曆日,顏色=那天資金進出濃淡(在元件內從真流水算)──
const HEAT_WEEKS = 21;                    // 21 欄(週)× 7 列(星期,日→六)
const HEAT_GOLD = [
  'var(--color-surface-low)',                                       // L0 無交易(最暗)
  'color-mix(in srgb, var(--gold) 18%, var(--color-surface-low))',  // L1
  'color-mix(in srgb, var(--gold) 34%, var(--color-surface-low))',  // L2
  'color-mix(in srgb, var(--gold) 52%, var(--color-surface-low))',  // L3
  'color-mix(in srgb, var(--gold) 74%, var(--color-surface-low))',  // L4
  'var(--color-primary)',                                           // L5
  '#ffe6a3',                                                        // L6 最亮(比 primary 再亮一階)
];
const HEAT_MAXSUM = (HEAT_WEEKS - 1) + 6;   // 波浪動畫延遲用

// 週間資金活躍占比:改在元件內從「真流水」依星期幾加總(見下方 weekdayFills)
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];   // JS getDay:0=日/1=一…6=六 → 排成 一~日
const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

// 走勢圖時間範圍按鈕:[key, 標籤, 天數(null=全部)]
const TREND_RANGES = [['7', '一周', 7], ['30', '一月', 30], ['90', '一季', 90], ['180', '半年', 180], ['365', '一年', 365], ['all', '全部', null]];

// 本地日期字串 "YYYY-MM-DD"。全站日期一律「本地時間」——後端 createdAt 存的就是本機本地時間(LocalDateTime),不能當 UTC。
const pad2 = (n) => String(n).padStart(2, '0');
const ymdLocal = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

// type → 中文 + tag 對照表(查一次就好)
const TX_TYPE = {
  TRADE_BUY:         { t: '買入',     tag: 'buy' },
  TRADE_SELL:        { t: '賣出',     tag: 'sell' },
  RESOLUTION_PAYOUT: { t: '結算派彩', tag: 'settle' },
  SIGNUP_BONUS:      { t: '登入送點', tag: 'bonus' },
  BONUS:             { t: '獎勵',     tag: 'bonus' },
  REFUND:            { t: '退款',     tag: 'refund' },
  ADJUSTMENT:        { t: '調整',     tag: 'adjust' },
};

// 後端一筆 → 你的 row 形狀(欄位名跟原本 FLOW_RAW 一模一樣)
function mapTx(tx) {
  const [date, time] = tx.createdAt.split('T');           // "2026-06-23T14:32:00" → ["2026-06-23","14:32:00"]
  const info = TX_TYPE[tx.type] || { t: tx.type, tag: '' }; // 查表;查不到就用原始 type
  return {
    d: date,
    time: time.slice(0, 5),      // 取前 5 碼 → "14:32"
    t: info.t,
    tag: info.tag,
    amount: Number(tx.amount),   // 後端已帶正負,直接用(包 Number 防被序列化成字串)
    balance: tx.balanceAfter,    // 結餘用後端的
    ref: tx.id,
    note: tx.referenceType || '',
  };
}
export default function WalletPage() {
  const balance = useWalletStore((s) => s.balance);          // 【A】拿餘額,用 const 接住,之後才叫得出 balance
  const fetchWallet = useWalletStore((s) => s.fetchWallet);  // 【B】拿「抓取動作」這個工具
  const transactions      = useWalletStore((s) => s.transactions);
  const fetchTransactions = useWalletStore((s) => s.fetchTransactions);
  useEffect(() => {
    fetchWallet();   // 【C】頁面一出現,就去後端抓一次餘額
    fetchTransactions();
  }, []);            //     空陣列 = 只在第一次載入時做（不加會無限迴圈）

  // 走勢圖資料:每筆交易 → {x:時間戳, y:結餘},依時間排序
  // (useMemo:只在 transactions 變時重算 → 圖表不會每次 render 都重建)
  const trendPoints = useMemo(() =>
    transactions
      .map((tx) => ({ x: new Date(tx.createdAt).getTime(), y: Number(tx.balanceAfter) }))   // 本地解讀(不加 'Z')
      .sort((a, b) => a.x - b.x)
  , [transactions]);
  // 走勢圖 · 逐日聚合:每天一點 = 當日收盤結餘(沒交易的日子沿用前一天)。
  //   餘額是「連續狀態」→ 每天都有值、時間軸等距;不需要「每筆 + 錨點」那套特殊處理。
  const [trendRange, setTrendRange] = useState('all');
  const trendSpanDays = trendPoints.length ? (Date.now() - trendPoints[0].x) / 86400000 : 0;
  const dailyPoints = useMemo(() => {
    if (!trendPoints.length) return [];
    const DAY = 86400000, nowMs = Date.now();
    const t = new Date(nowMs);
    const todayDay = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();   // 本地今天 00:00
    // 範圍起點(對齊到日):全部 → 第一筆那天;其他 → 今天往回 range-1 天
    let startDay;
    if (trendRange === 'all') {
      const f = new Date(trendPoints[0].x);
      startDay = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
    } else {
      startDay = todayDay - (Number(trendRange) - 1) * DAY;
    }
    // 逐日走:ti 單向前進吃掉「當日結束前」的交易 → bal 就是當日收盤(空日自動沿用)
    const out = [];
    let ti = 0, bal = 0;
    for (let day = startDay; day <= todayDay; day += DAY) {
      while (ti < trendPoints.length && trendPoints[ti].x < day + DAY) { bal = trendPoints[ti].y; ti++; }
      out.push({ x: day, y: bal });
    }
    return out;
  }, [trendPoints, trendRange]);
  const trend = useTrendChart(dailyPoints);   // 走勢圖(逐日聚合)
  useGlowEffect('.glowcard');      // 所有卡片的滑鼠金色光暈(還原原版)

  // ── 流水查詢:狀態 + 計算 ──
  const ledger = transactions.map(mapTx);

  // 餘額卡 KPI:從真流水算「本月」(今天所在月份)流入/流出/淨額/筆數
  const thisMonth = ymdLocal(new Date()).slice(0, 7);             // 本地本月 "2026-07"
  const monthTx = ledger.filter((r) => r.d.startsWith(thisMonth));
  const monthIn = monthTx.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const monthOut = monthTx.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);
  const monthNet = monthIn - monthOut;
  const kpi = [
    { label: '本月流入', value: '+$' + monthIn.toLocaleString(), cls: 'pos' },
    { label: '本月流出', value: '−$' + monthOut.toLocaleString(), cls: 'neg' },
    { label: '淨額', value: (monthNet < 0 ? '−' : '+') + '$' + Math.abs(monthNet).toLocaleString(), cls: monthNet < 0 ? 'neg' : 'pos' },
    { label: '交易筆數', value: String(monthTx.length), cls: '' },
  ];

  // 週間資金活躍占比:從真流水依「星期幾」加總 |amount|(取代原本假熱力推導)
  const wdSum = [0, 0, 0, 0, 0, 0, 0];   // 0=日 … 6=六
  ledger.forEach((r) => { wdSum[new Date(r.d + 'T00:00:00').getDay()] += Math.abs(r.amount); });
  const wdTotal = wdSum.reduce((s, v) => s + v, 0) || 1;
  const weekdayFills = WEEKDAY_ORDER.map((d) => Math.round((wdSum[d] / wdTotal) * 100));

  // ── 熱力圖(真資料):尾端對齊今天、往回 147 天;每格=一天、顏色=那天資金進出濃淡 ──
  const MS_DAY = 86400000;
  const heatDayAmt = {};                  // "YYYY-MM-DD" → 當天 |amount| 加總
  ledger.forEach((r) => { heatDayAmt[r.d] = (heatDayAmt[r.d] || 0) + Math.abs(r.amount); });
  // 對比用「穩健參考值」= 有交易日金額的第 85 百分位。
  //   (除以「原始最大值」會被 outlier 壓扁 → 一堆同色;未來來一筆超大流水更會把大家壓暗、那格變太陽)
  const heatAmts = Object.values(heatDayAmt).filter((v) => v > 0).sort((a, b) => a - b);
  const heatRef = Math.max(1, heatAmts.length ? (heatAmts[Math.floor(heatAmts.length * 0.85)] ?? heatAmts[heatAmts.length - 1]) : 1);
  const HEAT_TOP = HEAT_GOLD.length - 1;   // 最高級數(隨色階數量自動變)
  const heatNow = new Date();
  const heatTodayMs = new Date(heatNow.getFullYear(), heatNow.getMonth(), heatNow.getDate()).getTime();   // 本地今天 00:00
  // 最右欄=今天所在的週;往回 (21-1) 週 → 最左欄的週日
  const heatFirstSunday = heatTodayMs - new Date(heatTodayMs).getDay() * MS_DAY - (HEAT_WEEKS - 1) * 7 * MS_DAY;
  const heatCells = [];
  const heatMonths = [];
  const heatMonthActive = {};
  let heatActiveDays = 0, heatMaxDaily = 0, heatPrevMonth = -1;
  for (let c = 0; c < HEAT_WEEKS; c++) {
    const colMonth = new Date(heatFirstSunday + c * 7 * MS_DAY).getMonth();
    heatMonths.push(colMonth !== heatPrevMonth ? (colMonth + 1) + '月' : '');
    heatPrevMonth = colMonth;
    for (let d = 0; d < 7; d++) {
      const cellMs = heatFirstSunday + (c * 7 + d) * MS_DAY;
      const ds = ymdLocal(new Date(cellMs));
      const future = cellMs > heatTodayMs;
      const amt = future ? 0 : (heatDayAmt[ds] || 0);   // 未來的格子留空
      const L = amt === 0 ? 0 : Math.min(HEAT_TOP, 1 + Math.floor((amt / heatRef) * HEAT_TOP));
      const title = future ? '' : (amt === 0 ? ds + ' 無交易' : ds + ' 現金進出 $' + amt.toLocaleString());
      heatCells.push({ bg: HEAT_GOLD[L], delay: ((c + d) - HEAT_MAXSUM) * 0.09, title, ds, amt, future });
      if (amt > 0) {
        heatActiveDays++;
        const mk = (new Date(cellMs).getMonth() + 1) + '月';
        heatMonthActive[mk] = (heatMonthActive[mk] || 0) + 1;
        if (amt > heatMaxDaily) heatMaxDaily = amt;
      }
    }
  }
  const heatTopMonth = Object.keys(heatMonthActive).reduce((a, b) => (heatMonthActive[b] > (heatMonthActive[a] || 0) ? b : a), '—');
  const heatStats = [
    { label: '活躍天數', value: heatActiveDays + ' 天' },
    { label: '最活躍月', value: heatActiveDays ? heatTopMonth : '—' },
    { label: '最高單日', value: '$' + heatMaxDaily.toLocaleString() },
  ];
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');   // 預設「全部」:空字串 = 不做日期篩選
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [perPage, setPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [heatTip, setHeatTip] = useState(null);   // 熱力圖 hover 浮窗:{x,y,ds,amt} 或 null
  const flowTabs = [['all', '全部'], ['buy', '登入送點'], ['sell', '賣出'], ['settle', '結算']];
  const FLOW_TODAY = ymdLocal(new Date());   // 真實今天(本地):讓 近7天/本月 對到正確日期
  const flowAddDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
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
  const rows = hit;
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
            <div className="ranges">
              {TREND_RANGES.map(([key, label, days]) => (
                <button key={key} className={trendRange === key ? 'on' : ''}
                  disabled={days != null && days > trendSpanDays}
                  onClick={() => setTrendRange(key)}>{label}</button>
              ))}
            </div>
            <div className="box">
              <canvas ref={trend.canvasRef}></canvas>
              {trendPoints.length === 0 && <div className="noline">尚無交易資料</div>}
            </div>
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
              <div className="months">{heatMonths.map((m, i) => <span key={i}>{m}</span>)}</div>
              <div className="chart">
                <div className="days"><span /><span>一</span><span /><span>三</span><span /><span>五</span><span /></div>
                <div className="grid">
                  {heatCells.map((c, i) => (
                    <div className={styles.cell} key={i} style={{ background: c.bg, animationDelay: `${c.delay}s` }} title={c.title}
                      onMouseEnter={(e) => !c.future && setHeatTip({ x: e.clientX, y: e.clientY, ds: c.ds, amt: c.amt })}
                      onMouseMove={(e) => setHeatTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
                      onMouseLeave={() => setHeatTip(null)} />
                  ))}
                </div>
              </div>
              <div className="stats">
                {heatStats.map((s) => (
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
        <div><PetalAlloc names={WEEKDAY_NAMES} fills={weekdayFills} title="歷史週一至週日每日流量比" /></div>
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

      {/* 熱力圖 hover 浮窗:跟著游標,顯示日期 + 當日進出 */}
      {heatTip && (
        <div className={styles.heatTip} style={{ left: heatTip.x + 14, top: heatTip.y + 14 }}>
          <div className={styles.heatTipD}>{heatTip.ds}</div>
          <div className={styles.heatTipA}>{heatTip.amt > 0 ? '現金進出 $' + heatTip.amt.toLocaleString() : '當日無交易'}</div>
        </div>
      )}

    </div>
  );
}
