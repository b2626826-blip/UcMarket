import { useState, useEffect } from 'react';
import { getAdminTransactions } from '../../../api/adminApi';
import useUiStore from '../../../store/uiStore';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatTime } from '../../../utils/format';

export default function TransactionsPage() {
  const [allTx, setAllTx] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', action: '', side: '' });
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => { loadTx(); }, []);

  async function loadTx() {
    setLoading(true);
    try {
      const data = await getAdminTransactions();
      const list = Array.isArray(data) ? data : (data?.transactions || []);
      setAllTx(list);
    } catch { setAllTx([]); }
    setLoading(false);
  }

  const filtered = allTx.filter((tx) => {
    const kw = filters.keyword.toLowerCase();
    const byKw = !kw || ((tx.id||'') + ' ' + (tx.code||'') + ' ' + (tx.userId||'') + ' ' + (tx.userCode||'') + ' ' + (tx.marketId||'') + ' ' + (tx.marketCode||'')).toLowerCase().includes(kw);
    const byAction = !filters.action || tx.action === filters.action;
    const bySide = !filters.side || tx.side === filters.side;
    return byKw && byAction && bySide;
  });

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">交易紀錄</h1>
        <p className="text-secondary mb-0">檢視即時成交、異常交易標記與退款紀錄。</p>
      </div>

      <section className="admin-kpi-row mb-3">
        {[
          { label: '總成交筆數', val: filtered.length, cls: 'text-primary' },
          { label: '買入', val: allTx.filter((t) => t.action === 'BUY').length, cls: 'text-success' },
          { label: '賣出', val: allTx.filter((t) => t.action === 'SELL').length, cls: 'text-danger' },
          { label: '篩選結果', val: filtered.length, cls: 'text-warning' },
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
          <input className="form-control" type="search" placeholder="搜尋交易編號、帳號、事件編號" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
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
          <button type="button" className="btn btn-outline-secondary" onClick={() => setFilters({ keyword: '', action: '', side: '' })}>清除篩選</button>
        </div>
      </form>

      <section className="block-card">
        <div className="block-card-header"><i className="bi bi-credit-card text-primary"></i> 交易資料 ({filtered.length})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 admin-data-table">
              <thead>
                <tr><th>交易編號</th><th>用戶 ID</th><th>事件編號</th><th>類型</th><th>方向</th><th>金額</th><th>成交價</th><th>股數</th><th>成交時間</th></tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan="9" className="text-center text-secondary py-4">找不到符合條件的交易。</td></tr>
                ) : filtered.map((tx) => (
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
        </div>
      </section>
    </>
  );
}
