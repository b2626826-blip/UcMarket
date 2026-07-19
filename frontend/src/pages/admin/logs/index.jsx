import { useState, useEffect, useCallback } from 'react';
import { getAdminLogs } from '../../../api/adminApi';
import Pagination from '../../../components/admin/Pagination';
import { formatTime } from '../../../utils/format';

const PAGE_SIZE = 20;

const ACTION_LABEL = {
  MARKET_APPROVE: '核准事件', MARKET_REJECT: '拒絕事件', MARKET_RESOLVE: '結算事件',
  MARKET_REQUEST_CHANGES: '要求修改', USER_SUSPEND: '停權用戶', USER_UNSUSPEND: '解除停權',
};
const ACTION_CLASS = {
  MARKET_APPROVE: 'status-approved', MARKET_REJECT: 'status-rejected', MARKET_RESOLVE: 'status-active',
  MARKET_REQUEST_CHANGES: 'status-pending', USER_SUSPEND: 'status-rejected', USER_UNSUSPEND: 'status-approved',
};

function formatLogDetail(action, metadata) {
  let m = metadata;
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch { return m || '—'; }
  }
  if (!m || typeof m !== 'object') return ACTION_LABEL[action] || '—';
  switch (action) {
    case 'MARKET_APPROVE':
      return m.status === 'ACTIVE' ? '狀態：進行中' : (m.status ? `狀態：${m.status}` : ACTION_LABEL.MARKET_APPROVE);
    case 'MARKET_REJECT':
      return m.reason ? `原因：${m.reason}` : ACTION_LABEL.MARKET_REJECT;
    case 'MARKET_REQUEST_CHANGES':
      return m.comment ? `備註：${m.comment}` : ACTION_LABEL.MARKET_REQUEST_CHANGES;
    case 'MARKET_RESOLVE':
      return m.result ? `結果：${m.result}` : ACTION_LABEL.MARKET_RESOLVE;
    case 'USER_SUSPEND':
      return ACTION_LABEL.USER_SUSPEND;
    case 'USER_UNSUSPEND':
      return ACTION_LABEL.USER_UNSUSPEND;
    default:
      if (m.reason) return `原因：${m.reason}`;
      if (m.comment) return `備註：${m.comment}`;
      return Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—';
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', action: '' });
  const [applied, setApplied] = useState({ keyword: '', action: '' });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminLogs({
        ...applied,
        page,
        size: PAGE_SIZE,
      });
      setLogs(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch {
      setLogs([]);
      setTotalPages(0);
      setTotalElements(0);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  function search(e) {
    e?.preventDefault();
    setPage(0);
    setApplied({ ...filters });
  }

  function clearFilters() {
    const empty = { keyword: '', action: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(0);
  }

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">操作日誌</h1>
        <p className="text-secondary mb-0">檢視管理員操作紀錄與稽核軌跡。</p>
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
          <input className="form-control" type="search" placeholder="搜尋動作、備註、編號" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
        </div>
        <div>
          <label className="form-label">動作類型</label>
          <select className="form-select" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">全部動作</option>
            <option value="MARKET_APPROVE">核准事件</option>
            <option value="MARKET_REJECT">拒絕事件</option>
            <option value="MARKET_RESOLVE">結算事件</option>
            <option value="MARKET_REQUEST_CHANGES">要求修改</option>
            <option value="USER_SUSPEND">停權用戶</option>
            <option value="USER_UNSUSPEND">解除停權</option>
          </select>
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">搜尋</button>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>清除篩選</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header"><i className="bi bi-journal-text text-primary"></i> 操作紀錄 ({totalElements})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>時間</th><th>管理員</th><th>動作</th><th>目標類型</th><th>目標 ID</th><th>詳細資訊</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center text-secondary py-4">載入中…</td></tr>
                ) : !logs.length ? (
                  <tr><td colSpan="6" className="text-center text-secondary py-4">找不到符合條件的紀錄。</td></tr>
                ) : logs.map((l) => {
                  const cls = ACTION_CLASS[l.action] || 'status-closed';
                  const label = ACTION_LABEL[l.action] || l.action;
                  return (
                    <tr key={l.id}>
                      <td className="text-nowrap small">{formatTime(l.createdAt)}</td>
                      <td>{l.adminCode || (l.adminUserId || '').substring(0, 8)}</td>
                      <td><span className={`status-badge ${cls}`}><span className="status-dot"></span>{label}</span></td>
                      <td>{l.targetType || ''}</td>
                      <td className="fw-semibold small">{l.targetCode || (l.targetId || '').substring(0, 8)}</td>
                      <td className="small text-secondary">{formatLogDetail(l.action, l.metadata)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} disabled={loading} />
        </div>
      </section>
    </>
  );
}
