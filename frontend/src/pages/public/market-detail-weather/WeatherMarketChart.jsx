import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const COLORS = ['#d9aa43', '#00d66f', '#4d94ff', '#ff476d', '#a855f7', '#22d3ee', '#f472b6'];

const RANGES = [
  { label: '1H', hours: 1 },
  { label: '6H', hours: 6 },
  { label: '1D', hours: 24 },
];

function generateMockHistory(targetYesPrice, hours = 168) {
  const points = [];
  let current = 0.5 + (Math.random() - 0.5) * 0.3;
  const step = (targetYesPrice - current) / hours;

  for (let i = 0; i < hours; i++) {
    const noise = (Math.random() - 0.5) * 0.04;
    current += step + noise;
    current = Math.max(0.01, Math.min(0.99, current));
    points.push(current);
  }

  points[points.length - 1] = targetYesPrice;
  return points;
}

function formatTimeLabel(date, range) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const mo = date.getMonth() + 1;
  const d = date.getDate();

  if (range === '1H') return `${h}:${m}`;
  if (range === '6H' || range === '1D') return `${h}:00`;
  return `${mo}/${d}`;
}

export default function WeatherMarketChart({ markets, selectedId, metric, onSelectMarket }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [range, setRange] = useState('1D');

  const fullHistory = useMemo(() => {
    const hours = 168;
    const now = new Date();
    const labels = [];

    for (let i = 0; i < hours; i++) {
      const t = new Date(now.getTime() - (hours - 1 - i) * 60 * 60 * 1000);
      labels.push(formatTimeLabel(t, range));
    }

    const datasets = markets.map((m, idx) => {
      const data = generateMockHistory(m.yesPrice, hours);
      const color = COLORS[idx % COLORS.length];
      const isSelected = m.id === selectedId;

      return {
        label: metric === 'maxTemp' ? `≥ ${m.threshold}°C` : `≥ ${m.threshold}%`,
        data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: isSelected ? 3 : 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
      };
    });

    return { labels, datasets };
  }, [markets, metric, range, selectedId]);

  const visibleData = useMemo(() => {
    const hours = RANGES.find((r) => r.label === range).hours;
    return {
      labels: fullHistory.labels.slice(-hours),
      datasets: fullHistory.datasets.map((ds) => ({
        ...ds,
        data: ds.data.slice(-hours),
      })),
    };
  }, [fullHistory, range]);

  useEffect(() => {
    if (!canvasRef.current || markets.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: visibleData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111',
            titleColor: '#fff',
            bodyColor: '#d9aa43',
            borderColor: 'rgba(217,170,67,.35)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                const val = (context.parsed.y * 100).toFixed(1);
                return `${context.dataset.label}: ${val}%`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#888', maxTicksLimit: 8 },
            grid: { color: 'rgba(255,255,255,.04)' },
          },
          y: {
            min: 0,
            max: 1,
            ticks: {
              color: '#888',
              callback: (v) => `${(v * 100).toFixed(0)}%`,
            },
            grid: { color: 'rgba(255,255,255,.06)' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [visibleData, markets.length]);

  if (markets.length === 0) return null;

  return (
    <div className="weather-market-chart-card">
      <div className="weather-market-chart-header">
        <div>
          <h3>
            <i className="fa-solid fa-chart-line"></i> 預測價格走勢
          </h3>
          <p>各門檻事件的 YES 機率變化</p>
        </div>
        <div className="weather-chart-range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              className={range === r.label ? 'active' : ''}
              onClick={() => setRange(r.label)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="weather-chart-legend">
        {markets.map((m, idx) => {
          const color = COLORS[idx % COLORS.length];
          const prob = (m.yesPrice * 100).toFixed(1);
          const isSelected = m.id === selectedId;
          return (
            <button
              key={m.id}
              className={isSelected ? 'active' : ''}
              onClick={() => onSelectMarket?.(m)}
              type="button"
            >
              <i style={{ backgroundColor: color }}></i>
              <span>
                {metric === 'maxTemp' ? `${m.threshold}°C` : `${m.threshold}%`} {prob}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="weather-market-chart-body">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
