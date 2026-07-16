import { useCallback, useEffect, useRef, useState } from 'react';
import { createMarket, getMyMarkets, searchTradingViewSymbols, submitMarket } from '../../../api/marketApi';
import Button from '../../../components/common/Button';
import useUiStore from '../../../store/uiStore';
import { CURRENT_EVENT_CATEGORY_CODE } from '../../../types/market';
import { formatTime } from '../../../utils/format';
import './CreateMarketPage.css';

const FINANCE_CATEGORY = '金融';
const SYMBOL_SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

const CATEGORY_OPTS = [
  { label: '政治', value: '政治' },
  { label: '運動', value: '運動' },
  { label: '天氣', value: 'WEATHER' },
  { label: '時事', value: CURRENT_EVENT_CATEGORY_CODE },
  { label: '金融', value: FINANCE_CATEGORY },
];
const categoryLabel = (v) => CATEGORY_OPTS.find((c) => c.value === v)?.label || v || '—';

const REVIEW_STATUS = {
  PENDING: { label: '送審中', tone: 'pending' },
  ACTIVE: { label: '通過', tone: 'passed' },
  CLOSED: { label: '通過', tone: 'passed' },
  RESOLVED: { label: '通過', tone: 'passed' },
  REJECTED: { label: '未通過', tone: 'rejected' },
};

function reviewStatus(status) {
  return REVIEW_STATUS[status] || null;
}

const initialForm = {
  title: '',
  description: '',
  category: '',
  marketType: 'BINARY',
  sourceUrl: '',
  imageUrl: '',
  tradingViewSymbol: '',
  resolutionRule: '',
  closeAt: '',
};

function formatCloseAt(value) {
  return value ? value.replace('T', ' ') : '尚未設定';
}

function isTradingViewEmbed(value) {
  return /<[^>]+>|widget|script/i.test(value);
}

