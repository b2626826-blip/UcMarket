import { useState, useEffect } from 'react';
import { getAdminUsers, suspendUser, unsuspendUser } from '../../../api/adminApi';
import StatusBadge from '../../../components/common/StatusBadge';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ keyword: '', status: '' });

  function load() {
    getAdminUsers().then((data) => setUsers(Array.isArray(data) ? data : [])).catch(() => {});
  }

  useEffect(load, []);

  const filtered = users.filter((u) => {
    const kw = filter.keyword.toLowerCase();
    const byKeyword = !kw || ((u.id || '') + ' ' + (u.username || '') + ' ' + (u.email || '')).toLowerCase().includes(kw);
    const byStatus = !filter.status || u.status === filter.status;
    return byKeyword && byStatus;
  });

  function handleSuspend(id) { suspendUser(id).then(load).catch((err) => alert(err.message)); }
  function handleUnsuspend(id) { unsuspendUser(id).then(load).catch((err) => alert(err.message)); }

  return (
    <div>
      <div className="page-header">
        <h1>使用者管理</h1>
        <p>管理所有使用者帳戶</p>
      </div>
      <div className="admin-filter-bar" id="users-filter">
        <div>
          <span className="filter-label">搜尋</span>
          <input className="form-control" data-filter-key="keyword" placeholder="ID / 使用者 / Email" value={filter.keyword} onChange={(e) => setFilter((p) => ({ ...p, keyword: e.target.value }))} />
        </div>
        <div>
          <span className="filter-label">狀態</span>
          <select className="form-select" data-filter-key="status" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
            <option value="">全部</option>
            <option value="ACTIVE">正常</option><option value="BANNED">停權</option>
          </select>
        </div>
        <div>
          <span className="filter-label">&nbsp;</span>
          <button className="btn btn-sm" onClick={() => setFilter({ keyword: '', status: '' })}>重設</button>
        </div>
      </div>
      <div className="block-card">
        <div className="block-card-header">用戶資料 ({filtered.length})</div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>代碼</th><th>使用者</th><th>角色</th><th>狀態</th><th>信譽</th><th>持倉</th><th>最後登入</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="users-list">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>找不到符合條件的用戶。</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id}>
                  <td className="ps-3 fw-semibold small">{u.code || (u.id || '').substring(0, 8)}</td>
                  <td>{u.username || ''}</td>
                  <td><StatusBadge status={u.role === 'ADMIN' ? 'APPROVED' : 'CLOSED'} label={u.role === 'ADMIN' ? '管理員' : '一般用戶'} /></td>
                  <td>{u.status === 'ACTIVE' ? <StatusBadge status="ACTIVE" label="正常" /> : <StatusBadge status="REJECTED" label="停權" />}</td>
                  <td>{u.reputation || 0}</td>
                  <td>-</td>
                  <td>{u.lastLoginAt?.replace('T', ' ').substring(0, 16)}</td>
                  <td className="text-center">
                    {u.status === 'ACTIVE'
                      ? <button className="btn btn-sm btn-outline-danger" onClick={() => handleSuspend(u.id)}>停權</button>
                      : u.status === 'BANNED'
                        ? <button className="btn btn-sm btn-outline-success" onClick={() => handleUnsuspend(u.id)}>啟用</button>
                        : <span className="text-secondary small">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
