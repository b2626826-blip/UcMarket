import { useState, useEffect, useCallback } from 'react';
import { getAdminUsers, suspendUser, unsuspendUser } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';
import StatusBadge from '../../../components/common/StatusBadge';
import Pagination from '../../../components/admin/Pagination';
import { formatTime, formatBalance } from '../../../utils/format';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', role: '', status: '' });
  const [applied, setApplied] = useState({ keyword: '', role: '', status: '' });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers({
        ...applied,
        page,
        size: PAGE_SIZE,
      });
      setUsers(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch {
      setUsers([]);
      setTotalPages(0);
      setTotalElements(0);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function search(e) {
    e?.preventDefault();
    setPage(0);
    setApplied({ ...filters });
  }

  function clearFilters() {
    const empty = { keyword: '', role: '', status: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(0);
  }

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

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">用戶清單</h1>
        <p className="text-secondary mb-0">管理會員角色、帳戶狀態與最近登入活動。</p>
      </div>

      <section className="admin-kpi-row mb-3">
        <article className="admin-kpi-card">
          <span className="kpi-label">符合條件</span>
          <span className="kpi-value text-primary">{loading ? '-' : totalElements}</span>
        </article>
      </section>

      <form className="admin-filter-bar mb-3" onSubmit={search}>
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
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>清除</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header">用戶資料 ({totalElements})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>用戶編號</th><th>用戶名稱</th><th>Email</th><th>角色</th><th>狀態</th><th>點數餘額</th><th>註冊時間</th><th>最後登入</th><th>操作</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">載入中…</td></tr>
                ) : !users.length ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">找不到符合條件的用戶。</td></tr>
                ) : users.map((u) => (
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
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} disabled={loading} />
        </div>
      </section>
    </>
  );
}
