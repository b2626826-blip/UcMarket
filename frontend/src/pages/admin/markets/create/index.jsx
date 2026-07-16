import { useEffect, useRef, useState } from 'react';
import { createMarket, searchTradingViewSymbols, submitMarket } from '../../../../api/marketApi';
import useUiStore from '../../../../store/uiStore';
import { CURRENT_EVENT_CATEGORY_CODE } from '../../../../types/market';
import './CreateMarketPage.css';

const FINANCE_CATEGORY = '金融';
const SYMBOL_SEARCH_DEBOUNCE_MS = 300;

const marketTypeLabels = {
  BINARY: '二元（YES/NO）',
  COUNT_RANGE: '區間',
  MULTIPLE_CHOICE: '多選',
};

const CATEGORY_OPTS = [
  { label: '政治', value: '政治' },
  { label: '運動', value: '運動' },
  { label: '天氣', value: 'WEATHER' },
  { label: '時事', value: CURRENT_EVENT_CATEGORY_CODE },
  { label: '金融', value: FINANCE_CATEGORY },
];
const categoryLabel = (v) => CATEGORY_OPTS.find((c) => c.value === v)?.label || v;

const emptyForm = {
  title: '', description: '', category: '', marketType: 'BINARY',
  sourceUrl: '', imageUrl: '', tradingViewSymbol: '', resolutionRule: '', closeAt: '',
};

function isTradingViewEmbed(value) {
  return /<[^>]+>|widget|script/i.test(value);
}

