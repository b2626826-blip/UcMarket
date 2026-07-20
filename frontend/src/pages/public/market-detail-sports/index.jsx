import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getMarketDetail } from '../../../api/marketApi';
import DetailPageTemplate from '../../../components/common/DetailPageTemplate';
import useGlowEffect from '../../../hooks/useGlowEffect';
import './SportsDetailPage.css';

// 狀態中文對照（與 admin 事件列表一致）
const STATUS_LABEL = {
  DRAFT: '草稿', PENDING: '待審核', ACTIVE: '進行中',
  CLOSED: '已截止', RESOLVED: '已結算', REJECTED: '已拒絕', CANCELED: '已取消',
};

// 市場類型中文對照（與建立市場表單一致）
const MARKET_TYPE_LABEL = {
  BINARY: '二元（YES/NO）', COUNT_RANGE: '區間', MULTIPLE_CHOICE: '多選',
};

// 分類 → 圖示（Font Awesome，全站 CDN 已載入）
const CATEGORY_ICON = {
  運動: 'fa-futbol', 政治: 'fa-landmark', 天氣: 'fa-cloud-sun',
  時事: 'fa-newspaper', 經濟: 'fa-chart-line',
};

// YES/NO 價格是用池子算出來的，不是建立者填的
function priceFromPools(yesPool, noPool) {
  const total = (yesPool || 0) + (noPool || 0);
  if (!total) return { yes: 0.5, no: 0.5 };
  return { yes: yesPool / total, no: noPool / total };
}

function formatClose(val) {
  if (!val) return '—';
  return val.replace('T', ' ').substring(0, 16);
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const sec = (Date.now() - d.getTime()) / 1000;
  if (sec < 3600) return Math.max(1, Math.floor(sec / 60)) + ' 分鐘前';
  if (sec < 86400) return Math.floor(sec / 3600) + ' 小時前';
  return Math.floor(sec / 86400) + ' 天前';
}

