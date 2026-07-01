import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import useGlowEffect from '../../../hooks/useGlowEffect';
import './WeatherDetailPage.css';

const WEEK_DAYS = ['今天', '明天', '後天', '週四', '週五', '週六', '週日'];
const MAX_TEMPS = [28, 30, 31, 29, 27, 26, 28];
const MIN_TEMPS = [22, 23, 24, 23, 21, 20, 22];
const RAIN_PROB = [20, 40, 60, 30, 10, 0, 15];

const RELATED_MARKETS = [
  { id: 5, title: '明天台中最高溫會超過 30°C 嗎？', yesPrice: 0.55, noPrice: 0.45 },
  { id: 6, title: '本週台北會下雨超過 3 天嗎？', yesPrice: 0.62, noPrice: 0.38 },
  { id: 51, title: '明天台中最高溫會超過 31°C 嗎？', yesPrice: 0.32, noPrice: 0.68 },
  { id: 52, title: '明天台中降雨機率會超過 50% 嗎？', yesPrice: 0.48, noPrice: 0.52 },
];

const CURRENT_WEATHER = {
  city: '台中',
  temp: 28,
  condition: '多雲時晴',
  humidity: 65,
  wind: 12,
  rainProb: 40,
};

function CurrentWeatherCard() {
  return (
    <div className="weather-current-card">
      <div className="weather-current-main">
        <i className="fa-solid fa-cloud-sun weather-icon"></i>
        <div>
          <span className="weather-temp">{CURRENT_WEATHER.temp}°C</span>
          <span className="weather-condition">{CURRENT_WEATHER.condition}</span>
        </div>
      </div>
      <div className="weather-current-stats">
        <div className="weather-stat">
          <i className="fa-solid fa-droplet"></i>
          <span className="weather-stat-label">濕度</span>
          <strong>{CURRENT_WEATHER.humidity}%</strong>
        </div>
        <div className="weather-stat">
          <i className="fa-solid fa-wind"></i>
          <span className="weather-stat-label">風速</span>
          <strong>{CURRENT_WEATHER.wind} km/h</strong>
        </div>
        <div className="weather-stat">
          <i className="fa-solid fa-umbrella"></i>
          <span className="weather-stat-label">降雨機率</span>
          <strong>{CURRENT_WEATHER.rainProb}%</strong>
        </div>
      </div>
    </div>
  );
}

