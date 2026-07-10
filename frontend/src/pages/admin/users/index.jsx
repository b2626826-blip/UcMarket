import { useState, useEffect } from 'react';
import { getAdminUsers, suspendUser, unsuspendUser } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatTime, formatBalance } from '../../../utils/format';

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', role: '', status: '' });
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      const list = Array.isArray(data) ? data : (data?.users || []);
      setAllUsers(list);
    } catch { setAllUsers([]); }
    setLoading(false);
  }

  const filtered = allUsers.filter((u) => {
    const kw = filters.keyword.toLowerCase();
    const byKw = !kw || ((u.code || '') + ' ' + (u.username || '') + ' ' + (u.email || '')).toLowerCase().includes(kw);
    const byRole = !filters.role || u.role === filters.role;
    const byStatus = !filters.status || u.status === filters.status;
    return byKw && byRole && byStatus;
  });

  async function handleSuspend(id) {
    if (!confirm('確定要停權此用戶嗎？')) return;
    try { await suspendUser(id); showToast('warning', '已停權', '用戶已停權。'); loadUsers(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }
  async function handleUnsuspend(id) {
    if (!confirm('確定要解除此用戶的停權嗎？')) return;
    try { await unsuspendUser(id); showToast('success', '已啟用', '用戶已解除停權。'); loadUsers(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }

  const total = allUsers.length;
  const active = allUsers.filter((u) => u.status === 'ACTIVE').length;
  const banned = allUsers.filter((u) => u.status === 'BANNED').length;
  const disabled = allUsers.filter((u) => u.status === 'DISABLED').length;

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">用戶清單</h1>
        <p className="text-secondary mb-0">管理會員角色、帳戶狀態與最近登入活動。</p>
      </div>

      <section className="admin-kpi-row mb-3">
        {[
          { label: '總用戶', val: total, cls: 'text-primary' },
          { label: '啟用中', val: active, cls: 'text-success' },
          { label: '停權中', val: banned, cls: 'text-danger' },
          { label: '停用中', val: disabled, cls: 'text-secondary' },
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
          <label className="form-label">角色</label>
          <select className="form-select" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">全部角色</option>
            <option value="USER">一般用戶</option>
            <option value="ADMIN">管理員</option>
          </select>
        </div>
        <div>
          <label className="form-label">帳戶狀態</label>
          <select className="form-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">全部狀態</option>
            <option value="ACTIVE">正常</option>
            <option value="BANNED">停權</option>
            <option value="DISABLED">停用</option>
          </select>
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">搜尋</button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setFilters({ keyword: '', role: '', status: '' })}>清除</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header">用戶資料 ({filtered.length})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>用戶編號</th><th>用戶名稱</th><th>Email</th><th>角色</th><th>狀態</th><th>點數餘額</th><th>註冊時間</th><th>最後登入</th><th>操作</th></tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">找不到符合條件的用戶。</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold small">{u.code || (u.id || '').substring(0, 8)}</td>
                    <td>{u.username || ''}</td>
                    <td>{u.email || ''}</td>
                    <td>{u.role === 'ADMIN' ? <StatusBadge status="ADMIN" label="管理員" /> : <StatusBadge status="USER" label="一般用戶" />}</td>
                    <td>
                      {u.status === 'ACTIVE' && <StatusBadge status="ACTIVE" label="正常" />}
                      {u.status === 'BANNED' && <StatusBadge status="BANNED" label="停權" />}
                      {u.status === 'DISABLED' && <StatusBadge status="DISABLED" label="停用" />}
                      {!['ACTIVE','BANNED','DISABLED'].includes(u.status) && <StatusBadge status={u.status} label={u.status} />}
                    </td>
                    <td>{formatBalance(u.balance)}</td>
                    <td>{formatTime(u.createdAt, 16) || '-'}</td>
                    <td>{formatTime(u.lastLoginAt, 16) || '-'}</td>
                    <td>
                      {u.status === 'ACTIVE' && <button className="icon-btn text-danger" title="停權" onClick={() => handleSuspend(u.id)}><i className="bi bi-shield-slash"></i></button>}
                      {u.status === 'BANNED' && <button className="icon-btn text-success" title="啟用" onClick={() => handleUnsuspend(u.id)}><i className="bi bi-shield-check"></i></button>}
                      {!['ACTIVE','BANNED'].includes(u.status) && <span className="text-secondary small">—</span>}
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
