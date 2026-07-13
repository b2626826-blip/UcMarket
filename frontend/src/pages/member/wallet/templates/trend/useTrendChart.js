import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// ══════════════════════════════════════════════════════════════════
// 走勢圖 · Chart.js 邏輯(從 TrendCombined 抽成 hook)
//   markup + 樣式在頁面 / test.module.css(.trend);這裡只管「畫圖 + 互動狀態」。
//   ★ 吃 props:points = [{ x:交易時間戳(ms), y:結餘 }](已依時間排序)。
//     每筆一點、放在「真實時間位置」(x 軸=時間/天),點之間平滑內插。
//   回傳:canvasRef、baseOn/setBaseOn、上方大數字要顯示的 shownValue/diff/pct/up/dateLabel/base。
//   ※ 揭示動畫、Scrub 十字準線、期初紅綠對比、淡軸線 全部保留。
// ══════════════════════════════════════════════════════════════════
const GOLD = '#d9aa43', GREEN = '#33e97f', RED = '#ff476d';
const AXIS = '#8a8a8a';                          // 軸刻度文字(淡灰)
const GRID = 'rgba(255,255,255,.08)';            // 橫格線(很淡)
const fmtDate = (ms) => { const d = new Date(ms); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
const fmtMoney = (v) => (v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v);

export function useTrendChart(points) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const activeRef = useRef(null);
  const [active, setActive] = useState(null);
  const [baseOn, setBaseOn] = useState(false);

  const pts = Array.isArray(points) ? points : [];
  const VALUES = pts.map((p) => p.y);
  const n = VALUES.length;
  const BASE = n ? VALUES[0] : 0;                 // 期初 = 第一筆結餘
  const last = n - 1;
  const shown = active == null ? last : Math.min(active, last);
  const shownValue = n ? VALUES[shown] : 0;
  const diff = shownValue - BASE;
  const pct = BASE ? ((diff / BASE) * 100).toFixed(1) : '0.0';
  const up = diff >= 0;
  // x 軸日期標籤格式隨範圍變:跨度 > 120 天 → 顯示「M月」;否則「M/D」
  const spanDays = n >= 2 ? (pts[n - 1].x - pts[0].x) / 86400000 : 0;
  const fmtTick = spanDays > 120 ? (ms) => (new Date(ms).getUTCMonth() + 1) + '月' : fmtDate;

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const goldGrad = ctx.createLinearGradient(0, 0, 0, 300);
    goldGrad.addColorStop(0, 'rgba(217,170,67,.30)');
    goldGrad.addColorStop(1, 'rgba(217,170,67,0)');

    const dataset = baseOn
      ? {
          data: pts, borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 0,
          fill: { target: { value: BASE }, above: 'rgba(51,233,127,.18)', below: 'rgba(255,71,109,.18)' },
          segment: { borderColor: (c) => (c.p1.parsed.y >= BASE ? GREEN : RED) },
        }
      : {
          data: pts, borderColor: GOLD, backgroundColor: goldGrad, fill: true,
          borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 0,
        };

    const baseLine = {
      id: 'baseLine',
      afterDatasetsDraw(chart) {
        if (!baseOn) return;
        const { ctx, chartArea, scales } = chart;
        const y = scales.y.getPixelForValue(BASE);
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.restore();
      },
    };
    const crosshair = {
      id: 'crosshair',
      afterDatasetsDraw(chart) {
        const idx = activeRef.current;
        if (idx == null) return;
        const pt = chart.getDatasetMeta(0).data[idx];
        if (!pt) return;
        const dot = baseOn ? (VALUES[idx] >= BASE ? GREEN : RED) : GOLD;
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pt.x, chartArea.top);
        ctx.lineTo(pt.x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = dot;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#04120a';
        ctx.stroke();
        ctx.restore();
      },
    };

    // 「由左到右揭示」動畫:用連續 clip 逐像素露出線條 → 絲滑,跟資料點數無關(無節點顆粒感)。
    let reveal = 0, revealRaf = null;
    const revealPlugin = {
      id: 'reveal',
      beforeDatasetsDraw(chart) {
        if (reveal >= 1) return;                 // 揭示完就不裁切
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.beginPath();
        ctx.rect(chartArea.left, chartArea.top - 40, chartArea.width * reveal + 0.5, chartArea.height + 80);
        ctx.clip();
      },
      afterDatasetsDraw(chart) { if (reveal < 1) chart.ctx.restore(); },
    };

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: { datasets: [dataset] },             // 每筆 {x,y};x 軸依真實時間定位
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: false,                        // 關掉內建動畫,改用下面的 clip 揭示
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          // x 軸:時間(以毫秒 linear 定位,免裝 date adapter),刻度格式化成日期
          x: {
            type: 'linear',
            min: n ? pts[0].x : undefined,        // 夾住資料頭尾 → 消除 Chart.js linear 軸自動留的前後空白
            max: n ? pts[n - 1].x : undefined,
            grid: { display: false },            // 時間軸不畫縱格線
            border: { display: false },
            ticks: { color: AXIS, font: { size: 11 }, maxTicksLimit: 6, autoSkip: true, callback: (v) => fmtTick(v) },
          },
          // y 軸:金額,淡橫格線 + $ 刻度
          y: {
            grid: { color: GRID, drawTicks: false },
            border: { display: false },
            ticks: { color: AXIS, font: { size: 11 }, maxTicksLimit: 5, padding: 8, callback: (v) => fmtMoney(v) },
          },
        },
        onHover: (e, els) => {
          const idx = els.length ? els[0].index : null;
          if (idx !== activeRef.current) { activeRef.current = idx; setActive(idx); }
        },
      },
      plugins: [baseLine, crosshair, revealPlugin],
    });

    // 驅動揭示:easeOutCubic + 每幀重畫 → 絲滑;700ms 內完成
    const REVEAL_DUR = 700;
    let revealStart = null;
    const revealStep = (t) => {
      if (revealStart == null) revealStart = t;
      const p = Math.min(1, (t - revealStart) / REVEAL_DUR);
      reveal = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      if (chartRef.current) chartRef.current.draw();
      if (p < 1) revealRaf = requestAnimationFrame(revealStep);
    };
    revealRaf = requestAnimationFrame(revealStep);

    const cv = canvasRef.current;
    const leave = () => { activeRef.current = null; setActive(null); chartRef.current && chartRef.current.draw(); };
    cv.addEventListener('mouseleave', leave);
    return () => {
      cv.removeEventListener('mouseleave', leave);
      if (revealRaf) cancelAnimationFrame(revealRaf);
      chartRef.current?.destroy();
    };
  }, [points, baseOn]);

  return {
    canvasRef, baseOn, setBaseOn,
    shownValue, diff, pct, up,
    dateLabel: (active == null || !n) ? '至今' : fmtDate(pts[shown].x),
    base: BASE,
  };
}
