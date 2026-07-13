import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchCityForecast } from '../../pages/public/market-detail-weather/weatherApi';
import { jsonResponse, installFetchMock } from './_helpers';

// 註：此處測試實際使用的 pages/public/market-detail-weather/weatherApi.js。

// 造一筆最小可解析的 CWA F-C0032-001 回應（單一 location、單日）
function cwaPayload(locationName = '臺北市') {
  const time = (name, value) => ({
    elementName: name,
    time: [{ startTime: '2026-07-10T00:00:00', parameter: { parameterName: value } }],
  });
  return {
    records: {
      location: [{
        locationName,
        weatherElement: [
          time('MaxT', '30'),
          time('MinT', '24'),
          time('PoP', '20'),
          time('Wx', '多雲'),
        ],
      }],
    },
  };
}

describe('weatherApi.js — fetchCityForecast', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = installFetchMock();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('沒有 API key → 回 mock 資料（3 天、地名經 CITY_MAP 轉換），不打 fetch', async () => {
    vi.stubEnv('VITE_CWA_API_KEY', '');

    const result = await fetchCityForecast('台北');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.city).toBe('臺北市');
    expect(result.days).toHaveLength(3);
    expect(result.days.map((d) => d.label)).toEqual(['今天', '明天', '後天']);
  });

  it('有 key 且 fetch 成功 → parseForecast 解析真實資料', async () => {
    vi.stubEnv('VITE_CWA_API_KEY', 'secret-key');
    fetchMock.mockResolvedValueOnce(jsonResponse(cwaPayload('臺北市')));

    const result = await fetchCityForecast('台北');

    // URL 帶 Authorization 與轉換後地名
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('Authorization=secret-key');
    expect(url).toContain(`locationName=${encodeURIComponent('臺北市')}`);

    expect(result.city).toBe('臺北市');
    expect(result.days).toEqual([
      expect.objectContaining({
        date: '2026-07-10',
        label: '今天',
        maxTemp: 30,
        minTemp: 24,
        rainProb: 20,
        condition: '多雲',
      }),
    ]);
  });

  it('有 key 但 HTTP 非 ok → fallback 回 mock 資料', async () => {
    vi.stubEnv('VITE_CWA_API_KEY', 'secret-key');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });

    const result = await fetchCityForecast('台北');
    expect(result.days).toHaveLength(3);
    expect(result.city).toBe('臺北市');
  });

  it('有 key 但 fetch reject → fallback 回 mock 資料', async () => {
    vi.stubEnv('VITE_CWA_API_KEY', 'secret-key');
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await fetchCityForecast('台北');
    expect(result.days).toHaveLength(3);
  });

  it('找不到對應 location → fallback 回 mock 資料', async () => {
    vi.stubEnv('VITE_CWA_API_KEY', 'secret-key');
    // 回一個地名不符的 payload → parseForecast throw → catch fallback
    fetchMock.mockResolvedValueOnce(jsonResponse(cwaPayload('高雄市')));

    const result = await fetchCityForecast('台北');
    expect(result.days).toHaveLength(3);
  });
});
