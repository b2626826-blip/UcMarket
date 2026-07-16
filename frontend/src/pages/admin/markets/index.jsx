import { useState, useEffect, useCallback } from 'react';
import { getAdminMarkets, approveMarket, rejectMarket, requestMarketChanges, resolveMarket, submitMarket, cancelMarket } from '../../../api/marketApi';
import useUiStore from '../../../store/uiStore';
import StatusBadge from '../../../components/common/StatusBadge';
import Pagination from '../../../components/admin/Pagination';
import { formatTime } from '../../../utils/format';

const PAGE_SIZE = 20;
const STATUS_LABEL = { PENDING: '待審核', ACTIVE: '進行中', CLOSED: '已截止', RESOLVED: '已結算', REJECTED: '已拒絕', DRAFT: '草稿', CANCELED: '已取消' };
const CATEGORY_OPTS = [
  { label: '政治', value: '政治' },
  { label: '運動', value: '運動' },
  { label: '天氣', value: 'WEATHER' },
  { label: '時事', value: 'CURRENT_AFFAIRS' },
  { label: '金融', value: '金融' },
];
const categoryLabel = (v) => CATEGORY_OPTS.find((c) => c.value === v)?.label || v || '-';

export default function MarketsPage() {
  const [markets, setMarkets] = useState([]);
  const [summary, setSummary] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', status: '', category: '' });
  const [applied, setApplied] = useState({ keyword: '', status: '', category: '' });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminMarkets({
        ...applied,
        page,
        size: PAGE_SIZE,
      });
      const paged = data?.markets;
      setMarkets(paged?.content || []);
      setTotalPages(paged?.totalPages || 0);
      setTotalElements(paged?.totalElements || 0);
      setSummary(Array.isArray(data?.summary) ? data.summary : []);
    } catch {
      setMarkets([]);
      setTotalPages(0);
      setTotalElements(0);
      setSummary([]);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { loadMarkets(); }, [loadMarkets]);

  function search(e) {
    e?.preventDefault();
    setPage(0);
    setApplied({ ...filters });
  }

  function clearFilters() {
    const empty = { keyword: '', status: '', category: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(0);
  }

  async function doAction(action, id, extra) {
    try {
      if (action === 'approve') { await approveMarket(id); showToast('success', '已核准', '市場已核准。'); }
      else if (action === 'reject') { await rejectMarket(id, extra); showToast('warning', '已拒絕', '市場已被拒絕。'); }
      else if (action === 'changes') { await requestMarketChanges(id, extra); showToast('info', '已送回', '已要求修改。'); }
      else if (action === 'resolve') { await resolveMarket(id, extra); showToast('success', '已結算', '市場已結算。'); }
      else if (action === 'submit') { await submitMarket(id); showToast('success', '已送審', '市場已送審。'); }
      else if (action === 'cancel') { await cancelMarket(id); showToast('warning', '已取消', '市場已取消。'); }
      loadMarkets();
    } catch (err) { showToast('danger', '失敗', err.message); }
  }

  function doActionWithConfirm(action, id, extra) {
    if (action === 'approve') { if (!confirm('確定要核准此市場嗎？')) return; }
    doAction(action, id, extra);
  }

  function handleReject(id) {
    const reason = prompt('請輸入拒絕原因：');
    if (reason) doAction('reject', id, reason);
  }
  function handleChanges(id) {
    const comment = prompt('請輸入要求修改的原因：');
    if (comment) doAction('changes', id, comment);
  }
  function handleResolve(id) {
    const result = prompt('請輸入結果（YES/NO）：');
    if (!result || (result.toUpperCase() !== 'YES' && result.toUpperCase() !== 'NO')) {
      showToast('warning', '格式錯誤', '請輸入 YES 或 NO');
      return;
    }
    doAction('resolve', id, result.toUpperCase());
  }
  function handleCancel(id) {
    if (confirm('確定要取消這個市場嗎？')) doAction('cancel', id);
  }

  function actionButtons(m) {
    const s = m.status;
    const id = m.id;
    const btns = [];
    if (s === 'DRAFT') {
      btns.push(<button key="submit" className="icon-btn text-primary" title="送審" onClick={() => doAction('submit', id)}><i className="bi bi-send"></i></button>);
      btns.push(<button key="cancel" className="icon-btn text-danger" title="取消" onClick={() => handleCancel(id)}><i className="bi bi-x-circle"></i></button>);
    } else if (s === 'PENDING') {
      btns.push(<button key="approve" className="icon-btn text-success" title="核准" onClick={() => doActionWithConfirm('approve', id)}><i className="bi bi-check-lg"></i></button>);
      btns.push(<button key="reject" className="icon-btn text-danger" title="拒絕" onClick={() => handleReject(id)}><i className="bi bi-x-lg"></i></button>);
      btns.push(<button key="changes" className="icon-btn text-secondary" title="要求修改" onClick={() => handleChanges(id)}><i className="bi bi-pencil"></i></button>);
    } else if (s === 'ACTIVE' || s === 'CLOSED') {
      btns.push(<button key="resolve" className="icon-btn text-primary" title="結算" onClick={() => handleResolve(id)}><i className="bi bi-check2-square"></i></button>);
      if (s === 'ACTIVE') btns.push(<button key="cancel2" className="icon-btn text-danger" title="取消" onClick={() => handleCancel(id)}><i className="bi bi-x-circle"></i></button>);
    }
    return btns.length ? btns : <span className="text-secondary small">—</span>;
  }

  const kpiCls = { primary: 'text-primary', warning: 'text-warning', success: 'text-success', secondary: 'text-secondary' };

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">事件列表</h1>
        <p className="text-secondary mb-0">集中管理市場狀態、截止時間與交易量。</p>
      </div>

      <section className="admin-kpi-row mb-3">
        {(summary.length ? summary : [
          { label: '全部事件', value: totalElements, tone: 'primary' },
        ]).map((kpi, i) => (
          <article key={i} className="admin-kpi-card">
            <span className="kpi-label">{kpi.label}</span>
            <span className={`kpi-value ${kpiCls[kpi.tone] || 'text-primary'}`}>{loading && !summary.length ? '-' : (kpi.value ?? kpi.count ?? 0)}</span>
          </article>
        ))}
      </section>

      <form className="admin-filter-bar mb-3" onSubmit={search}>
        <div>
          <label className="form-label">關鍵字</label>
          <input className="form-control" type="search" placeholder="搜尋事件編號、標題" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
        </div>
        <div>
          <label className="form-label">狀態</label>
          <select className="form-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">全部狀態</option>
            <option value="PENDING">待審核</option>
            <option value="ACTIVE">進行中</option>
            <option value="CLOSED">已截止</option>
            <option value="RESOLVED">已結算</option>
            <option value="REJECTED">已拒絕</option>
            <option value="DRAFT">草稿</option>
            <option value="CANCELED">已取消</option>
          </select>
        </div>
        <div>
          <label className="form-label">類別</label>
          <select className="form-select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">全部分類</option>
            {CATEGORY_OPTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">搜尋</button>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>清除</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header">事件資料 <span className="text-secondary" style={{ fontWeight: 400 }}>({totalElements})</span></div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>事件編號</th><th>標題</th><th>類別</th><th>建立者</th><th>截止日</th><th>YES 池</th><th>NO 池</th><th>狀態</th><th className="text-center">操作</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">載入中…</td></tr>
                ) : !markets.length ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">找不到符合條件的事件。</td></tr>
                ) : markets.map((m) => (
                  <tr key={m.id}>
                    <td className="fw-semibold small">{m.code || (m.id || '').substring(0, 8)}</td>
                    <td>{m.title || ''}</td>
                    <td>{categoryLabel(m.category)}</td>
                    <td>{m.creatorCode || (m.creatorId || '').substring(0, 8)}</td>
                    <td>{formatTime(m.closeAt, 16)}</td>
                    <td className="text-success fw-semibold">{m.yesPool || 0}</td>
                    <td className="text-danger fw-semibold">{m.noPool || 0}</td>
                    <td><StatusBadge status={m.status} label={STATUS_LABEL[m.status] || m.status} /></td>
                    <td className="text-center">{actionButtons(m)}</td>
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
