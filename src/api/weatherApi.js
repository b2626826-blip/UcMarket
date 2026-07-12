/**
 * ⚠️ 孤兒檔案（ORPHAN，2026-07-08 盤點）— 全專案零引用，與
 * pages/public/market-detail-weather/weatherApi.js 為逐字重複的雙胞胎；
 * 實際被使用的是頁面內那份。保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const DATASET = 'F-C0032-001';

// 常用縣市名稱對應 CWA 的正式地名（CWA 使用「臺」）
const CITY_MAP = {
  '台北': '臺北市',
  '臺北': '臺北市',
  '台中': '臺中市',
  '臺中': '臺中市',
  '台南': '臺南市',
  '臺南': '臺南市',
  '高雄': '高雄市',
  '桃園': '桃園市',
  '新竹': '新竹市',
  '苗栗': '苗栗縣',
  '彰化': '彰化縣',
  '南投': '南投縣',
  '雲林': '雲林縣',
  '嘉義': '嘉義市',
  '屏東': '屏東縣',
  '宜蘭': '宜蘭縣',
  '花蓮': '花蓮縣',
  '台東': '臺東縣',
  '臺東': '臺東縣',
  '澎湖': '澎湖縣',
  '金門': '金門縣',
  '連江': '連江縣',
  '基隆': '基隆市',
  '新北': '新北市',
};

function toCwaCity(name) {
  return CITY_MAP[name] || name;
}

function formatDateLabel(index) {
  if (index === 0) return '今天';
  if (index === 1) return '明天';
  if (index === 2) return '後天';
  return `第 ${index + 1} 天`;
}

function parseDateOnly(isoString) {
  return isoString.slice(0, 10);
}

function parseForecast(data, requestedCity) {
  const locations = data?.records?.location || [];
  const cwaCity = toCwaCity(requestedCity);
  const location = locations.find((l) => l.locationName === cwaCity);
  if (!location) {
    throw new Error(`找不到 ${cwaCity} 的天氣資料`);
  }

  const byDate = {};

  location.weatherElement.forEach((element) => {
    const code = element.elementName;
    element.time.forEach((entry) => {
      const date = parseDateOnly(entry.startTime);
      if (!byDate[date]) {
        byDate[date] = { date, maxTemps: [], minTemps: [], rainProbs: [], conditions: [] };
      }
      const raw = entry.parameter?.parameterName ?? '';
      const value = Number(raw);
      if (code === 'MaxT' && !Number.isNaN(value)) byDate[date].maxTemps.push(value);
      if (code === 'MinT' && !Number.isNaN(value)) byDate[date].minTemps.push(value);
      if (code === 'PoP' && !Number.isNaN(value)) byDate[date].rainProbs.push(value);
      if (code === 'Wx' && raw) byDate[date].conditions.push(raw);
    });
  });

  const days = Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d, i) => ({
      date: d.date,
      label: formatDateLabel(i),
      maxTemp: d.maxTemps.length ? Math.max(...d.maxTemps) : null,
      minTemp: d.minTemps.length ? Math.min(...d.minTemps) : null,
      rainProb: d.rainProbs.length ? Math.max(...d.rainProbs) : 0,
      condition: d.conditions[0] || '多雲時晴',
    }));

  return { city: location.locationName, days };
}

function getMockForecast(city) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // 簡單假資料，讓畫面可直接預覽
  const baseMax = city === '台北' || city === '臺北' ? 29 : city === '台南' || city === '臺南' ? 31 : 30;
  return {
    city: toCwaCity(city),
    days: [
      { date: day(0), label: '今天', maxTemp: baseMax, minTemp: baseMax - 6, rainProb: 20, condition: '多雲時晴' },
      { date: day(1), label: '明天', maxTemp: baseMax + 1, minTemp: baseMax - 5, rainProb: 40, condition: '晴時多雲' },
      { date: day(2), label: '後天', maxTemp: baseMax, minTemp: baseMax - 6, rainProb: 60, condition: '短暫陣雨' },
    ],
  };
}

export async function fetchCityForecast(city) {
  const cwaCity = toCwaCity(city);
  const key = import.meta.env.VITE_CWA_API_KEY;

  if (!key) {
    // eslint-disable-next-line no-console
    console.warn('[weatherApi] 未設定 VITE_CWA_API_KEY，使用 mock 資料預覽');
    return getMockForecast(city);
  }

  const url = `${CWA_BASE}/${DATASET}?Authorization=${encodeURIComponent(key)}&locationName=${encodeURIComponent(cwaCity)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CWA HTTP ${res.status}`);
    const data = await res.json();
    return parseForecast(data, city);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[weatherApi] 抓取失敗，使用 mock 資料：', err.message);
    return getMockForecast(city);
  }
}
