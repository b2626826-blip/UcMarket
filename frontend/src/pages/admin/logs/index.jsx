import { useState, useEffect } from 'react';
import { getAdminLogs } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';

const ACTION_LABEL = {
  MARKET_APPROVE: '核准事件', MARKET_REJECT: '拒絕事件', MARKET_RESOLVE: '結算事件',
  MARKET_REQUEST_CHANGES: '要求修改', USER_SUSPEND: '停權用戶', USER_UNSUSPEND: '解除停權',
};
const ACTION_CLASS = {
  MARKET_APPROVE: 'status-approved', MARKET_REJECT: 'status-rejected', MARKET_RESOLVE: 'status-active',
  MARKET_REQUEST_CHANGES: 'status-pending', USER_SUSPEND: 'status-rejected', USER_UNSUSPEND: 'status-approved',
};

function formatTime(val) {
  if (!val) return '';
  return val.replace('T', ' ').substring(0, 19);
}

function getActionCategory(action) {
  if (!action) return 'system';
  if (action.includes('MARKET')) return 'market';
  if (action.includes('USER')) return 'user';
  return 'system';
}

export default function LogsPage() {
  const [allLogs, setAllLogs] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', action: '' });
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await getAdminLogs();
      const list = Array.isArray(data) ? data : (data?.logs || []);
      setAllLogs(list);
    } catch { setAllLogs([]); }
    setLoading(false);
  }

  const filtered = allLogs.filter((l) => {
    const kw = filters.keyword.toLowerCase();
    const byKw = !kw || ((l.adminUserId || '') + ' ' + (l.action || '') + ' ' + (l.targetId || '')).toLowerCase().includes(kw);
    const byAction = !filters.action || l.action === filters.action;
    return byKw && byAction;
  });

  const filteredLogs = filters.keyword || filters.action ? filtered : allLogs;

  const allCount = allLogs.length;
  const marketCount = allLogs.filter((l) => getActionCategory(l.action) === 'market').length;
  const userCount = allLogs.filter((l) => getActionCategory(l.action) === 'user').length;
  const systemCount = allLogs.filter((l) => getActionCategory(l.action) === 'system').length;

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">操作日誌</h1>
        <p className="text-secondary mb-0">檢視管理員操作紀錄與稽核軌跡。</p>
      </div>

      <section className="admin-kpi-row mb-3">
        {[
          { label: '全部紀錄', val: allCount, cls: 'text-primary' },
          { label: '審核操作', val: marketCount, cls: 'text-success' },
          { label: '用戶管理', val: userCount, cls: 'text-warning' },
          { label: '系統操作', val: systemCount, cls: 'text-info' },
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
          <input className="form-control" type="search" placeholder="搜尋管理員、動作、目標ID" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
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
          <button type="button" className="btn btn-outline-secondary" onClick={() => setFilters({ keyword: '', action: '' })}>清除篩選</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header"><i className="bi bi-journal-text text-primary"></i> 操作紀錄 ({filteredLogs.length})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>時間</th><th>管理員</th><th>動作</th><th>目標類型</th><th>目標 ID</th><th>詳細資訊</th></tr>
              </thead>
              <tbody>
                {!filteredLogs.length ? (
                  <tr><td colSpan="6" className="text-center text-secondary py-4">找不到符合條件的紀錄。</td></tr>
                ) : filteredLogs.map((l) => {
                  const cls = ACTION_CLASS[l.action] || 'status-closed';
                  const label = ACTION_LABEL[l.action] || l.action;
                  return (
                    <tr key={l.id}>
                      <td className="text-nowrap small">{formatTime(l.createdAt)}</td>
                      <td>{l.adminCode || (l.adminUserId || '').substring(0, 8)}</td>
                      <td><span className={`status-badge ${cls}`}><span className="status-dot"></span>{label}</span></td>
                      <td>{l.targetType || ''}</td>
                      <td className="fw-semibold small">{l.targetCode || (l.targetId || '').substring(0, 8)}</td>
                      <td className="small text-secondary">{l.metadata || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
