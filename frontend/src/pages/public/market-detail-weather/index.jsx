import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import useGlowEffect from '../../../hooks/useGlowEffect';
import TradePanel from '../../../components/market/TradePanel';
import WeatherMarketChart from './WeatherMarketChart';
import WeatherChartModal from './WeatherChartModal';
import { fetchCityForecast } from './weatherApi';
import { REGIONS, getRegionById, getRelatedRegions } from './regions';
import './WeatherDetailPage.css';

// ---- helpers ----

function generateMaxTempThresholds(base) {
  const list = [];
  for (let i = -2; i <= 2; i++) {
    list.push(base + i);
  }
  return list;
}

function generateRainThresholds() {
  return [30, 50, 70];
}

function computeYesPrice(threshold, base) {
  const diff = base - threshold;
  const raw = 0.5 + diff * 0.15;
  return +Math.max(0.05, Math.min(0.95, raw)).toFixed(2);
}

// ---- Current weather card ----

function CurrentWeatherCard({ day, city }) {
  if (!day) return null;
  const temp = day.maxTemp != null ? day.maxTemp : 28;
  const dateLabel = day.date
    ? (() => {
        const [, m, d] = day.date.split('-');
        return `${m}/${d}`;
      })()
    : '';
  return (
    <div className="weather-current-card">
      <div className="weather-current-main">
        <i className="fa-solid fa-cloud-sun weather-icon"></i>
        <div>
          <span className="weather-current-date">{dateLabel} {city}</span>
          <span className="weather-temp">{temp}°C</span>
          <span className="weather-condition">{day.condition}</span>
        </div>
      </div>
    </div>
  );
}

// ---- Threshold event list ----

function ThresholdEventList({ markets, selectedId, onSelect, onOpenChart, onOpenWeatherChart, closeDate }) {
  return (
    <div className="weather-event-section">
      <div className="weather-event-section-header">
        <div>
          <h3>可選擇的預測事件</h3>
          <p>點擊 YES 或 NO 直接設定下注方向與賠率</p>
        </div>
        <div className="weather-chart-toggles">
          <button
            className="weather-chart-toggle"
            onClick={onOpenChart}
            type="button"
          >
            <i className="fa-solid fa-chart-line"></i> 查看價格走勢
          </button>
          <button
            className="weather-chart-toggle"
            onClick={onOpenWeatherChart}
            type="button"
          >
            <i className="fa-solid fa-cloud-sun"></i> 查看天氣預報
          </button>
        </div>
      </div>
      <div className="weather-event-list">
        {markets.map((m) => {
          const yesOdds = m.yesPrice > 0 ? +(1 / m.yesPrice).toFixed(2) : 0;
          const noOdds = m.noPrice > 0 ? +(1 / m.noPrice).toFixed(2) : 0;
          return (
            <div
              key={m.id}
              className={`weather-event-row${selectedId === m.id ? ' active' : ''}`}
              onClick={() => onSelect(m)}
            >
              <span className="weather-event-title">{m.title}</span>
              <span className="weather-event-volume">{m.volume}</span>
              <div className="weather-event-prices">
                <div
                  className="weather-event-price yes"
                  onClick={(e) => { e.stopPropagation(); onSelect(m, 'YES'); }}
                >
                  <small>YES</small>
                  <strong>{yesOdds.toFixed(2)}x</strong>
                </div>
                <div
                  className="weather-event-price no"
                  onClick={(e) => { e.stopPropagation(); onSelect(m, 'NO'); }}
                >
                  <small>NO</small>
                  <strong>{noOdds.toFixed(2)}x</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {closeDate && (
        <div className="weather-close-date">
          <i className="fa-regular fa-clock"></i> 截止時間：{closeDate}
        </div>
      )}
    </div>
  );
}

// ---- Charts ----

function WeatherCharts({ days }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!days || days.length === 0) return;
    const canvas = document.getElementById('weatherChart');
    if (!canvas) return;

    if (chartRef.current) chartRef.current.destroy();

    const labels = days.map((d) => {
      const [, month, day] = d.date.split('-');
      return `${month}/${day}`;
    });
    const maxTemps = days.map((d) => d.maxTemp ?? null);
    const minTemps = days.map((d) => d.minTemp ?? null);
    const rainProbs = days.map((d) => d.rainProb);

    const ctx = canvas.getContext('2d');

    chartRef.current = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: '最高溫 (°C)',
            data: maxTemps,
            borderColor: '#d9aa43',
            backgroundColor: '#d9aa43',
            yAxisID: 'y',
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#d9aa43',
          },
          {
            type: 'line',
            label: '最低溫 (°C)',
            data: minTemps,
            borderColor: '#00d66f',
            backgroundColor: '#00d66f',
            yAxisID: 'y',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#00d66f',
          },
          {
            type: 'bar',
            label: '降雨機率 (%)',
            data: rainProbs,
            backgroundColor: rainProbs.map((p) =>
              p > 50 ? 'rgba(77,148,255,0.7)' : 'rgba(77,148,255,0.35)'
            ),
            borderColor: '#4d94ff',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: true, labels: { color: '#8f8f8f' } },
          tooltip: {
            backgroundColor: '#111', titleColor: '#fff', bodyColor: '#d9aa43',
            borderColor: 'rgba(217,170,67,.35)', borderWidth: 1, padding: 12,
          },
        },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: '溫度 (°C)', color: '#888' },
            ticks: { color: '#888' },
            grid: { color: 'rgba(255,255,255,.06)' },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100,
            title: { display: true, text: '降雨機率 (%)', color: '#888' },
            ticks: { color: '#888', callback: (v) => v + '%' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [days]);

  if (!days || days.length === 0) return null;

  return (
    <section className="weather-charts">
      <div className="weather-chart-card">
        <div className="weather-chart-header">
          <h3><i className="fa-solid fa-chart-line"></i> 未來 3 天天氣預測</h3>
        </div>
        <div className="weather-chart-body">
          <canvas id="weatherChart"></canvas>
        </div>
      </div>
    </section>
  );
}