export default function CreateMarketPage() {
  const [form, setForm] = useState(initialForm);
  const [closeAtText, setCloseAtText] = useState('選擇日期時間');
  const [errors, setErrors] = useState({});
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const [symbolSearchOpen, setSymbolSearchOpen] = useState(false);
  const [symbolSearchLoading, setSymbolSearchLoading] = useState(false);
  const [symbolSearchMessage, setSymbolSearchMessage] = useState('');
  const symbolBlurTimeoutRef = useRef(null);
  const { showToast } = useUiStore();
  const [myMarkets, setMyMarkets] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listPage, setListPage] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(0);
  const [listTotal, setListTotal] = useState(0);

  const loadMyMarkets = useCallback(async (page = 0) => {
    setListLoading(true);
    try {
      const data = await getMyMarkets({ page, size: PAGE_SIZE });
      const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      setMyMarkets(list.filter((m) => reviewStatus(m.status)));
      setListPage(data?.page ?? page);
      setListTotalPages(data?.totalPages ?? 1);
      setListTotal(data?.totalElements ?? list.length);
    } catch {
      setMyMarkets([]);
      setListTotalPages(0);
      setListTotal(0);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyMarkets(0);
  }, [loadMyMarkets]);

  function setField(k, v) {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === 'category') {
        if (v !== FINANCE_CATEGORY) next.tradingViewSymbol = '';
        if (v !== CURRENT_EVENT_CATEGORY_CODE) next.imageUrl = '';
      }
      return next;
    });
    setErrors((p) => ({ ...p, [k]: '' }));
  }

  function handleDateChange(e) {
    const value = e.target.value;
    setField('closeAt', value);
    if (!value) {
      setCloseAtText('選擇日期時間');
      return;
    }
    const date = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    setCloseAtText(`${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`);
  }

  function validateUrl(url) {
    if (!url.trim()) return false;
    try { new URL(url); return true; } catch { return false; }
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = '請輸入標題';
    if (!form.category.trim()) e.category = '請選擇分類';
    if (!form.description.trim()) e.description = '請輸入描述';
    if (!form.sourceUrl.trim() || !validateUrl(form.sourceUrl)) e.sourceUrl = '請輸入有效的來源網址';
    if (form.category === CURRENT_EVENT_CATEGORY_CODE && form.imageUrl.trim() && !validateUrl(form.imageUrl)) {
      e.imageUrl = '請輸入有效的圖片網址';
    }
    if (!form.resolutionRule.trim()) e.resolutionRule = '請輸入裁決規則';
    if (!form.closeAt.trim()) e.closeAt = '請選擇截止時間';
    else if (new Date(form.closeAt) <= new Date()) e.closeAt = '截止時間必須晚於現在';
    if (form.category === FINANCE_CATEGORY && isTradingViewEmbed(form.tradingViewSymbol)) {
      e.tradingViewSymbol = '請輸入 TradingView 商品代碼，例如 NASDAQ:AAPL，不接受整段 embed HTML';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildBody() {
    let closeAt = form.closeAt;
    if (closeAt && !/\d{2}:\d{2}$/.test(closeAt)) closeAt += ':00';
    return {
      ...form,
      closeAt,
      description: form.description || null,
      sourceUrl: form.sourceUrl || null,
      imageUrl: form.category === CURRENT_EVENT_CATEGORY_CODE
        ? (form.imageUrl.trim() || null)
        : null,
      tradingViewSymbol: form.category === FINANCE_CATEGORY
        ? (form.tradingViewSymbol.trim() || null)
        : null,
    };
  }

  function clearSymbolSearchState() {
    setSymbolSuggestions([]);
    setSymbolSearchOpen(false);
    setSymbolSearchLoading(false);
    setSymbolSearchMessage('');
  }

  function handleSymbolSelect(symbol) {
    setField('tradingViewSymbol', symbol);
    setSymbolSearchOpen(false);
    setSymbolSearchMessage('');
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      const market = await createMarket(buildBody());
      await submitMarket(market.id);
      showToast('success', '送審成功');
      setForm(initialForm);
      setCloseAtText('選擇日期時間');
      setErrors({});
      clearSymbolSearchState();
      setListPage(0);
      loadMyMarkets(0);
    } catch (err) { showToast('danger', '送審失敗', err.message); }
  }

  useEffect(() => {
    if (form.category !== FINANCE_CATEGORY) {
      clearSymbolSearchState();
      return undefined;
    }

    const query = form.tradingViewSymbol.trim();
    if (!query || query.length < 2 || isTradingViewEmbed(query)) {
      setSymbolSuggestions([]);
      setSymbolSearchLoading(false);
      setSymbolSearchMessage(query.length === 1 ? '至少輸入 2 個字元以搜尋代號' : '');
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSymbolSearchLoading(true);
      setSymbolSearchMessage('');

      try {
        const results = await searchTradingViewSymbols(query, { signal: controller.signal });
        setSymbolSuggestions(results.slice(0, 8));
        setSymbolSearchOpen(true);
        setSymbolSearchMessage(results.length === 0 ? '找不到相符的 TradingView 商品代碼' : '');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSymbolSuggestions([]);
        setSymbolSearchOpen(true);
        setSymbolSearchMessage('暫時無法取得 TradingView 商品代碼建議');
      } finally {
        setSymbolSearchLoading(false);
      }
    }, SYMBOL_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.category, form.tradingViewSymbol]);

  useEffect(() => () => {
    if (symbolBlurTimeoutRef.current) {
      window.clearTimeout(symbolBlurTimeoutRef.current);
    }
  }, []);

  return (
    <div className="trade-wrapper create-market-page">
      <div className="wallet-page-title">
        <h1>建立市場</h1>
        <p>賭吧! 這可是為數不多你能當到莊家的機會!</p>
      </div>

      <div className="create-market-layout">
        <div className="create-market-form-card">
          <div className="create-market-form-card__header">
            <div>
              <h2>市場基本資訊</h2>
              <p>填寫後建立並送審，等待管理員審核</p>
            </div>
            <span className="create-market-form-card__badge">＊為必填</span>
          </div>
          <form id="create-market-form" className="create-market-fields" onSubmit={(e) => e.preventDefault()}>
            <div className="create-market-field create-market-field--full">
              <label className="form-label">標題 *</label>
              <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} placeholder="例如：比特幣會在 2026 年底前突破 20 萬美元嗎？" value={form.title} onChange={(e) => setField('title', e.target.value)} />
              {errors.title && <div className="create-market-error">{errors.title}</div>}
            </div>

            <div className="create-market-field create-market-field--full">
              <label className="form-label">描述 *</label>
              <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows={3} placeholder="請詳細描述市場的背景、範圍與判斷方式..." value={form.description} onChange={(e) => setField('description', e.target.value)} />
              {errors.description && <div className="create-market-error">{errors.description}</div>}
            </div>

            <div className="create-market-field create-market-field--full">
              <label className="form-label">分類 *</label>
              <select className={`form-control ${errors.category ? 'is-invalid' : ''}`} value={form.category} onChange={(e) => setField('category', e.target.value)}>
                <option value="">請選擇分類</option>
                {CATEGORY_OPTS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && <div className="create-market-error">{errors.category}</div>}
            </div>

            {/** 專案預設市場類型為二元，暫不開放選擇
            <div className="create-market-field">
              <label className="form-label">市場類型</label>
              <div className="create-market-type-row">
                {[
                  { value: 'BINARY', label: '二元（YES/NO）' },
                  { value: 'COUNT_RANGE', label: '區間' },
                  { value: 'MULTIPLE_CHOICE', label: '多選' },
                ].map((t) => (
                  <label className="form-check create-market-type-option" key={t.value}>
                    <input type="radio" name="marketType" value={t.value} checked={form.marketType === t.value} onChange={() => setField('marketType', t.value)} />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
            */}

            <div className="create-market-field create-market-field--full">
              <label className="form-label">來源網址 *</label>
              <input className={`form-control ${errors.sourceUrl ? 'is-invalid' : ''}`} placeholder="https://example.com/news/article" value={form.sourceUrl} onChange={(e) => setField('sourceUrl', e.target.value)} />
              {errors.sourceUrl && <div className="create-market-error">{errors.sourceUrl}</div>}
            </div>
            {form.category === CURRENT_EVENT_CATEGORY_CODE && (
              <div className="create-market-field create-market-field--full">
                <label className="form-label">圖片網址（選填）</label>
                <input
                  type="url"
                  className={`form-control ${errors.imageUrl ? 'is-invalid' : ''}`}
                  placeholder="https://example.com/news/image.jpg"
                  value={form.imageUrl}
                  onChange={(e) => setField('imageUrl', e.target.value)}
                />
                {errors.imageUrl && <div className="create-market-error">{errors.imageUrl}</div>}
              </div>
            )}

            {form.category === FINANCE_CATEGORY && (
              <div className="create-market-field create-market-field--full">
                <div className="create-market-field-head">
                  <label className="form-label">TradingView 商品代碼</label>
                  <a
                    className="create-market-field-link"
                    href="https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看 TradingView 文件
                  </a>
                </div>

                <div className="symbol-autocomplete">
                  <input
                    className={`form-control ${errors.tradingViewSymbol ? 'is-invalid' : ''}`}
                    placeholder="例如 AAPL、Apple、ETH、台積電；可點選建議代號"
                    value={form.tradingViewSymbol}
                    autoComplete="off"
                    onChange={(event) => {
                      setField('tradingViewSymbol', event.target.value);
                      setSymbolSearchOpen(true);
                    }}
                    onFocus={() => {
                      if (symbolBlurTimeoutRef.current) {
                        window.clearTimeout(symbolBlurTimeoutRef.current);
                      }
                      if (symbolSuggestions.length > 0 || symbolSearchMessage) {
                        setSymbolSearchOpen(true);
                      }
                    }}
                    onBlur={() => {
                      symbolBlurTimeoutRef.current = window.setTimeout(() => {
                        setSymbolSearchOpen(false);
                      }, 120);
                    }}
                  />

                  {(symbolSearchOpen || symbolSearchLoading || symbolSearchMessage) && (
                    <div className="symbol-autocomplete__panel">
                      {symbolSearchLoading && (
                        <div className="symbol-autocomplete__status">搜尋中...</div>
                      )}

                      {!symbolSearchLoading && symbolSuggestions.map((item) => (
                        <button
                          key={`${item.symbol}-${item.description}`}
                          type="button"
                          className="symbol-autocomplete__item"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSymbolSelect(item.symbol);
                          }}
                        >
                          <span className="symbol-autocomplete__symbol">{item.symbol}</span>
                          <span className="symbol-autocomplete__meta">
                            {[item.description, item.type, item.exchange].filter(Boolean).join(' • ')}
                          </span>
                        </button>
                      ))}

                      {!symbolSearchLoading && symbolSearchMessage && (
                        <div className="symbol-autocomplete__status">{symbolSearchMessage}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="create-market-field-help">
                  輸入關鍵字後會提示相關代號，請選擇或填入 TradingView 商品代碼，例如 NASDAQ:AAPL。
                </div>

                {errors.tradingViewSymbol && <div className="create-market-error">{errors.tradingViewSymbol}</div>}
              </div>
            )}

            <div className="create-market-field create-market-field--full">
              <label className="form-label">裁決規則 *</label>
              <textarea className={`form-control ${errors.resolutionRule ? 'is-invalid' : ''}`} rows={2} placeholder="說明市場結果的裁決依據與資料來源..." value={form.resolutionRule} onChange={(e) => setField('resolutionRule', e.target.value)} />
              {errors.resolutionRule && <div className="create-market-error">{errors.resolutionRule}</div>}
            </div>

            <div className="create-market-field create-market-field--full">
              <label className="form-label">截止時間 *</label>
              <div
                className={`create-market-date-picker ${errors.closeAt ? 'is-invalid' : ''}`}
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input[type="datetime-local"]');
                  if (input?.showPicker) input.showPicker();
                  else input?.focus();
                }}
              >
                <i className="bi bi-calendar3"></i>
                <span className={`create-market-date-picker__text ${form.closeAt ? 'has-value' : ''}`}>{closeAtText}</span>
                <input type="datetime-local" value={form.closeAt} onChange={handleDateChange} />
              </div>
              {errors.closeAt && <div className="create-market-error">{errors.closeAt}</div>}
            </div>
          </form>

          <div className="create-market-actions">
            <Button onClick={handleSubmit}>建立並送審</Button>
          </div>
        </div>

        <aside className="market-preview" aria-label="市場即時預覽">
          <div className="market-preview__header">
            <div>
              <h2>即時預覽</h2>
              <p>輸入內容會即時反映在此</p>
            </div>
            {/* <span className="market-preview__badge">DRAFT</span> */}
          </div>
          <span className="market-preview__category">{form.category ? categoryLabel(form.category) : '未選擇分類'}</span>
          <h2>{form.title || '你的市場標題會顯示在這裡'}</h2>
          <p className="market-preview__description">{form.description || '填寫市場描述，讓其他使用者快速理解預測事件。'}</p>

          <div className="market-preview__outcomes">
            <div><small>YES</small><strong>50%</strong></div>
            <div><small>NO</small><strong>50%</strong></div>
          </div>

          <dl className="market-preview__details">
            <div><dt>截止時間</dt><dd>{formatCloseAt(form.closeAt)}</dd></div>
            <div><dt>資料來源</dt><dd>{form.sourceUrl || '尚未提供'}</dd></div>
            {form.category === CURRENT_EVENT_CATEGORY_CODE && (
              <div><dt>圖片網址</dt><dd>{form.imageUrl || '尚未提供'}</dd></div>
            )}
            {form.category === FINANCE_CATEGORY && (
              <div><dt>TradingView 商品代碼</dt><dd>{form.tradingViewSymbol || '尚未提供'}</dd></div>
            )}
            <div><dt>裁決規則</dt><dd>{form.resolutionRule || '尚未提供'}</dd></div>
          </dl>
        </aside>
      </div>

      <section className="my-submissions" aria-label="我的送審紀錄">
        <div className="my-submissions__header">
          <div>
            <h2>我的送審紀錄</h2>
            <p>查看你建立的市場審核進度</p>
          </div>
          <span className="my-submissions__count">{listLoading ? '…' : `${listTotal} 筆`}</span>
        </div>

        <div className="my-submissions__table-wrap">
          <table className="my-submissions__table">
            <thead>
              <tr>
                <th>審核狀態</th>
                <th>市場分類</th>
                <th>市場名稱</th>
                <th>送審時間</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={4} className="my-submissions__empty">載入中…</td>
                </tr>
              ) : !myMarkets.length ? (
                <tr>
                  <td colSpan={4} className="my-submissions__empty">
                    <i className="bi bi-inbox my-submissions__empty-icon" aria-hidden="true" />
                    尚無送審紀錄，建立並送審後會顯示在這裡
                  </td>
                </tr>
              ) : (
                myMarkets.map((m) => {
                  const rev = reviewStatus(m.status);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className={`my-submissions__badge my-submissions__badge--${rev.tone}`}>
                          <span className="my-submissions__dot" />
                          {rev.label}
                        </span>
                      </td>
                      <td>
                        <span className="my-submissions__cat">{categoryLabel(m.category)}</span>
                      </td>
                      <td className="my-submissions__title">{m.title || '—'}</td>
                      <td className="my-submissions__time">{formatTime(m.createdAt, 16) || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {listTotalPages > 1 && (
          <div className="my-submissions__pagination">
            <span className="my-submissions__page-meta">
              第 {listPage + 1} / {listTotalPages} 頁
            </span>
            <div className="my-submissions__page-btns">
              <button
                type="button"
                className="my-submissions__page-btn"
                disabled={listLoading || listPage <= 0}
                onClick={() => loadMyMarkets(listPage - 1)}
              >
                上一頁
              </button>
              <button
                type="button"
                className="my-submissions__page-btn"
                disabled={listLoading || listPage >= listTotalPages - 1}
                onClick={() => loadMyMarkets(listPage + 1)}
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
