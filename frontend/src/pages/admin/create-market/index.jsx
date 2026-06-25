import { useState } from 'react';
import { createMarket, submitMarket } from '../../../api/marketApi';

export default function CreateMarketPage() {
  const [form, setForm] = useState({
    title: '', description: '', category: '', marketType: 'BINARY',
    sourceUrl: '', resolutionRule: '', closeAt: '',
  });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); }

  function showToast(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3000);
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = true;
    if (!form.category.trim()) e.category = true;
    if (!form.resolutionRule.trim()) e.resolutionRule = true;
    if (!form.closeAt.trim()) e.closeAt = true;
    setErrors(e);
    if (Object.keys(e).length) showToast('danger', '欄位不足', '請填寫所有必填欄位');
    return Object.keys(e).length === 0;
  }

  function buildBody() {
    let closeAt = form.closeAt;
    if (closeAt && !closeAt.includes(':SS')) closeAt += ':00';
    return { ...form, closeAt };
  }

  async function handleSave() {
    if (!validate()) return;
    try {
      const m = await createMarket(buildBody());
      showToast('success', '草稿已儲存', `「${m.title}」已儲存為草稿`);
      resetForm();
    } catch (err) { showToast('danger', '儲存失敗', err.message); }
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      const m = await createMarket(buildBody());
      await submitMarket(m.id);
      showToast('success', '送審成功', '事件已建立並送審（PENDING）');
      resetForm();
    } catch (err) { showToast('danger', '送審失敗', err.message); }
  }

  function resetForm() {
    setForm({ title: '', description: '', category: '', marketType: 'BINARY', sourceUrl: '', resolutionRule: '', closeAt: '' });
    setErrors({});
  }

  return (
    <div>
      <div className="page-header">
        <h1>建立市場</h1>
        <p>建立一個新的預測市場事件</p>
      </div>
      <div className="block-card" style={{ maxWidth: 800 }}>
        <div className="block-card-header">市場表單</div>
        <div className="block-card-body" style={{ padding: 24 }}>
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
              <option value="">選擇分類</option><option value="金融">金融</option><option value="加密">加密</option><option value="政治">政治</option><option value="體育">體育</option><option value="科技">科技</option><option value="娛樂">娛樂</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">市場類型</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { value: 'BINARY', label: '二元' },
                { value: 'MULTIPLE', label: '多元' },
                { value: 'SCALAR', label: '數值' },
              ].map((t) => (
                <label className="form-check" key={t.value}>
                  <input type="radio" name="marketType" value={t.value} checked={form.marketType === t.value} onChange={() => setField('marketType', t.value)} />
                  <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>{t.label}</span>
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
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn" onClick={handleSave}>儲存草稿</button>
            <button className="btn btn-primary" onClick={handleSubmit}>建立並送審</button>
          </div>
        </div>
      </div>
      {toast && (
        <div className="toast-container">
          <div className={`admin-toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'danger' ? 'toast-danger' : 'toast-info'}`}>
            <div className="admin-toast-body">
              <div className="fw-semibold small mb-1">{toast.title}</div>
              <div className="small text-secondary">{toast.message}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
