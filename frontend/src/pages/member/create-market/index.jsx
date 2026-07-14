import { useState } from 'react';
import { createMarket, submitMarket } from '../../../api/marketApi';
import Button from '../../../components/common/Button';
import useUiStore from '../../../store/uiStore';
import { CURRENT_EVENT_CATEGORY_CODE } from '../../../types/market';
import './CreateMarketPage.css';

const marketTypeLabels = {
  BINARY: '二元（YES/NO）',
  COUNT_RANGE: '區間',
  MULTIPLE_CHOICE: '多選',
};

function formatCloseAt(value) {
  return value ? value.replace('T', ' ') : '尚未設定';
}

export default function CreateMarketPage() {
  const [form, setForm] = useState({ title: '', description: '', category: '', marketType: 'BINARY', sourceUrl: '', tradingViewChart: '', resolutionRule: '', closeAt: '' });
  const [closeAtText, setCloseAtText] = useState('選擇日期時間');
  const [errors, setErrors] = useState({});
  const { showToast } = useUiStore();

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); }

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
    if (!form.resolutionRule.trim()) e.resolutionRule = '請輸入裁決規則';
    if (!form.closeAt.trim()) e.closeAt = '請選擇截止時間';
    else if (new Date(form.closeAt) <= new Date()) e.closeAt = '截止時間必須晚於現在';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildBody() {
    let closeAt = form.closeAt;
    if (closeAt && !/\d{2}:\d{2}$/.test(closeAt)) closeAt += ':00';
    return { ...form, closeAt, description: form.description || null, sourceUrl: form.sourceUrl || null };
  }

  async function handleSave() {
    if (!validate()) return;
    try {
      await createMarket(buildBody());
      showToast('success', '草稿已儲存');
    } catch (err) { showToast('danger', '儲存失敗', err.message); }
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      const market = await createMarket(buildBody());
      await submitMarket(market.id);
      showToast('success', '送審成功');
      setForm({ title: '', description: '', category: '', marketType: 'BINARY', sourceUrl: '', tradingViewChart: '', resolutionRule: '', closeAt: '' });
      setCloseAtText('選擇日期時間');
      setErrors({});
    } catch (err) { showToast('danger', '送審失敗', err.message); }
  }

  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div className="wallet-page-title">
        <h1>建立市場</h1>
        <p>賭吧! 這可是為數不多你能當到莊家的機會!</p>
      </div>
      <div className="create-market-layout">
        <div className="create-market-form-card">
          <form id="create-market-form">
            <div className="form-group">
              <label className="form-label">標題 *</label>
              <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} placeholder="輸入市場標題" value={form.title} onChange={(e) => setField('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">描述 *</label>
              <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows={3} placeholder="市場描述" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">分類 *</label>
              <select className={`form-control ${errors.category ? 'is-invalid' : ''}`} value={form.category} onChange={(e) => setField('category', e.target.value)}>
                <option value="">選擇分類</option>
                <option value="政治">政治</option>
                <option value="運動">運動</option>
                <option value="WEATHER">天氣</option>
                <option value={CURRENT_EVENT_CATEGORY_CODE}>時事</option>
                <option value="金融">金融</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">市場類型</label>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { value: 'BINARY', label: '二元（YES/NO）' },
                  { value: 'COUNT_RANGE', label: '區間' },
                  { value: 'MULTIPLE_CHOICE', label: '多選' },
                ].map((t) => (
                  <label className="form-check" key={t.value}>
                    <input type="radio" name="marketType" value={t.value} checked={form.marketType === t.value} onChange={() => setField('marketType', t.value)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">資料來源 URL *</label>
              <input className={`form-control ${errors.sourceUrl ? 'is-invalid' : ''}`} placeholder="https://" value={form.sourceUrl} onChange={(e) => setField('sourceUrl', e.target.value)} />
            </div>
            {form.category === '金融' && (
              <div className="form-group">
                <div className="create-market-field-head">
                  <label className="form-label">TradingView K線圖</label>
                  <a
                    className="create-market-field-link"
                    href="https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    點我選擇嵌入內容
                  </a>
                </div>
                <input
                  className="form-control"
                  placeholder="請貼上 TradingView K線圖網址或嵌入內容"
                  value={form.tradingViewChart}
                  onChange={(e) => setField('tradingViewChart', e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">裁決規則 *</label>
              <textarea className={`form-control ${errors.resolutionRule ? 'is-invalid' : ''}`} rows={2} placeholder="請輸入此市場的結算規則" value={form.resolutionRule} onChange={(e) => setField('resolutionRule', e.target.value)} />
            </div>
            <div className="form-group">
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
            </div>
          </form>
          <div className="create-market-actions">
            <Button variant="secondary" onClick={handleSave}>儲存草稿</Button>
            <Button onClick={handleSubmit}>建立並送審</Button>
          </div>
        </div>

        <aside className="market-preview" aria-label="市場即時預覽">
          <div className="market-preview__header">
            <span>即時預覽</span>
            <small>DRAFT</small>
          </div>
          <span className="market-preview__category">{form.category || '未選擇分類'}</span>
          <h2>{form.title || '你的市場標題會顯示在這裡'}</h2>
          <p className="market-preview__description">{form.description || '填寫市場描述，讓其他使用者快速理解預測事件。'}</p>

          <div className="market-preview__outcomes">
            <div><small>YES</small><strong>50%</strong></div>
            <div><small>NO</small><strong>50%</strong></div>
          </div>

          <dl className="market-preview__details">
            <div><dt>市場類型</dt><dd>{marketTypeLabels[form.marketType]}</dd></div>
            <div><dt>截止時間</dt><dd>{formatCloseAt(form.closeAt)}</dd></div>
            <div><dt>資料來源</dt><dd>{form.sourceUrl || '尚未提供'}</dd></div>
            {form.category === '金融' && (
              <div><dt>TradingView K線圖</dt><dd>{form.tradingViewChart || '尚未提供'}</dd></div>
            )}
            <div><dt>裁決規則</dt><dd>{form.resolutionRule || '尚未提供'}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
