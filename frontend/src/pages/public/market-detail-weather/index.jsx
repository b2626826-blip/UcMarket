import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import useGlowEffect from '../../../hooks/useGlowEffect';
import TradePanel from '../../../components/market/TradePanel';
import WeatherHero from './WeatherHero';
import WeatherMarketChart from './WeatherMarketChart';
import WeatherChartModal from './WeatherChartModal';
import { fetchCityForecast } from './weatherApi';
import { getMarketsByCategory, getMarketOdds, getMarketDetail } from '../../../api/marketApi';
import { REGIONS, getRegionById, getRelatedRegions } from './regions';
import './WeatherDetailPage.css';

// ---- helpers ----

function parseMetadata(market) {
  if (!market.metadata) return {};
  try {
    return typeof market.metadata === 'string' ? JSON.parse(market.metadata) : market.metadata;
  } catch {
    return {};
  }
}

function formatDateLabel(dateText) {
  if (!dateText) return '';
  const [, m, d] = dateText.split('-');
  return `${m}/${d}`;
}

function isUuid(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value).trim());
}

function formatMonthLabel(dateText) {
  if (!dateText) return '';
  const [y, m] = dateText.split('-');
  return `${y}/${m}`;
}

function getCurrentMonthStart() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function getCurrentMonthClose() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-28`;
}

function getCurrentMonthDisplay() {
  return `${new Date().getMonth() + 1}月`;
}

// ---- Threshold event list ----

function ThresholdEventList({ markets, selectedId, onSelect, onOpenChart, onOpenWeatherChart, closeDate, showWeatherChart }) {
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
          {showWeatherChart && (
            <button
              className="weather-chart-toggle"
              onClick={onOpenWeatherChart}
              type="button"
            >
              <i className="fa-solid fa-cloud-sun"></i> 查看天氣預報
            </button>
          )}
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

function getMetricLabel(metric) {
  if (metric === 'maxTemp') return '最高溫預測';
  if (metric === 'monthlyRain') return '月降雨量預測';
  return '降雨機率預測';
}

function getBadgeLabel(metric) {
  if (metric === 'maxTemp') return '溫度預測';
  if (metric === 'monthlyRain') return '月降雨量預測';
  return '降雨預測';
}

function RelatedRegions({ region }) {
  if (!region || !region.relatedIds) return null;
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
          const dateLabel = r.metric === 'monthlyRain'
            ? getCurrentMonthDisplay()
            : formatDateFromOffset(r.offset);
          return (
            <Link
              key={r.id}
              to={`/markets/weather/${r.id}`}
              className="weather-related-card"
            >
              <div className="weather-related-card-main">
                <h4>{dateLabel} {r.city}{getMetricLabel(r.metric)}</h4>
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
  const isUuidParam = isUuid(id);
  const [region, setRegion] = useState(() => (isUuidParam ? null : getRegionById(id)));
  const [uuidMarket, setUuidMarket] = useState(null);
  const [uuidMeta, setUuidMeta] = useState(null);
  const [uuidLoading, setUuidLoading] = useState(isUuidParam);
  const [uuidError, setUuidError] = useState(null);

  const isMonthlyRain = region?.metric === 'monthlyRain';
  const hasWeatherMeta = isUuidParam ? !!(uuidMeta?.city && uuidMeta?.date && uuidMeta?.metric) : true;

  useEffect(() => {
    if (!isUuidParam) return;
    setUuidLoading(true);
    setUuidError(null);
    let cancelled = false;
    getMarketDetail(id)
      .then((market) => {
        if (cancelled) return;
        const meta = parseMetadata(market);
        setUuidMarket(market);
        setUuidMeta(meta);
        setRegion({
          city: meta.city,
          metric: meta.metric,
          offset: 0,
          dateLabel: meta.date,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setUuidError(err.message);
      })
      .finally(() => {
        if (!cancelled) setUuidLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isUuidParam]);

  useEffect(() => {
    if (isUuidParam && uuidMarket && !hasWeatherMeta) {
      setSelectedMarket(uuidMarket);
    }
  }, [isUuidParam, uuidMarket, hasWeatherMeta]);

  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [tradeSide, setTradeSide] = useState('YES');
  const [chartOpen, setChartOpen] = useState(false);
  const [weatherChartOpen, setWeatherChartOpen] = useState(false);

  const fetchForecast = useCallback(async () => {
    if (isMonthlyRain || !region?.city) {
      setForecastLoading(false);
      return;
    }
    setForecastLoading(true);
    setForecastError(null);
    try {
      const data = await fetchCityForecast(region.city);
      setForecast(data);
    } catch (err) {
      setForecastError(err.message);
      setForecast(null);
    } finally {
      setForecastLoading(false);
    }
  }, [region?.city, isMonthlyRain]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  useEffect(() => {
    let cancelled = false;
    setMarketsLoading(true);
    setMarketsError(null);

    if (!region) {
      setMarkets([]);
      setMarketsLoading(false);
      return;
    }

    const targetDate = isMonthlyRain
      ? getCurrentMonthStart()
      : (isUuidParam ? uuidMeta?.date : forecast?.days?.[region.offset]?.date);

    if (!targetDate) {
      setMarkets([]);
      setMarketsLoading(false);
      return;
    }

    getMarketsByCategory('WEATHER')
      .then(async (allWeatherMarkets) => {
        if (cancelled) return;

        const filtered = allWeatherMarkets.filter((m) => {
          const meta = parseMetadata(m);
          return meta.city === region.city
            && meta.date === targetDate
            && meta.metric === region.metric;
        });

        const withOdds = await Promise.all(
          filtered.map(async (m) => {
            try {
              const odds = await getMarketOdds(m.id);
              const meta = parseMetadata(m);
              const totalVolume = Number(odds.totalVolume) || 0;
              const volumeText = totalVolume >= 1000000
                ? `$${(totalVolume / 1000000).toFixed(1)}M`
                : totalVolume >= 1000
                  ? `$${(totalVolume / 1000).toFixed(1)}K`
                  : `$${totalVolume.toFixed(0)}`;
              return {
                ...m,
                threshold: meta.threshold,
                yesPrice: Number(odds.yesOdds) ? 1 / Number(odds.yesOdds) : 0.5,
                noPrice: Number(odds.noOdds) ? 1 / Number(odds.noOdds) : 0.5,
                volume: volumeText,
              };
            } catch {
              const meta = parseMetadata(m);
              return {
                ...m,
                threshold: meta.threshold,
                yesPrice: 0.5,
                noPrice: 0.5,
                volume: '$0',
              };
            }
          })
        );

        const sorted = withOdds.sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
        setMarkets(sorted);
        setSelectedMarket(sorted[0] || null);
        setMarketsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setMarketsError(err.message);
        setMarketsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [forecast, region, region?.city, region?.metric, region?.offset, isMonthlyRain, isUuidParam, uuidMeta?.date]);

  useGlowEffect('.weather-market-card, .trade-panel');

  const targetDay = isUuidParam
    ? (uuidMeta?.date
        ? (forecast?.days?.find((d) => d.date === uuidMeta.date) || { date: uuidMeta.date, maxTemp: null, minTemp: null, rainProb: null })
        : null)
    : (forecast?.days?.[region.offset] || null);
  const subtitle = isMonthlyRain
    ? '預測本月份累積降雨量，選擇你認為會發生的結果下注'
    : '根據氣象資料預測未來天氣事件，選擇你認為會發生的結果下注';

  const loading = uuidLoading || forecastLoading || marketsLoading;
  const error = uuidError || forecastError || marketsError;

  const headerTitle = isMonthlyRain
    ? `${region?.city} ${getCurrentMonthDisplay()}降雨量預測`
    : `${targetDay?.date ? formatDateLabel(targetDay.date) + ' ' : ''}${region?.city}最高溫預測`;

  const closeDate = isMonthlyRain
    ? getCurrentMonthClose()
    : (targetDay?.date || '');

  return (
    <DetailPageTemplate
      id={id}
      heroLayout="left"
      hero={<WeatherHero subtitle={subtitle} city={region?.city} day={!isMonthlyRain ? targetDay : null} />}
      marketId={selectedMarket?.id || id}
      market={selectedMarket}
      tradePanel={<TradePanel marketId={selectedMarket?.id || id} market={selectedMarket} side={tradeSide} onSideChange={setTradeSide} />}
    >
      {loading && (
        <div className="trade-market-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#d9aa43' }}></i>
          <p style={{ marginTop: 16, color: '#8f8f8f' }}>載入中...</p>
        </div>
      )}

      {error && (
        <div className="trade-market-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 32, color: '#ff476d' }}></i>
          <p style={{ marginTop: 16, color: '#ff476d' }}>載入失敗</p>
          <p style={{ color: '#888' }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {hasWeatherMeta ? (
            <div className="weather-market-card">
              <div className="weather-market-header">
                <div>
                  <div className="weather-market-badge">
                    <i className={isMonthlyRain ? 'fa-solid fa-cloud-rain' : 'fa-solid fa-cloud-sun'}></i> {getBadgeLabel(region?.metric)}
                  </div>
                  <h2>{headerTitle}</h2>
                  <p>{isMonthlyRain
                    ? '根據中央氣象署 C-B0025-003 月降雨量觀測資料，預測本月份累積降雨量。'
                    : '根據中央氣象署公開資料，選擇你認為會發生的事件進行下注。'}
                  </p>
                </div>
                <div className="market-status live">
                  <i className="fa-solid fa-circle"></i> LIVE
                </div>
              </div>

              {markets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  暫無該地區的預測事件，請稍後再試。
                </div>
              ) : (
                <ThresholdEventList
                  markets={markets}
                  selectedId={selectedMarket?.id}
                  onSelect={(m, side) => {
                    setSelectedMarket(m);
                    if (side) setTradeSide(side);
                  }}
                  onOpenChart={() => setChartOpen(true)}
                  onOpenWeatherChart={() => setWeatherChartOpen(true)}
                  closeDate={closeDate}
                  showWeatherChart={!isMonthlyRain}
                />
              )}
            </div>
          ) : uuidMarket && (
            <div className="weather-market-card">
              <div className="weather-market-header">
                <div>
                  <div className="weather-market-badge">
                    <i className="fa-solid fa-cloud-sun"></i> 天氣
                  </div>
                  <h2>{uuidMarket.title}</h2>
                  {uuidMarket.description && <p>{uuidMarket.description}</p>}
                </div>
                <div className="market-status live">
                  <i className="fa-solid fa-circle"></i> LIVE
                </div>
              </div>
            </div>
          )}

          <MarketRulesSection market={selectedMarket} />

          {hasWeatherMeta && (
            <>
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
                    metric={region?.metric}
                    onSelectMarket={(m) => {
                      setSelectedMarket(m);
                    }}
                  />
                </div>
              </WeatherChartModal>

              {!isMonthlyRain && (
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
              )}
            </>
          )}
        </>
      )}
    </DetailPageTemplate>
  );
}
