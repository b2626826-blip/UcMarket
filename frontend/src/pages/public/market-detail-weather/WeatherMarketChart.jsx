import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { getMarketPriceHistory } from '../../../api/marketApi';

const COLORS = ['#d9aa43', '#00d66f', '#4d94ff', '#ff476d', '#a855f7', '#22d3ee', '#f472b6'];

const RANGES = [
  { label: '1H', hours: 1 },
  { label: '6H', hours: 6 },
  { label: '1D', hours: 24 },
];

function formatTimeLabel(date, range) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const mo = date.getMonth() + 1;
  const d = date.getDate();

  if (range === '1H') return `${h}:${m}`;
  if (range === '6H' || range === '1D') return `${h}:00`;
  return `${mo}/${d}`;
}

function buildLabels(history, range, hours) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const filtered = history.filter((h) => new Date(h.recordedAt) >= cutoff);
  if (filtered.length === 0) return [];

  const maxTicks = range === '1H' ? 6 : range === '6H' ? 6 : 8;
  const step = Math.max(1, Math.floor(filtered.length / maxTicks));
  return filtered
    .filter((_, idx) => idx % step === 0 || idx === filtered.length - 1)
    .map((h) => formatTimeLabel(new Date(h.recordedAt), range));
}

function findClosestPrice(history, targetTime, hours) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const filtered = history.filter((h) => new Date(h.recordedAt) >= cutoff);
  if (filtered.length === 0) return null;

  const target = new Date(targetTime).getTime();
  let closest = filtered[0];
  let minDiff = Math.abs(new Date(closest.recordedAt).getTime() - target);

  for (const point of filtered) {
    const diff = Math.abs(new Date(point.recordedAt).getTime() - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }
  return closest.yesPrice;
}

export default function WeatherMarketChart({ markets, selectedId, metric, onSelectMarket }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [range, setRange] = useState('1D');
  const [histories, setHistories] = useState({});
  const [loading, setLoading] = useState(false);

  const hours = RANGES.find((r) => r.label === range).hours;

  useEffect(() => {
    if (markets.length === 0) return;
    let cancelled = false;
    setLoading(true);

    const toIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    Promise.all(
      markets.map((m) =>
        getMarketPriceHistory(m.id, fromIso, toIso)
          .then((data) => ({ id: m.id, data }))
          .catch(() => ({ id: m.id, data: [] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      for (const r of results) {
        map[r.id] = r.data;
      }
      setHistories(map);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [markets, hours]);

  const { labels, datasets } = useMemo(() => {
    if (markets.length === 0) return { labels: [], datasets: [] };

    const selectedMarket = markets.find((m) => m.id === selectedId) || markets[0];
    const selectedHistory = histories[selectedMarket?.id] || [];
    const labels = buildLabels(selectedHistory, range, hours);

    const datasets = markets.map((m, idx) => {
      const history = histories[m.id] || [];
      const color = COLORS[idx % COLORS.length];
      const isSelected = m.id === selectedId;

      const data = labels.map((_, labelIdx) => {
        const targetTime = selectedHistory[labelIdx]?.recordedAt;
        if (!targetTime) return null;
        const price = findClosestPrice(history, targetTime, hours);
        return price != null ? Number(price) : null;
      });

      return {
        label: metric === 'maxTemp' ? `≥ ${m.threshold}°C` : `≥ ${m.threshold}%`,
        data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: isSelected ? 3 : 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        spanGaps: true,
      };
    });

    return { labels, datasets };
  }, [markets, histories, selectedId, metric, range, hours]);

  useEffect(() => {
    if (!canvasRef.current || markets.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
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
                const val = context.parsed.y;
                if (val == null) return `${context.dataset.label}: --`;
                return `${context.dataset.label}: ${(val * 100).toFixed(1)}%`;
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
  }, [labels, datasets, markets.length]);

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
          const prob = m.yesPrice != null ? (m.yesPrice * 100).toFixed(1) : '--';
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
        {loading && <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>載入中...</div>}
        {!loading && labels.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>暫無價格資料</div>
        )}
        {!loading && labels.length > 0 && <canvas ref={canvasRef}></canvas>}
      </div>
    </div>
  );
}
