import { useState, useEffect } from 'react';
import { getAdminUsers, suspendUser, unsuspendUser } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';

function formatTime(val) {
  if (!val) return '-';
  return val.replace('T', ' ').substring(0, 16);
}

export default function AdminsPage() {
  const [allAdmins, setAllAdmins] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', status: '' });
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    setLoading(true);
    try {
      const data = await getAdminUsers({ role: 'ADMIN' });
      const list = Array.isArray(data) ? data : (data?.users || []);
      setAllAdmins(list);
    } catch { setAllAdmins([]); }
    setLoading(false);
  }

  const filtered = allAdmins.filter((a) => {
    const kw = filters.keyword.toLowerCase();
    const byKw = !kw || ((a.code || '') + ' ' + (a.username || '') + ' ' + (a.email || '')).toLowerCase().includes(kw);
    const byStatus = !filters.status || a.status === filters.status;
    return byKw && byStatus;
  });

  async function handleSuspend(id) {
    if (!confirm('確定要停權此管理員嗎？')) return;
    try { await suspendUser(id); showToast('warning', '已停權', '管理員已停權。'); loadAdmins(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }
  async function handleUnsuspend(id) {
    if (!confirm('確定要解除此管理員的停權嗎？')) return;
    try { await unsuspendUser(id); showToast('success', '已啟用', '管理員已解除停權。'); loadAdmins(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }

  const total = allAdmins.length;
  const active = allAdmins.filter((a) => a.status === 'ACTIVE').length;
  const banned = allAdmins.filter((a) => a.status === 'BANNED').length;

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">管理員清單</h1>
        <p className="text-secondary mb-0">檢視與管理所有平台管理員帳號。</p>
      </div>

      <section className="admin-kpi-row mb-3">
        {[
          { label: '總管理員', val: total, cls: 'text-primary' },
          { label: '啟用中', val: active, cls: 'text-success' },
          { label: '停權中', val: banned, cls: 'text-danger' },
        ].map((kpi, i) => (
          <article key={i} className="admin-kpi-card">
            <span className="kpi-label">{kpi.label}</span>
            <span className={`kpi-value ${kpi.cls}`}>{loading ? '-' : kpi.val}</span>
          </article>
        ))}
      </section>

      <form className="admin-filter-bar mb-3" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="form-label">關鍵字</label>
          <input className="form-control" type="search" placeholder="搜尋編號、名稱、Email" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
        </div>
        <div>
          <label className="form-label">帳戶狀態</label>
          <select className="form-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">全部狀態</option>
            <option value="ACTIVE">正常</option>
            <option value="BANNED">停權</option>
          </select>
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">搜尋</button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setFilters({ keyword: '', status: '' })}>清除</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header">管理員資料 ({filtered.length})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>管理員編號</th><th>用戶名稱</th><th>Email</th><th>狀態</th><th>最後登入</th><th>建立時間</th><th>操作</th></tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan="7" className="text-center text-secondary py-4">找不到符合條件的管理員。</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-semibold small">{a.code || (a.id || '').substring(0, 8)}</td>
                    <td>{a.username || ''}</td>
                    <td>{a.email || ''}</td>
                    <td>
                      {a.status === 'ACTIVE' ? <span className="status-badge status-active"><span className="status-dot"></span>正常</span>
                       : a.status === 'BANNED' ? <span className="status-badge status-rejected"><span className="status-dot"></span>停權</span>
                       : <span className="status-badge status-closed"><span className="status-dot"></span>{a.status}</span>}
                    </td>
                    <td>{formatTime(a.lastLoginAt)}</td>
                    <td>{formatTime(a.createdAt)}</td>
                    <td>
                      {a.status === 'ACTIVE' && <button className="icon-btn text-danger" title="停權" onClick={() => handleSuspend(a.id)}><i className="bi bi-shield-slash"></i></button>}
                      {a.status === 'BANNED' && <button className="icon-btn text-success" title="啟用" onClick={() => handleUnsuspend(a.id)}><i className="bi bi-shield-check"></i></button>}
                      {!['ACTIVE','BANNED'].includes(a.status) && <span className="text-secondary small">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