// ---- Rules section ----

function MarketRulesSection({ market }) {
  const [expanded, setExpanded] = useState(false);
  if (!market) return null;

  const text = market.resolutionRule || '';
  const isLong = text.length > 160;
  const displayText = expanded || !isLong ? text : text.slice(0, 160) + '...';

  return (
    <div className="weather-rules-card">
      <h3>規則</h3>
      <div className="weather-rules-content">
        <p>{displayText}</p>
      </div>
      {isLong && (
        <button
          className="weather-rules-expand"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? '收起' : '展開'}
        </button>
      )}
    </div>
  );
}

// ---- Related regions ----

function formatDateFromOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

function RelatedRegions({ region }) {
  const related = getRelatedRegions(region);
  if (related.length === 0) return null;
  return (
    <section className="weather-related">
      <div className="weather-section-header">
        <h2>相關地區市場</h2>
        <p>點擊卡片切換到其他地區的天氣預測</p>
      </div>
      <div className="weather-related-grid">
        {related.map((r) => {
          const dateLabel = formatDateFromOffset(r.offset);
          return (
            <Link
              key={r.id}
              to={`/markets/weather/${r.id}`}
              className="weather-related-card"
            >
              <div className="weather-related-card-main">
                <h4>{dateLabel} {r.city}{r.metric === 'maxTemp' ? '最高溫預測' : '降雨機率預測'}</h4>
                <span className="weather-related-view">查看</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---- Main page ----

export default function WeatherDetailPage() {
  const { id } = useParams();
  const region = getRegionById(id);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 16;
      const y = (e.clientY / window.innerHeight - 0.5) * 16;
      document.documentElement.style.setProperty('--weather-hero-x', `${x}px`);
      document.documentElement.style.setProperty('--weather-hero-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [tradeSide, setTradeSide] = useState('YES');
  const [chartOpen, setChartOpen] = useState(false);
  const [weatherChartOpen, setWeatherChartOpen] = useState(false);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCityForecast(region.city);
      setForecast(data);
    } catch (err) {
      setError(err.message);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [region.city]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  useEffect(() => {
    if (!forecast || !forecast.days) return;
    const day = forecast.days[region.offset];
    if (!day) {
      setMarkets([]);
      return;
    }

    let thresholds;
    if (region.metric === 'rainProb') {
      thresholds = generateRainThresholds();
    } else {
      const base = day.maxTemp ?? 30;
      thresholds = generateMaxTempThresholds(base);
    }

    const baseValue = region.metric === 'rainProb' ? day.rainProb : day.maxTemp;
    const metricLabel = region.metric === 'maxTemp' ? '最高氣溫' : '降雨機率';
    const unit = region.metric === 'maxTemp' ? '°C' : '%';
    const operator = region.metric === 'maxTemp' ? '超過' : '達到';
    const dateText = day.date
      ? (() => {
          const [, m, d] = day.date.split('-');
          return `${m}/${d}`;
        })()
      : region.dateLabel;
    const list = thresholds.map((t, idx) => {
      const yesPrice = computeYesPrice(t, baseValue);
      const volumeRaw = Math.random() * 1.95 + 0.05; // $50K ~ $2M
      return {
        id: `${region.id}-${idx}`,
        threshold: t,
        title: region.metric === 'maxTemp'
          ? `${dateText} ${region.city}最高溫會超過 ${t}°C 嗎？`
          : `${dateText} ${region.city}降雨機率會超過 ${t}% 嗎？`,
        description: `此市場預測 ${day.date} ${region.city}地區的${metricLabel}是否會${operator} ${t}${unit}。`,
        resolutionRule: `以交通部中央氣象署（CWA）公布的 ${day.date} ${region.city}地區觀測資料為準。若當日${metricLabel}大於或等於 ${t}${unit}，則結算為 YES；否則結算為 NO。`,
        sourceUrl: 'https://www.cwa.gov.tw/',
        sourceName: '交通部中央氣象署',
        yesPrice,
        noPrice: +(1 - yesPrice).toFixed(2),
        volume: `$${volumeRaw.toFixed(1)}M`,
      };
    });
    setMarkets(list);
    setSelectedMarket(list[0] || null);
  }, [forecast, region]);

  useGlowEffect('.weather-market-card, .trade-panel');

  const targetDay = forecast?.days?.[region.offset] || null;
  const category = '天氣';
  const subtitle = '根據氣象資料預測未來天氣事件，選擇你認為會發生的結果下注';

  return (
    <div className="weather-page">
      <DetailPageTemplate
        id={id}
      subtitle={subtitle}
      category={category}
      heroLayout="left"
      heroExtras={!loading && !error ? <CurrentWeatherCard day={targetDay} city={region.city} /> : null}
      marketId={id}
      market={selectedMarket}
      tradePanel={<TradePanel marketId={id} market={selectedMarket} side={tradeSide} onSideChange={setTradeSide} />}
    >
      {loading && (
        <div className="trade-market-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#d9aa43' }}></i>
          <p style={{ marginTop: 16, color: '#8f8f8f' }}>載入天氣資料中...</p>
        </div>
      )}

      {error && (
        <div className="trade-market-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 32, color: '#ff476d' }}></i>
          <p style={{ marginTop: 16, color: '#ff476d' }}>無法載入天氣資料</p>
          <p style={{ color: '#888' }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="weather-market-card">
            <div className="weather-market-header">
              <div>
                <div className="weather-market-badge">
                  <i className="fa-solid fa-cloud-sun"></i> {region.metric === 'maxTemp' ? '溫度預測' : '降雨預測'}
                </div>
                <h2>
                  {targetDay?.date
                    ? (() => {
                        const [, m, d] = targetDay.date.split('-');
                        return `${m}/${d}`;
                      })() + ' '
                    : ''}
                  {region.city}
                  {region.metric === 'maxTemp' ? '最高溫預測' : '降雨機率預測'}
                </h2>
                <p>根據中央氣象署公開資料，選擇你認為會發生的事件進行下注。</p>
              </div>
              <div className="market-status live">
                <i className="fa-solid fa-circle"></i> LIVE
              </div>
            </div>

            <ThresholdEventList
              markets={markets}
              selectedId={selectedMarket?.id}
              onSelect={(m, side) => {
                setSelectedMarket(m);
                if (side) setTradeSide(side);
              }}
              onOpenChart={() => setChartOpen(true)}
              onOpenWeatherChart={() => setWeatherChartOpen(true)}
              closeDate={targetDay?.date
                ? (() => {
                    const [, m, d] = targetDay.date.split('-');
                    return `${m}/${d}`;
                  })()
                : '--'}
            />
          </div>

          <MarketRulesSection market={selectedMarket} />

          <RelatedRegions region={region} />

          <WeatherChartModal
            open={chartOpen}
            onClose={() => setChartOpen(false)}
            title="預測價格走勢"
            description="各門檻事件的 YES 機率變化"
          >
            <div className="weather-modal-chart">
              <WeatherMarketChart
                markets={markets}
                selectedId={selectedMarket?.id}
                metric={region.metric}
                onSelectMarket={(m) => {
                  setSelectedMarket(m);
                }}
              />
            </div>
          </WeatherChartModal>

          <WeatherChartModal
            open={weatherChartOpen}
            onClose={() => setWeatherChartOpen(false)}
            title="天氣預報"
            description="未來 3 天溫度與降雨機率"
          >
            <div className="weather-modal-chart">
              <WeatherCharts days={forecast?.days || []} />
            </div>
          </WeatherChartModal>
        </>
      )}
    </DetailPageTemplate>
    </div>
  );
}
