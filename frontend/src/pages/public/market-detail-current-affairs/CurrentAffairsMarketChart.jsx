import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

const RANGES = [
  { id: '1D', label: '1日', hours: 24 },
  { id: '1W', label: '1週', hours: 168 },
  { id: '1M', label: '1月', hours: 720 },
  { id: 'ALL', label: '全部', hours: 720 },
];

function clamp(value) {
  return Math.min(98, Math.max(2, value));
}

function buildHistory(market) {
  const points = 720;
  const seed = [...market.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  const current = market.yesProbability;
  const change24h = (seed % 9) - 4 || 3;
  const values = [];

  for (let index = 0; index < points; index += 1) {
    const hoursAgo = points - 1 - index;
    const dayProgress = Math.min(1, Math.max(0, (24 - hoursAgo) / 24));
    const longTrend = (index / (points - 1) - 1) * ((seed % 15) - 7);
    const recentTrend = hoursAgo <= 24 ? change24h * dayProgress : 0;
    const wave = Math.sin((index + seed) / 19) * 1.8 + Math.sin((index + seed) / 53) * 1.2;

    values.push(clamp(current + longTrend + recentTrend + wave));
  }

  values[points - 25] = clamp(current - change24h);
  values[points - 1] = current;
  return values;
}

function formatLabel(index, total) {
  const date = new Date(Date.now() - (total - 1 - index) * 60 * 60 * 1000);
  return date.toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCurrentAffairsMarketMetrics(market) {
  const history = buildHistory(market);
  const current = history.at(-1);
  const previous = history.at(-25);

  return {
    history,
    yesChange24h: current - previous,
    noChange24h: previous - current,
  };
}

export default function CurrentAffairsMarketChart({ market }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [range, setRange] = useState('1D');
  const metrics = useMemo(() => getCurrentAffairsMarketMetrics(market), [market]);
  const visibleData = useMemo(() => {
    const hours = RANGES.find((item) => item.id === range)?.hours ?? 24;
    const yes = metrics.history.slice(-hours);

    return {
      labels: yes.map((_, index) => formatLabel(index, yes.length)),
      yes,
      no: yes.map((value) => 100 - value),
    };
  }, [metrics, range]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: visibleData.labels,
        datasets: [
          {
            label: 'YES',
            data: visibleData.yes,
            borderColor: '#33e97f',
            backgroundColor: 'rgba(51, 233, 127, 0.08)',
            fill: false,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.32,
          },
          {
            label: 'NO',
            data: visibleData.no,
            borderColor: '#ff476d',
            backgroundColor: 'rgba(255, 71, 109, 0.08)',
            fill: false,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.32,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111',
            bodyColor: '#fff',
            borderColor: 'rgba(217, 170, 67, 0.45)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => `${context.dataset.label} ${context.parsed.y.toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#8f8f8f', maxTicksLimit: 7, maxRotation: 0 },
            grid: { display: false },
            border: { color: 'rgba(255,255,255,.14)' },
          },
          y: {
            min: 0,
            max: 100,
            ticks: { color: '#8f8f8f', callback: (value) => `${value}%` },
            grid: { color: 'rgba(255,255,255,.08)' },
            border: { display: false },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [visibleData]);

  return (
    <section className="current-affairs-chart" aria-label="市場機率走勢">
      <div className="current-affairs-chart__toolbar" role="group" aria-label="走勢時間範圍">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={range === item.id ? 'is-active' : ''}
            onClick={() => setRange(item.id)}
            aria-pressed={range === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="current-affairs-chart__canvas">
        <canvas ref={canvasRef}></canvas>
      </div>
    </section>
  );
}
