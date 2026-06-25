import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAdminMarkets, approveMarket, rejectMarket, requestMarketChanges } from '../../../api/marketApi';
import StatusBadge from '../../../components/common/StatusBadge';

export default function MarketReviewPage() {
  const { id } = useParams();
  const [markets, setMarkets] = useState([]);
  const [filter, setFilter] = useState({ keyword: '', status: '', category: '' });

  function load() {
    getAdminMarkets().then((data) => {
      const list = data.markets || data || [];
      setMarkets(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }

  useEffect(load, []);

  const filtered = markets.filter((m) => {
    const kw = filter.keyword.toLowerCase();
    const byKeyword = !kw || ((m.id || '') + ' ' + (m.title || '') + ' ' + (m.creatorId || '')).toLowerCase().includes(kw);
    const byStatus = !filter.status || m.status === filter.status;
    const byCategory = !filter.category || m.category === filter.category;
    return byKeyword && byStatus && byCategory;
  });

  const summary = { total: markets.length, pending: markets.filter((m) => m.status === 'PENDING').length, active: markets.filter((m) => m.status === 'ACTIVE').length, resolved: markets.filter((m) => m.status === 'RESOLVED').length };

  function actionButtons(m) {
    switch (m.status) {
      case 'DRAFT':
        return <><button className="btn btn-sm btn-outline-primary me-1" onClick={() => { getAdminMarkets(); }}>送審</button><button className="btn btn-sm btn-outline-danger me-1" onClick={() => {}}>取消</button></>;
      case 'PENDING':
        return <><button className="btn btn-sm btn-outline-success me-1" onClick={() => approveMarket(m.id).then(load)}>核准</button><button className="btn btn-sm btn-outline-danger me-1" onClick={() => { const r = prompt('拒絕原因：'); if (r) rejectMarket(m.id, r).then(load); }}>拒絕</button><button className="btn btn-sm btn-outline-warning me-1" onClick={() => { const c = prompt('修改原因：'); if (c) requestMarketChanges(m.id, c).then(load); }}>要求修改</button></>;
      case 'ACTIVE':
      case 'CLOSED':
        return <><a href={`/admin/markets/resolve/${m.id}`} className="btn btn-sm btn-outline-info me-1">結算</a></>;
      default:
        return <span className="text-secondary small">—</span>;
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>事件審核</h1>
        <p>管理所有預測市場事件</p>
      </div>
      <div className="admin-kpi-row">
        {[
          { label: '全部', value: summary.total },
          { label: '待審核', value: summary.pending },
          { label: '進行中', value: summary.active },
          { label: '已結算', value: summary.resolved },
        ].map((k) => (
          <div className="admin-kpi-card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="admin-filter-bar" id="markets-filter">
        <div>
          <span className="filter-label">搜尋</span>
          <input className="form-control" data-filter-key="keyword" placeholder="ID / 標題 / 建立者" value={filter.keyword} onChange={(e) => setFilter((p) => ({ ...p, keyword: e.target.value }))} />
        </div>
        <div>
          <span className="filter-label">狀態</span>
          <select className="form-select" data-filter-key="status" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
            <option value="">全部</option>
            <option value="DRAFT">草稿</option><option value="PENDING">待審核</option><option value="ACTIVE">進行中</option>
            <option value="CLOSED">已截止</option><option value="RESOLVED">已結算</option><option value="REJECTED">已拒絕</option>
          </select>
        </div>
        <div>
          <span className="filter-label">分類</span>
          <select className="form-select" data-filter-key="category" value={filter.category} onChange={(e) => setFilter((p) => ({ ...p, category: e.target.value }))}>
            <option value="">全部</option>
          </select>
        </div>
        <div>
          <span className="filter-label">&nbsp;</span>
          <button className="btn btn-sm" onClick={() => setFilter({ keyword: '', status: '', category: '' })}>重設</button>
        </div>
      </div>
      <div className="block-card">
        <div className="block-card-header">事件資料 ({filtered.length})</div>
        <div className="table-wrapper">
          <table className="table admin-data-table">
            <thead>
              <tr>
                <th>代碼</th><th>標題</th><th>分類</th><th>建立者</th><th>截止</th><th>Yes Pool</th><th>No Pool</th><th>狀態</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="markets-list">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>找不到符合條件的事件。</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id}>
                  <td className="ps-3 fw-semibold small">{m.code || (m.id || '').substring(0, 8)}</td>
                  <td>{m.title}</td>
                  <td>{m.category}</td>
                  <td>{m.creatorCode || (m.creatorId || '').substring(0, 8)}</td>
                  <td>{m.closeAt?.replace('T', ' ').substring(0, 16)}</td>
                  <td>{m.yesPool || 0}</td>
                  <td>{m.noPool || 0}</td>
                  <td><StatusBadge status={m.status} label={{ PENDING: '待審核', ACTIVE: '進行中', CLOSED: '已截止', RESOLVED: '已結算', REJECTED: '已拒絕', DRAFT: '草稿', CANCELED: '已取消' }[m.status] || m.status} /></td>
                  <td className="text-center"><div className="table-actions">{actionButtons(m)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