// 把市場標題洗成查詢字串：去標點 + 去問句/時間填充字。
// 實測（15 題真實二元標題直打 Google News）：整句就有 15/15 命中，Google 搜尋沒問題；
// 這裡只是把「嗎/本場/本季」等對搜尋沒幫助的字拿掉，讓冷門隊名更容易被撈到。
function titleToQuery(title) {
  if (!title) return '';
  return title
    .replace(/[？?！!。，,、.；;：:（）()「」『』《》〈〉[\]{}"'“”~～·\-—_|/\\]/g, ' ')
    .replace(/(會不會|是不是|是否|能不能|嗎|呢|吧|喔|將會|本場|這場|本輪|下半季|本週|本季|本月|年底前|今日|今天|明天|後天)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 每個代理嘗試都套一個 timeout：掛掉的代理不會 hang 住 cascade，才能往下一個換。
// 合併「元件卸載的 signal」與「單次 timeout」，任一觸發就中止這次 fetch。
function fetchWithTimeout(url, signal, ms = 6000) {
  const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
  return fetch(url, { signal: combined });
}

// 解析 Google News RSS 的 XML → 前 6 則
function parseNewsXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.querySelectorAll('item')).slice(0, 6).map((el) => ({
    title: el.querySelector('title')?.textContent || '',
    link: el.querySelector('link')?.textContent || '',
    pubDate: el.querySelector('pubDate')?.textContent || '',
    guid: el.querySelector('guid')?.textContent || '',
  }));
}

// 抓公開新聞：Google News RSS。瀏覽器有跨網域限制（CORS），Google News 不給 CORS header，
// 所以一定要走公開代理；免費代理個別都不穩，因此串接多個、有一個活就好。
// 實測：rss2json 通常最快（免費上限約 10 則）；corsproxy 需要瀏覽器 Origin（node 測不到）；allorigins 常暫掛。
async function fetchNews(query, signal) {
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

  // 1) rss2json：直接回 JSON、有 CORS
  try {
    const res = await fetchWithTimeout(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=8`, signal);
    const data = await res.json();
    if (data.status === 'ok' && Array.isArray(data.items) && data.items.length) {
      return data.items.slice(0, 6).map((it) => ({ title: it.title, link: it.link, pubDate: it.pubDate, guid: it.guid }));
    }
  } catch (e) { if (e.name === 'AbortError') throw e; }

  // 2) corsproxy.io：回原始 XML（瀏覽器自動帶 Origin，多半可用）
  try {
    const res = await fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(rss)}`, signal);
    if (res.ok) { const items = parseNewsXml(await res.text()); if (items.length) return items; }
  } catch (e) { if (e.name === 'AbortError') throw e; }

  // 3) allorigins：回原始 XML，代理常暫掛，重試 2 次
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(rss)}`, signal);
      const items = parseNewsXml(await res.text());
      if (items.length) return items;
    } catch (e) { if (e.name === 'AbortError') throw e; }
  }

  return [];
}

// 抓相關 YouTube 影片：走 Piped（YouTube 免 key 前端），多實例串接。
// 只取 videoId → 縮圖用 i.ytimg.com（Google CDN、免代理、100% 顯示），連結回官方 YouTube。
// best-effort：整段抓不到就交給下方保底的「YouTube 搜尋」按鈕，不影響新聞與版面。
async function fetchVideos(query, signal) {
  const instances = [
    'https://api.piped.private.coffee',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.leptons.xyz',
  ];
  for (const base of instances) {
    try {
      const res = await fetchWithTimeout(`${base}/search?q=${encodeURIComponent(query)}&filter=videos`, signal, 5000);
      if (!res.ok) continue;
      const data = await res.json();
      const items = (data.items || [])
        .filter((it) => it.url && it.url.includes('v='))
        .slice(0, 3)
        .map((it) => ({
          videoId: it.url.split('v=')[1].split('&')[0],
          title: it.title || '',
          uploader: it.uploaderName || '',
        }));
      if (items.length) return items;
    } catch (e) { if (e.name === 'AbortError') throw e; }
  }
  return [];
}

// 相關內容區塊 = 三層，確保「永遠不空、不破版」：
//   1) 新聞文字（多代理串接）2) YouTube 影片卡（縮圖，best-effort）3) 保底搜尋按鈕（一定顯示）
// 關鍵字直接用市場標題（實測整句即可命中），查不到退回分類。
function RelatedContent({ title, category }) {
  const query = titleToQuery(title) || category || '';
  const [news, setNews] = useState({ loading: true, items: [] });
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    if (!query) { setNews({ loading: false, items: [] }); return; }
    const ctrl = new AbortController();
    setNews({ loading: true, items: [] });
    setVideos([]);

    // 新聞（主線）：標題查不到 → 退回分類
    (async () => {
      try {
        let items = await fetchNews(query, ctrl.signal);
        if (!items.length && category && category !== query) items = await fetchNews(category, ctrl.signal);
        setNews({ loading: false, items });
      } catch (e) { if (e.name !== 'AbortError') setNews({ loading: false, items: [] }); }
    })();

    // 影片（副線）：抓不到就靜默，交給保底按鈕，不擋新聞
    (async () => {
      try { setVideos(await fetchVideos(query, ctrl.signal)); }
      catch (e) { if (e.name !== 'AbortError') setVideos([]); }
    })();

    return () => ctrl.abort();
  }, [query, category]);

  const gnewsUrl = `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  return (
    <section className="trade-market-card" style={{ marginTop: 24 }}>
      <h3 className="news-head"><i className="fa-solid fa-newspaper"></i> 相關新聞與影片</h3>
      <p className="news-sub">與「{query}」相關的即時報導</p>

      {/* 1) 新聞文字 */}
      {news.loading && <p className="news-status">載入中…</p>}
      {!news.loading && news.items.length === 0 && (
        <p className="news-status">深度搜尋中…完整結果可用下方按鈕直接查看。</p>
      )}
      {news.items.length > 0 && (
        <div className="news-list">
          {news.items.map((it, i) => {
            const parts = (it.title || '').split(' - ');
            const source = parts.length > 1 ? parts.pop() : '';
            const headline = parts.join(' - ');
            return (
              <a key={it.guid || it.link || i} className="news-item" href={it.link} target="_blank" rel="noreferrer">
                <span className="news-title">{headline}</span>
                <span className="news-meta">
                  {source && <span className="news-source">{source}</span>}
                  {timeAgo(it.pubDate)}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* 2) YouTube 影片卡（縮圖走 Google CDN，best-effort） */}
      {videos.length > 0 && (
        <div className="video-grid">
          {videos.map((v) => (
            <a key={v.videoId} className="video-card"
              href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer">
              <div className="video-thumb">
                <img src={`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`} alt="" loading="lazy" />
                <span className="video-play"><i className="fa-solid fa-play"></i></span>
              </div>
              <span className="video-title">{v.title}</span>
              {v.uploader && <span className="video-uploader">{v.uploader}</span>}
            </a>
          ))}
        </div>
      )}

      {/* 3) 保底：一定顯示，代理全掛也不破版 */}
      <div className="news-actions">
        <a href={gnewsUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-newspaper"></i> 在 Google News 搜尋</a>
        <a href={ytUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-youtube"></i> 在 YouTube 搜尋</a>
      </div>
    </section>
  );
}

export default function SportsDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useGlowEffect('.trade-market-card, .trade-panel');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getMarketDetail(id)
      .then((data) => {
        if (!active) return;
        if (!['運動', 'sports'].includes(String(data?.category).toLowerCase())) {
          throw new Error('這筆資料不是運動市場');
        }
        setMarket(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || '市場詳情載入失敗');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading || error || !market) {
    return (
      <DetailPageTemplate id={id} category="運動" subtitle="運動賽事預測市場" marketId={id} tradePanel={<div className='trade-panel'><p>
        {loading ? '市場資料載入中…' : '此市場目前無法交易'}
      </p></div>}>
        <p style={{ padding: '48px 16px', textAlign: 'center', color: error ? '#ff476d' : '#8f8f8f' }}>
          {loading ? '運動市場載入中...' : error || '找不到運動市場'}
        </p>
      </DetailPageTemplate>
    );
  }

  const price = priceFromPools(market.yesPool, market.noPool);
  const isBinary = market.marketType === 'BINARY';
  const icon = CATEGORY_ICON[market.category] || 'fa-medal';

  return (
    <DetailPageTemplate
      id={market.code || id}
      category={market.title}
      subtitle="運動賽事預測市場"
      marketId={market.id ?? id}
      market={market}
    >
      <div className="trade-market-card">
        <div className="trade-card-header">
          <div>
            <div className="market-type"><i className={`fa-solid ${icon}`}></i> {market.category}</div>
            {market.description && <p>{market.description}</p>}
          </div>
          <div className={`market-status ${market.status === 'ACTIVE' ? 'live' : ''}`}>
            <i className="fa-solid fa-circle"></i> {STATUS_LABEL[market.status] || market.status}
          </div>
        </div>

        {isBinary ? (
          <div className="price-board">
            <div className="price-box yes-price">
              <span>YES 價格</span>
              <strong>${price.yes.toFixed(2)}</strong>
              <p>{(price.yes * 100).toFixed(1)}% 看好</p>
            </div>
            <div className="price-box no-price">
              <span>NO 價格</span>
              <strong>${price.no.toFixed(2)}</strong>
              <p>{(price.no * 100).toFixed(1)}% 看衰</p>
            </div>
          </div>
        ) : (
          <div className="price-board" style={{ gridTemplateColumns: '1fr' }}>
            <div className="price-box">
              <span>市場類型</span>
              <strong style={{ fontSize: 26 }}>{MARKET_TYPE_LABEL[market.marketType] || market.marketType}</strong>
              <p>請於右側交易面板選擇下注選項</p>
            </div>
          </div>
        )}

        <div className="market-meta">
          <div><span>YES 池</span><strong>{(market.yesPool || 0).toLocaleString()}</strong></div>
          <div><span>NO 池</span><strong>{(market.noPool || 0).toLocaleString()}</strong></div>
          <div><span>截止時間</span><strong>{formatClose(market.closeAt)}</strong></div>
        </div>
      </div>

      {/* 裁決規則 + 資料來源：都是建立市場時填的真實欄位 */}
      <section className="trade-market-card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>裁決規則</h3>
        <p style={{ color: '#8f8f8f', lineHeight: 1.7 }}>{market.resolutionRule}</p>
        {market.sourceUrl && (
          <p style={{ marginTop: 16 }}>
            <a href={market.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>
              <i className="fa-solid fa-link"></i> 資料來源
            </a>
          </p>
        )}
      </section>

      {/* 相關新聞與影片：新聞(多代理) + YouTube 影片卡(Piped) + 保底搜尋按鈕 */}
      <RelatedContent title={market.title} category={market.category} />
    </DetailPageTemplate>
  );
}
