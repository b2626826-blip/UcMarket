import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// ══════════════════════════════════════════════════════════════════
// 走勢圖 · Chart.js 邏輯(從 TrendCombined 抽成 hook)
//   markup + 樣式在頁面 / test.module.css(.trend);這裡只管「畫圖 + 互動狀態」。
//   回傳:canvasRef(掛 <canvas>)、baseOn/setBaseOn(期初基準開關)、
//         以及上方大數字要顯示的 shownValue/diff/pct/up/dateLabel/base。
//   ※ 動畫、Scrub 十字準線、期初紅綠對比 全部保留。
// ══════════════════════════════════════════════════════════════════
const GOLD = '#d9aa43', GREEN = '#33e97f', RED = '#ff476d';
const SERIES = [
  { d: '6/12', v: 118000 }, { d: '6/13', v: 116500 }, { d: '6/14', v: 114200 },
  { d: '6/15', v: 119000 }, { d: '6/16', v: 121500 }, { d: '6/17', v: 117800 },
  { d: '6/18', v: 120400 }, { d: '6/19', v: 123600 }, { d: '6/20', v: 122100 },
  { d: '6/21', v: 124000 }, { d: '6/22', v: 124700 }, { d: '6/23', v: 125430 },
];
const VALUES = SERIES.map((p) => p.v);
const BASE = VALUES[0];

export function useTrendChart() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const activeRef = useRef(null);
  const [active, setActive] = useState(null);
  const [baseOn, setBaseOn] = useState(false);

  const last = SERIES.length - 1;
  const shown = active == null ? last : active;
  const diff = VALUES[shown] - BASE;
  const pct = ((diff / BASE) * 100).toFixed(1);
  const up = diff >= 0;

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const goldGrad = ctx.createLinearGradient(0, 0, 0, 300);
    goldGrad.addColorStop(0, 'rgba(217,170,67,.30)');
    goldGrad.addColorStop(1, 'rgba(217,170,67,0)');

    const dataset = baseOn
      ? {
          data: VALUES, borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 0,
          fill: { target: { value: BASE }, above: 'rgba(51,233,127,.18)', below: 'rgba(255,71,109,.18)' },
          segment: { borderColor: (c) => (c.p1.parsed.y >= BASE ? GREEN : RED) },
        }
      : {
          data: VALUES, borderColor: GOLD, backgroundColor: goldGrad, fill: true,
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
    // reveal 0→1 由下面的 requestAnimationFrame 驅動;plugin 每幀依 reveal 裁切繪圖區。
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
      data: { labels: SERIES.map((p) => p.d), datasets: [dataset] },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: false,                        // 關掉 Chart.js 內建動畫,改用下面的 clip 揭示
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
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
  }, [baseOn]);

  return {
    canvasRef, baseOn, setBaseOn,
    shownValue: VALUES[shown], diff, pct, up,
    dateLabel: active == null ? '至今' : SERIES[shown].d,
    base: BASE,
  };
}