export default function CreateMarketPage() {
  const showToast = useUiStore((s) => s.showToast);
  const [form, setForm] = useState(emptyForm);
  const [closeAtText, setCloseAtText] = useState('選擇日期時間');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const [symbolSearchOpen, setSymbolSearchOpen] = useState(false);
  const [symbolSearchLoading, setSymbolSearchLoading] = useState(false);
  const [symbolSearchMessage, setSymbolSearchMessage] = useState('');
  const symbolBlurTimeoutRef = useRef(null);

  function update(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'category') {
        if (v !== FINANCE_CATEGORY) next.tradingViewSymbol = '';
        if (v !== CURRENT_EVENT_CATEGORY_CODE) next.imageUrl = '';
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: false }));
  }

  function handleDateChange(e) {
    const val = e.target.value;
    update('closeAt', val);
    if (val) {
      const d = new Date(val);
      const pad = (n) => String(n).padStart(2, '0');
      setCloseAtText(`${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setCloseAtText('選擇日期時間');
    }
  }

  function validateUrl(url) {
    if (!url.trim()) return false;
    try { new URL(url); return true; } catch { return false; }
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = true;
    if (!form.category) errs.category = true;
    if (!form.description.trim()) errs.description = true;
    if (!form.sourceUrl.trim() || !validateUrl(form.sourceUrl)) errs.sourceUrl = true;
    if (form.category === CURRENT_EVENT_CATEGORY_CODE && form.imageUrl.trim() && !validateUrl(form.imageUrl)) {
      errs.imageUrl = true;
    }
    if (form.category === FINANCE_CATEGORY && isTradingViewEmbed(form.tradingViewSymbol)) {
      errs.tradingViewSymbol = true;
    }
    if (!form.resolutionRule.trim()) errs.resolutionRule = true;
    if (!form.closeAt) errs.closeAt = true;
    else if (new Date(form.closeAt) <= new Date()) errs.closeAt = true;
    setErrors(errs);
    if (Object.keys(errs).length) {
      showToast('danger', '欄位不足', '請填寫所有必填欄位（標題、分類、描述、來源網址、裁決規則、截止時間）。');
      return false;
    }
    return true;
  }

  function buildBody() {
    let closeAt = form.closeAt;
    if (closeAt && !/\d{2}:\d{2}$/.test(closeAt)) closeAt += ':00';
    return {
      title: form.title,
      description: form.description || null,
      category: form.category,
      marketType: form.marketType,
      sourceUrl: form.sourceUrl || null,
      imageUrl: form.category === CURRENT_EVENT_CATEGORY_CODE
        ? (form.imageUrl.trim() || null)
        : null,
      tradingViewSymbol: form.category === FINANCE_CATEGORY
        ? (form.tradingViewSymbol.trim() || null)
        : null,
      resolutionRule: form.resolutionRule,
      closeAt,
    };
  }

  function clearSymbolSearchState() {
    setSymbolSuggestions([]);
    setSymbolSearchOpen(false);
    setSymbolSearchLoading(false);
    setSymbolSearchMessage('');
  }

  function handleSymbolSelect(symbol) {
    update('tradingViewSymbol', symbol);
    setSymbolSearchOpen(false);
    setSymbolSearchMessage('');
  }

  async function saveDraft() {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const market = await createMarket(buildBody());
      showToast('success', '草稿已儲存', `事件「${market.title}」已儲存為草稿（DRAFT）。`);
      resetForm();
    } catch (err) { showToast('danger', '儲存失敗', err.message); }
    setSubmitting(false);
  }

  async function createAndSubmit() {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const market = await createMarket(buildBody());
      await submitMarket(market.id);
      showToast('success', '送審成功', '事件已建立並送審（PENDING）。');
      resetForm();
    } catch (err) { showToast('danger', '送審失敗', err.message); }
    setSubmitting(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setCloseAtText('選擇日期時間');
    setErrors({});
    clearSymbolSearchState();
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
    if (symbolBlurTimeoutRef.current) window.clearTimeout(symbolBlurTimeoutRef.current);
  }, []);

  const wrapperRef = (el) => {
    if (el) {
      const input = el.querySelector('input[type="datetime-local"]');
      el.onclick = () => { if (input?.showPicker) input.showPicker(); else input?.focus(); };
    }
  };

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">建立市場</h1>
        <p className="text-secondary mb-0">建立新的預測市場，儲存草稿後可再送審核准。</p>
      </div>

      <div className="alert alert-info d-flex align-items-center gap-2 mb-3 py-2">
        <i className="bi bi-info-circle"></i>
        <span>流程：填寫資料 → 儲存草稿（DRAFT） → 送審（PENDING） → 核准上架（ACTIVE）<br /><small style={{ color: '#b0a890' }}>標題、分類、描述、來源網址、裁決規則、截止時間為必填；金融／時事另有條件欄位</small></span>
      </div>

      <div className="admin-create-market-layout">
        <div className="block-card">
          <div className="block-card-header"><i className="bi bi-plus-circle text-primary"></i> 市場基本資訊</div>
          <div className="block-card-body">
            <form onSubmit={(e) => e.preventDefault()} noValidate>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">標題</label>
                  <input type="text" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="例如：比特幣會在 2026 年底前突破 20 萬美元嗎？" />
                  {errors.title && <div className="invalid-feedback">請輸入事件標題</div>}
                </div>
                <div className="col-12">
                  <label className="form-label">描述</label>
                  <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="請詳細描述事件的背景、範圍與判斷方式..."></textarea>
                  {errors.description && <div className="invalid-feedback">請輸入事件描述</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label">分類</label>
                  <select className={`form-select ${errors.category ? 'is-invalid' : ''}`} value={form.category} onChange={(e) => update('category', e.target.value)}>
                    <option value="">請選擇分類</option>
                    {CATEGORY_OPTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {errors.category && <div className="invalid-feedback">請選擇分類</div>}
                </div>
                {/** 專案預設市場類型為二元，暫不開放選擇
                <div className="col-md-6">
                  <label className="form-label">事件類型</label>
                  <div className="d-flex gap-3 pt-1">
                    {[
                      { id: 'type-binary', value: 'BINARY', label: '二元（YES/NO）' },
                      { id: 'type-range', value: 'COUNT_RANGE', label: '區間' },
                      { id: 'type-multi', value: 'MULTIPLE_CHOICE', label: '多選' },
                    ].map((t) => (
                      <div key={t.id} className="form-check">
                        <input className="form-check-input" type="radio" name="marketType" id={t.id} value={t.value} checked={form.marketType === t.value} onChange={(e) => update('marketType', e.target.value)} />
                        <label className="form-check-label" htmlFor={t.id}>{t.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
                */}
                <div className="col-12">
                  <label className="form-label">來源網址</label>
                  <input type="url" className={`form-control ${errors.sourceUrl ? 'is-invalid' : ''}`} value={form.sourceUrl} onChange={(e) => update('sourceUrl', e.target.value)} placeholder="https://example.com/news/article" />
                  {errors.sourceUrl && <div className="invalid-feedback">請輸入來源網址</div>}
                </div>

                {form.category === CURRENT_EVENT_CATEGORY_CODE && (
                  <div className="col-12">
                    <label className="form-label">圖片網址（選填）</label>
                    <input type="url" className={`form-control ${errors.imageUrl ? 'is-invalid' : ''}`} value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://example.com/news/image.jpg" />
                    {errors.imageUrl && <div className="invalid-feedback">請輸入有效的圖片網址</div>}
                  </div>
                )}

                {form.category === FINANCE_CATEGORY && (
                  <div className="col-12">
                    <div className="create-market-field-head">
                      <label className="form-label mb-0">TradingView 商品代碼</label>
                      <a
                        className="create-market-field-link"
                        href="https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看 TradingView 文件
                      </a>
                    </div>
                    <div className="symbol-autocomplete mt-2">
                      <input
                        className={`form-control ${errors.tradingViewSymbol ? 'is-invalid' : ''}`}
                        placeholder="例如 AAPL、Apple、ETH、台積電；可點選建議代號"
                        value={form.tradingViewSymbol}
                        autoComplete="off"
                        onChange={(event) => {
                          update('tradingViewSymbol', event.target.value);
                          setSymbolSearchOpen(true);
                        }}
                        onFocus={() => {
                          if (symbolBlurTimeoutRef.current) window.clearTimeout(symbolBlurTimeoutRef.current);
                          if (symbolSuggestions.length > 0 || symbolSearchMessage) setSymbolSearchOpen(true);
                        }}
                        onBlur={() => {
                          symbolBlurTimeoutRef.current = window.setTimeout(() => setSymbolSearchOpen(false), 120);
                        }}
                      />
                      {(symbolSearchOpen || symbolSearchLoading || symbolSearchMessage) && (
                        <div className="symbol-autocomplete__panel">
                          {symbolSearchLoading && <div className="symbol-autocomplete__status">搜尋中...</div>}
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
                    {errors.tradingViewSymbol && (
                      <div className="invalid-feedback d-block">請輸入 TradingView 商品代碼，不接受整段 embed HTML</div>
                    )}
                  </div>
                )}

                <div className="col-md-8">
                  <label className="form-label">裁決規則</label>
                  <textarea className={`form-control ${errors.resolutionRule ? 'is-invalid' : ''}`} rows="2" value={form.resolutionRule} onChange={(e) => update('resolutionRule', e.target.value)} placeholder="說明事件結果的裁決依據與資料來源..."></textarea>
                  {errors.resolutionRule && <div className="invalid-feedback">請輸入裁決規則</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">截止時間</label>
                  <div className={`date-picker-wrapper ${errors.closeAt ? 'is-invalid' : ''}`} ref={wrapperRef}>
                    <i className="bi bi-calendar3"></i>
                    <span className={`date-picker-text ${form.closeAt ? 'has-value' : ''}`}>{closeAtText}</span>
                    <input type="datetime-local" value={form.closeAt} onChange={handleDateChange} />
                  </div>
                  {errors.closeAt && <div className="invalid-feedback">請選擇截止時間</div>}
                </div>
              </div>
            </form>
          </div>
          <div className="p-3 d-flex gap-2 justify-content-end" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 var(--bs-border-radius,4px) var(--bs-border-radius,4px)' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={saveDraft} disabled={submitting}><i className="bi bi-file-earmark"></i> 儲存草稿</button>
            <button type="button" className="btn btn-primary" onClick={createAndSubmit} disabled={submitting}><i className="bi bi-send"></i> 建立並送審</button>
          </div>
        </div>

        <aside className="admin-market-preview" aria-label="市場即時預覽">
          <div className="admin-market-preview__header">
            <span>即時預覽</span>
            <small>DRAFT</small>
          </div>
          <span className="admin-market-preview__category">{form.category ? categoryLabel(form.category) : '未選擇分類'}</span>
          <h2>{form.title || '你的市場標題會顯示在這裡'}</h2>
          <p className="admin-market-preview__description">{form.description || '填寫市場描述，讓使用者快速理解預測事件。'}</p>

          <div className="admin-market-preview__outcomes">
            <div><small>YES</small><strong>50%</strong></div>
            <div><small>NO</small><strong>50%</strong></div>
          </div>

          <dl className="admin-market-preview__details">
            {/** 市場類型預設為二元，暫不顯示
            <div><dt>市場類型</dt><dd>{marketTypeLabels[form.marketType]}</dd></div>
            */}
            <div><dt>截止時間</dt><dd>{form.closeAt ? closeAtText : '尚未設定'}</dd></div>
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
    </>
  );
}
