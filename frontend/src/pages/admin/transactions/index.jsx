import { useState, useEffect } from 'react';
import { getAdminTransactions } from '../../../api/tradeApi';
import StatusBadge from '../../../components/common/StatusBadge';
import AdminTable from '../../../components/admin/AdminTable';

export default function TransactionsPage() {
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState({ keyword: '', action: '', side: '' });

  useEffect(() => {
    getAdminTransactions().then((data) => {
      setTxs(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const filtered = txs.filter((tx) => {
    const kw = filter.keyword.toLowerCase();
    const byKeyword = !kw || ((tx.id || '') + ' ' + (tx.marketId || '')).toLowerCase().includes(kw);
    const byAction = !filter.action || tx.action === filter.action;
    const bySide = !filter.side || tx.side === filter.side;
    return byKeyword && byAction && bySide;
  });

  const columns = [
    { key: 'code', label: '代碼', render: (tx) => <span className="fw-semibold small">{tx.code || (tx.id || '').substring(0, 8)}</span> },
    { key: 'user', label: '使用者', render: (tx) => <span className="small">{tx.userCode || (tx.userId || '').substring(0, 8)}</span> },
    { key: 'market', label: '市場', render: (tx) => <span className="small">{tx.marketCode || (tx.marketId || '').substring(0, 8)}</span> },
    { key: 'action', label: '類型', render: (tx) => <StatusBadge status={tx.action === 'BUY' ? 'APPROVED' : 'CLOSED'} label={tx.action === 'BUY' ? '買入' : '賣出'} /> },
    { key: 'side', label: '方向', render: (tx) => <StatusBadge status={tx.side} label={tx.side} /> },
    { key: 'amount', label: '金額' },
    { key: 'price', label: '價格' },
    { key: 'shares', label: '份數' },
    { key: 'time', label: '時間', render: (tx) => formatTime(tx.createdAt) },
  ];

  function formatTime(val) {
    if (!val) return '';
    return val.replace('T', ' ').substring(0, 19);
  }

  return (
    <div>
      <div className="page-header">
        <h1>交易管理</h1>
        <p>檢視所有交易紀錄</p>
      </div>
      <div className="admin-kpi-row">
        <div className="admin-kpi-card">
          <div className="kpi-label">全部交易</div>
          <div className="kpi-value">{txs.length}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="kpi-label">買入</div>
          <div className="kpi-value">{txs.filter((t) => t.action === 'BUY').length}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="kpi-label">賣出</div>
          <div className="kpi-value">{txs.filter((t) => t.action === 'SELL').length}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="kpi-label">篩選後</div>
          <div className="kpi-value">{filtered.length}</div>
        </div>
      </div>
      <div className="admin-filter-bar" id="tx-filter">
        <div>
          <span className="filter-label">搜尋</span>
          <input className="form-control" placeholder="交易 ID / 市場 ID" value={filter.keyword} onChange={(e) => setFilter((p) => ({ ...p, keyword: e.target.value }))} />
        </div>
        <div>
          <span className="filter-label">類型</span>
          <select className="form-select" value={filter.action} onChange={(e) => setFilter((p) => ({ ...p, action: e.target.value }))}>
            <option value="">全部</option>
            <option value="BUY">買入</option>
            <option value="SELL">賣出</option>
          </select>
        </div>
        <div>
          <span className="filter-label">方向</span>
          <select className="form-select" value={filter.side} onChange={(e) => setFilter((p) => ({ ...p, side: e.target.value }))}>
            <option value="">全部</option>
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
        </div>
        <div>
          <span className="filter-label">&nbsp;</span>
          <button className="btn btn-sm" onClick={() => setFilter({ keyword: '', action: '', side: '' })}>重設</button>
        </div>
      </div>
      <div className="block-card">
        <div className="block-card-header">交易資料 ({filtered.length})</div>
        <AdminTable columns={columns} rows={filtered} emptyText="找不到符合條件的交易。" />
      </div>
    </div>
  );
}