function WeatherMarketCard({ market }) {
  return (
    <div className="weather-market-card">
      <div className="weather-market-header">
        <div>
          <div className="weather-market-badge"><i className="fa-solid fa-cloud-sun"></i> 天氣預測</div>
          <h2>{market.title}</h2>
          <p>根據中央氣象局資料，若事件發生則此市場結算為 YES。</p>
        </div>
        <div className="market-status live"><i className="fa-solid fa-circle"></i> LIVE</div>
      </div>
      <div className="weather-price-board">
        <div className="weather-price-box yes">
          <span>YES 價格</span>
          <strong>${market.yesPrice.toFixed(2)}</strong>
          <p>{((market.yesPrice / (market.yesPrice + market.noPrice)) * 100).toFixed(1)}% 看漲</p>
        </div>
        <div className="weather-price-box no">
          <span>NO 價格</span>
          <strong>${market.noPrice.toFixed(2)}</strong>
          <p>{((market.noPrice / (market.yesPrice + market.noPrice)) * 100).toFixed(1)}% 看跌</p>
        </div>
      </div>
      <div className="weather-option-section">
        <h3>可選擇方向</h3>
        <div className="weather-option-grid">
          {[
            { label: 'YES 看漲', price: `$${market.yesPrice.toFixed(2)}`, active: true },
            { label: 'NO 看跌', price: `$${market.noPrice.toFixed(2)}`, active: false },
            { label: 'OPTION 選擇權', price: '42%', active: false },
            { label: '自訂合約', price: '—', active: false },
          ].map((opt) => (
            <button key={opt.label} className={`weather-option-card ${opt.active ? 'active' : ''}`}>
              <span>{opt.label}</span>
              <strong>{opt.price}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="weather-market-meta">
        <div><span>成交量</span><strong>$2.3M</strong></div>
        <div><span>交易者</span><strong>1,243</strong></div>
        <div><span>截止</span><strong>2026 年 5 月</strong></div>
      </div>
    </div>
  );
}

function WeatherCharts() {
  const tempChartRef = useRef(null);
  const rainChartRef = useRef(null);

  useEffect(() => {
    const tempCtx = document.getElementById('weatherTempChart');
    const rainCtx = document.getElementById('weatherRainChart');
    if (!tempCtx || !rainCtx) return;

    if (tempChartRef.current) tempChartRef.current.destroy();
    if (rainChartRef.current) rainChartRef.current.destroy();

    const tempGradient = tempCtx.getContext('2d').createLinearGradient(0, 0, 0, 320);
    tempGradient.addColorStop(0, 'rgba(217, 170, 67, 0.35)');
    tempGradient.addColorStop(1, 'rgba(217, 170, 67, 0)');

    const rainGradient = rainCtx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    rainGradient.addColorStop(0, 'rgba(77, 148, 255, 0.45)');
    rainGradient.addColorStop(1, 'rgba(77, 148, 255, 0)');

    tempChartRef.current = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: WEEK_DAYS,
        datasets: [
          {
            label: '最高溫 (°C)',
            data: MAX_TEMPS,
            borderColor: '#d9aa43',
            backgroundColor: tempGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#d9aa43',
          },
          {
            label: '最低溫 (°C)',
            data: MIN_TEMPS,
            borderColor: '#00d66f',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#00d66f',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: '#8f8f8f' } },
          tooltip: {
            backgroundColor: '#111',
            titleColor: '#fff',
            bodyColor: '#d9aa43',
            borderColor: 'rgba(217,170,67,.35)',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.06)' } },
        },
      },
    });

    rainChartRef.current = new Chart(rainCtx, {
      type: 'bar',
      data: {
        labels: WEEK_DAYS,
        datasets: [
          {
            label: '降雨機率 (%)',
            data: RAIN_PROB,
            backgroundColor: RAIN_PROB.map((p) =>
              p > 50 ? 'rgba(77, 148, 255, 0.7)' : 'rgba(77, 148, 255, 0.35)'
            ),
            borderColor: '#4d94ff',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111',
            titleColor: '#fff',
            bodyColor: '#4d94ff',
            borderColor: 'rgba(77,148,255,.35)',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { min: 0, max: 100, ticks: { color: '#888', callback: (v) => v + '%' }, grid: { color: 'rgba(255,255,255,.06)' } },
        },
      },
    });

    return () => {
      if (tempChartRef.current) tempChartRef.current.destroy();
      if (rainChartRef.current) rainChartRef.current.destroy();
    };
  }, []);

  return (
    <section className="weather-charts">
      <div className="weather-chart-card">
        <div className="weather-chart-header">
          <h3><i className="fa-solid fa-temperature-half"></i> 未來 7 天溫度趨勢</h3>
        </div>
        <div className="weather-chart-body">
          <canvas id="weatherTempChart"></canvas>
        </div>
      </div>
      <div className="weather-chart-card">
        <div className="weather-chart-header">
          <h3><i className="fa-solid fa-cloud-rain"></i> 降雨機率預測</h3>
        </div>
        <div className="weather-chart-body">
          <canvas id="weatherRainChart"></canvas>
        </div>
      </div>
    </section>
  );
}

function RelatedMarkets({ selectedId }) {
  return (
    <section className="weather-related">
      <div className="weather-section-header">
        <h2>相關溫度門檻市場</h2>
        <p>點擊卡片切換到其他天氣預測市場</p>
      </div>
      <div className="weather-related-grid">
        {RELATED_MARKETS.map((m) => (
          <Link
            key={m.id}
            to={`/markets/weather/${m.id}`}
            className={`weather-related-card ${selectedId === m.id ? 'active' : ''}`}
          >
            <h4>{m.title}</h4>
            <div className="weather-related-prices">
              <div className="weather-price-yes">
                <small>YES</small>
                <strong>${m.yesPrice.toFixed(2)}</strong>
              </div>
              <div className="weather-price-no">
                <small>NO</small>
                <strong>${m.noPrice.toFixed(2)}</strong>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function WeatherDetailPage() {
  const { id } = useParams();
  const selectedId = Number(id) || RELATED_MARKETS[0].id;
  const selectedMarket = RELATED_MARKETS.find((m) => m.id === selectedId) || RELATED_MARKETS[0];

  useGlowEffect('.weather-market-card, .trade-panel');

  return (
    <DetailPageTemplate
      id={id}
      subtitle={selectedMarket.title}
      heroExtras={<CurrentWeatherCard />}
      marketId={id}
    >
      <WeatherMarketCard market={selectedMarket} />
      <WeatherCharts />
      <RelatedMarkets selectedId={selectedId} />
    </DetailPageTemplate>
  );
}
