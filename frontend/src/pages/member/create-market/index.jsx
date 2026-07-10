import { useState } from 'react';
import { createMarket, submitMarket } from '../../../api/marketApi';
import useUiStore from '../../../store/uiStore';
import Button from '../../../components/common/Button';

export default function CreateMarketPage() {
  const [form, setForm] = useState({ title: '', description: '', category: '', marketType: 'BINARY', sourceUrl: '', resolutionRule: '', closeAt: '' });
  const [errors, setErrors] = useState({});
  const { showToast } = useUiStore();

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = '請輸入標題';
    if (!form.category.trim()) e.category = '請選擇分類';
    if (!form.resolutionRule.trim()) e.resolutionRule = '請輸入裁決規則';
    if (!form.closeAt.trim()) e.closeAt = '請選擇截止時間';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    try {
      await createMarket(form);
      showToast('success', '草稿已儲存');
    } catch (err) { showToast('danger', '儲存失敗', err.message); }
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      const market = await createMarket(form);
      await submitMarket(market.id);
      showToast('success', '送審成功');
    } catch (err) { showToast('danger', '送審失敗', err.message); }
  }

  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div className="wallet-page-title">
        <h1>建立市場</h1>
        <p>建立一個新的預測市場事件</p>
      </div>
      <div style={{ maxWidth: 720, marginTop: 30, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 28, padding: 32 }}>
        <form id="create-market-form">
          <div className="form-group">
            <label className="form-label">標題 *</label>
            <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} placeholder="輸入市場標題" value={form.title} onChange={(e) => setField('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea className="form-control" rows={3} placeholder="市場描述（選填）" value={form.description} onChange={(e) => setField('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">分類 *</label>
            <select className={`form-control ${errors.category ? 'is-invalid' : ''}`} value={form.category} onChange={(e) => setField('category', e.target.value)}>
              <option value="">選擇分類</option>
              <option value="金融">金融</option><option value="加密">加密</option><option value="政治">政治</option>
              <option value="體育">體育</option><option value="科技">科技</option><option value="娛樂">娛樂</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">市場類型</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {['BINARY', 'MULTIPLE', 'SCALAR'].map((t) => (
                <label className="form-check" key={t}>
                  <input type="radio" name="marketType" value={t} checked={form.marketType === t} onChange={() => setField('marketType', t)} />
                  {t === 'BINARY' ? '二元' : t === 'MULTIPLE' ? '多元' : '數值'}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">資料來源 URL</label>
            <input className="form-control" placeholder="https://" value={form.sourceUrl} onChange={(e) => setField('sourceUrl', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">裁決規則 *</label>
            <textarea className={`form-control ${errors.resolutionRule ? 'is-invalid' : ''}`} rows={2} placeholder="請輸入此市場的結算規則" value={form.resolutionRule} onChange={(e) => setField('resolutionRule', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">截止時間 *</label>
            <input type="datetime-local" className={`form-control ${errors.closeAt ? 'is-invalid' : ''}`} value={form.closeAt} onChange={(e) => setField('closeAt', e.target.value)} />
          </div>
        </form>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button variant="secondary" onClick={handleSave}>儲存草稿</Button>
          <Button onClick={handleSubmit}>建立並送審</Button>
        </div>
      </div>
    </div>
  );
}
