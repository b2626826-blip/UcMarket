import { useState, useEffect, useCallback } from 'react';
import { getAdminTransactions } from '../../../api/adminApi';
import StatusBadge from '../../../components/common/StatusBadge';
import Pagination from '../../../components/admin/Pagination';
import { formatTime } from '../../../utils/format';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', action: '', side: '' });
  const [applied, setApplied] = useState({ keyword: '', action: '', side: '' });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTx = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminTransactions({
        ...applied,
        page,
        size: PAGE_SIZE,
      });
      setRows(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch {
      setRows([]);
      setTotalPages(0);
      setTotalElements(0);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { loadTx(); }, [loadTx]);

  function search(e) {
    e?.preventDefault();
    setPage(0);
    setApplied({ ...filters });
  }

  function clearFilters() {
    const empty = { keyword: '', action: '', side: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(0);
  }

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">交易紀錄</h1>
        <p className="text-secondary mb-0">檢視即時成交、異常交易標記與退款紀錄。</p>
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
          <input className="form-control" type="search" placeholder="搜尋交易編號" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
        </div>
        <div>
          <label className="form-label">類型</label>
          <select className="form-select" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">全部類型</option>
            <option value="BUY">買入</option>
            <option value="SELL">賣出</option>
          </select>
        </div>
        <div>
          <label className="form-label">方向</label>
          <select className="form-select" value={filters.side} onChange={(e) => setFilters({ ...filters, side: e.target.value })}>
            <option value="">全部方向</option>
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">搜尋</button>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>清除篩選</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header"><i className="bi bi-credit-card text-primary"></i> 交易資料 ({totalElements})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>交易編號</th><th>用戶 ID</th><th>事件編號</th><th>類型</th><th>方向</th><th>金額</th><th>成交價</th><th>股數</th><th>成交時間</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">載入中…</td></tr>
                ) : !rows.length ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">找不到符合條件的交易。</td></tr>
                ) : rows.map((tx) => (
                  <tr key={tx.id}>
                    <td className="fw-semibold small">{tx.code || (tx.id || '').substring(0, 8)}</td>
                    <td className="small">{tx.userCode || (tx.userId || '').substring(0, 8)}</td>
                    <td className="small">{tx.marketCode || (tx.marketId || '').substring(0, 8)}</td>
                    <td>
                      {tx.action === 'BUY' ? <StatusBadge status="BUY" label="買入" /> : <StatusBadge status="SELL" label="賣出" />}
                    </td>
                    <td>
                      {tx.side === 'YES' ? <StatusBadge status="YES" label="YES" /> : <StatusBadge status="NO" label="NO" />}
                    </td>
                    <td className="fw-semibold">{tx.amount || 0}</td>
                    <td>{tx.price || 0}</td>
                    <td>{tx.shares || 0}</td>
                    <td>{formatTime(tx.createdAt)}</td>
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
