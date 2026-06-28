import { useState, useEffect } from 'react';
import { getAdminLogs } from '../../../api/adminApi';
import StatusBadge from '../../../components/common/StatusBadge';
import { AdminActionLabel } from '../../../types/admin';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ keyword: '', action: '' });

  useEffect(() => {
    getAdminLogs().then((data) => setLogs(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const filtered = logs.filter((l) => {
    const kw = filter.keyword.toLowerCase();
    const byKeyword = !kw || ((l.adminUserId || '') + ' ' + (l.action || '') + ' ' + (l.targetId || '')).toLowerCase().includes(kw);
    const byAction = !filter.action || l.action === filter.action;
    return byKeyword && byAction;
  });

  const marketCount = filtered.filter((l) => l.action?.includes('MARKET')).length;
  const userCount = filtered.filter((l) => l.action?.includes('USER')).length;

  return (
    <div>
      <div className="page-header">
        <h1>操作紀錄</h1>
        <p>管理員操作歷史紀錄</p>
      </div>
      <div className="admin-kpi-row">
        {[
          { label: '全部', value: filtered.length },
          { label: '市場操作', value: marketCount },
          { label: '用戶操作', value: userCount },
          { label: '系統操作', value: filtered.length - marketCount - userCount },
        ].map((k) => (
          <div className="admin-kpi-card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="admin-filter-bar" id="logs-filter">
        <div>
          <span className="filter-label">搜尋</span>
          <input className="form-control" data-filter-key="keyword" placeholder="管理員 / 動作 / 目標" value={filter.keyword} onChange={(e) => setFilter((p) => ({ ...p, keyword: e.target.value }))} />
        </div>
        <div>
          <span className="filter-label">動作</span>
          <select className="form-select" data-filter-key="action" value={filter.action} onChange={(e) => setFilter((p) => ({ ...p, action: e.target.value }))}>
            <option value="">全部</option>
            {Object.entries(AdminActionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <span className="filter-label">&nbsp;</span>
          <button className="btn btn-sm" onClick={() => setFilter({ keyword: '', action: '' })}>重設</button>
        </div>
      </div>
      <div className="block-card">
        <div className="block-card-header">操作紀錄 ({filtered.length})</div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>時間</th><th>管理員</th><th>動作</th><th>目標類型</th><th>目標</th><th>備註</th></tr>
            </thead>
            <tbody id="logs-list">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>找不到符合條件的紀錄。</td></tr>
              ) : filtered.map((l, i) => (
                <tr key={l.id || i}>
                  <td className="text-nowrap small">{l.createdAt?.replace('T', ' ').substring(0, 19)}</td>
                  <td>{l.adminCode || (l.adminUserId || '').substring(0, 8)}</td>
                  <td><StatusBadge status={l.action?.includes('APPROVE') || l.action?.includes('UNSUSPEND') ? 'APPROVED' : l.action?.includes('REJECT') || l.action?.includes('SUSPEND') ? 'REJECTED' : 'PENDING'} label={AdminActionLabel[l.action] || l.action} /></td>
                  <td>{l.targetType || ''}</td>
                  <td className="fw-semibold small">{l.targetCode || (l.targetId || '').substring(0, 8)}</td>
                  <td className="small text-secondary">{l.metadata || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
