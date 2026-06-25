import { useState, useEffect } from 'react';
import { getDashboardStats, getDashboardReviews } from '../../../api/adminApi';
import { approveMarket, rejectMarket, requestMarketChanges } from '../../../api/marketApi';
import StatusBadge from '../../../components/common/StatusBadge';

export default function PendingMarketsPage() {
  const [stats, setStats] = useState({});
  const [reviews, setReviews] = useState([]);

  function loadData() {
    Promise.all([
      getDashboardStats().catch(() => ({})),
      getDashboardReviews().catch(() => []),
    ]).then(([s, r]) => { setStats(s || {}); setReviews(r || []); });
  }

  useEffect(loadData, []);

  function handleApprove(id) {
    approveMarket(id).then(loadData).catch((err) => alert(err.message));
  }
  function handleReject(id) {
    const reason = prompt('請輸入拒絕原因：');
    if (!reason) return;
    rejectMarket(id, reason).then(loadData).catch((err) => alert(err.message));
  }
  function handleChanges(id) {
    const comment = prompt('請輸入要求修改的原因：');
    if (!comment) return;
    requestMarketChanges(id, comment).then(loadData).catch((err) => alert(err.message));
  }

  return (
    <div>
      <div className="page-header">
        <h1>管理儀表板</h1>
        <p>市場審核與系統狀態總覽</p>
      </div>
      <div className="stats-row">
        {[
          { label: '待審核', value: stats.pendingCount ?? '-' },
          { label: '進行中', value: stats.activeCount ?? '-' },
          { label: '已拒絕', value: stats.rejectedCount ?? '-' },
          { label: '草稿', value: stats.draftCount ?? '-' },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="block-card">
        <div className="block-card-header">待審核事件</div>
        <div className="block-card-body">
          <table className="table">
            <thead>
              <tr>
                <th>標題</th><th>建立者</th><th>建立時間</th><th>分類</th><th>截止時間</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="dashboard-reviews">
              {reviews.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>暫無待審事件</td></tr>
              ) : reviews.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.creatorCode || (r.creatorId || '').substring(0, 8)}</td>
                  <td>{r.createdAt?.replace('T', ' ').substring(0, 19)}</td>
                  <td><StatusBadge status="PENDING" label={r.category} /></td>
                  <td>{r.closeAt?.replace('T', ' ').substring(0, 19)}</td>
                  <td>
                    <div className="table-actions" style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-outline-success" onClick={() => handleApprove(r.id)}>核准</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleReject(r.id)}>拒絕</button>
                      <button className="btn btn-sm btn-outline-warning" onClick={() => handleChanges(r.id)}>要求修改</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="page-grid" style={{ marginTop: 24 }}>
        <div className="block-card">
          <div className="block-card-header">系統資訊</div>
          <div className="block-card-body" id="system-info">
            {[
              { label: '總用戶數', value: stats.totalUsers || 0 },
              { label: '總市場數', value: stats.totalMarkets || 0 },
              { label: '進行中', value: stats.activeCount || 0 },
              { label: '待審核', value: stats.pendingCount || 0 },
              { label: '系統狀態', value: '正常運行', cls: 'text-success' },
            ].map((item) => (
              <div className="system-item" key={item.label}>
                <span className="text-secondary">{item.label}</span>
                <span className={`fw-semibold ${item.cls || ''}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="block-card">
          <div className="block-card-header">快速操作</div>
          <div className="block-card-body" style={{ padding: 16 }}>
            <div className="quick-actions">
              <Link to="/admin/markets/review/new" className="quick-action-btn">建立新市場</Link>
              <Link to="/admin/users" className="quick-action-btn">管理使用者</Link>
              <Link to="/admin/logs" className="quick-action-btn">檢視操作紀錄</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Link({ to, className, children }) {
  return <a href={to} className={className}>{children}</a>;
}
