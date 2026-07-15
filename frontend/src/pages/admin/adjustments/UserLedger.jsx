import { useState, Fragment } from 'react';
import { formatBalance } from '../../../utils/format';

// 格式抄錢包頁流水,顏色改用 admin(Bootstrap)。transactions = 後端 WalletTransactionResponse[]
const pad2 = (n) => String(n).padStart(2, '0');
const ymdLocal = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

const TX_TYPE = {
  TRADE_BUY:         { t: '買入',     tag: 'buy',    badge: 'bg-primary' },
  TRADE_SELL:        { t: '賣出',     tag: 'sell',   badge: 'bg-secondary' },
  RESOLUTION_PAYOUT: { t: '派彩',     tag: 'settle', badge: 'bg-success' },
  SIGNUP_BONUS:      { t: '登入送點', tag: 'bonus',  badge: 'bg-warning text-dark' },
  BONUS:             { t: '獎勵',     tag: 'bonus',  badge: 'bg-warning text-dark' },
  REFUND:            { t: '退款',     tag: 'refund', badge: 'bg-secondary' },
  ADJUSTMENT:        { t: '調整',     tag: 'adjust', badge: 'bg-info text-dark' },
};

const FLOW_TABS = [['all', '全部'], ['bonus', '登入送點'], ['buy', '買入'], ['settle', '派彩'], ['adjust', '調整']];

function mapTx(tx) {
  const [date, time] = (tx.createdAt || '').split('T');
  const info = TX_TYPE[tx.type] || { t: tx.type, tag: '', badge: 'bg-secondary' };
  return {
    d: date || '',
    time: (time || '').slice(0, 5),
    t: info.t,
    tag: info.tag,
    badge: info.badge,
    amount: Number(tx.amount),
    balance: tx.balanceAfter,
    ref: tx.id,
    note: tx.referenceType || '',
    memo: tx.memo || '',
  };
}

export default function UserLedger({ transactions = [] }) {
  const ledger = transactions.map(mapTx);
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [perPage, setPerPage] = useState(5);
  const [page, setPage] = useState(1);

  const today = ymdLocal(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return ymdLocal(d); };

  const hit = ledger.filter((r) =>
    (type === 'all' || r.tag === type) &&
    (from === '' || r.d >= from) &&
    (to === '' || r.d <= to) &&
    (q === '' || (r.d + ' ' + r.time).includes(q) || String(Math.abs(r.amount)).includes(q))
  );
  const totalPages = Math.max(1, Math.ceil(hit.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = hit.slice((curPage - 1) * perPage, curPage * perPage);
  const firstNo = hit.length === 0 ? 0 : (curPage - 1) * perPage + 1;
  const lastNo = Math.min(curPage * perPage, hit.length);
  const inflow = hit.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const outflow = hit.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);
  const money = (n) => formatBalance(Math.abs(Number(n)));

  function exportCSV() {
    const head = ['日期', '時間', '類型', '金額', '結餘'];
    const body = hit.map((r) => [r.d, r.time, r.t, r.amount, r.balance].join(','));
    const csv = '﻿' + [head.join(','), ...body].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `對帳單_${from || 'all'}_${to || 'all'}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* 篩選列 */}
      <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
        <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <span className="text-secondary">→</span>
        <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setFrom(addDays(today, -6)); setTo(today); setPage(1); }}>近7天</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setFrom(today.slice(0, 7) + '-01'); setTo(today); setPage(1); }}>本月</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>全部</button>
        <input type="search" className="form-control form-control-sm ms-auto" style={{ maxWidth: 200 }} placeholder="搜尋金額或日期" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportCSV}><i className="bi bi-download"></i> CSV</button>
      </div>

      {/* 分類頁籤 */}
      <div className="d-flex gap-1 flex-wrap mb-2">
        {FLOW_TABS.map(([k, l]) => (
          <button key={k} type="button" className={`btn btn-sm ${type === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setType(k); setPage(1); }}>{l}</button>
        ))}
      </div>

      {/* KPI */}
      <div className="d-flex gap-2 flex-wrap mb-2">
        <div className="border rounded p-2 text-center flex-fill"><div className="text-secondary small">期間流入</div><div className="fw-semibold text-success">+{money(inflow)}</div></div>
        <div className="border rounded p-2 text-center flex-fill"><div className="text-secondary small">期間流出</div><div className="fw-semibold text-danger">−{money(outflow)}</div></div>
        <div className="border rounded p-2 text-center flex-fill"><div className="text-secondary small">淨額</div><div className="fw-semibold">{inflow - outflow < 0 ? '−' : '+'}{money(inflow - outflow)}</div></div>
        <div className="border rounded p-2 text-center flex-fill"><div className="text-secondary small">筆數</div><div className="fw-semibold">{hit.length}</div></div>
      </div>

      {/* 表格 */}
      <div className="table-responsive border rounded">
        <table className="table table-sm align-middle mb-0 admin-data-table">
          <thead>
            <tr><th>日期</th><th>摘要</th><th className="text-end">支出</th><th className="text-end">收入</th><th className="text-end">結餘</th></tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-secondary py-3">查無資料</td></tr>
            ) : pageRows.map((r) => (
              <Fragment key={r.ref}>
                <tr style={{ cursor: 'pointer' }} onClick={() => setOpenRow(openRow === r.ref ? null : r.ref)}>
                  <td className="text-secondary small">{r.d.slice(5).replace('-', '/')} {r.time}</td>
                  <td><span className={`badge rounded-pill ${r.badge}`}>{r.t}</span></td>
                  <td className={`text-end ${r.amount < 0 ? 'text-danger' : 'text-secondary'}`}>{r.amount < 0 ? '−' + money(r.amount) : '—'}</td>
                  <td className={`text-end ${r.amount > 0 ? 'text-success' : 'text-secondary'}`}>{r.amount > 0 ? '+' + money(r.amount) : '—'}</td>
                  <td className="text-end fw-semibold">{money(r.balance)}</td>
                </tr>
                {openRow === r.ref && (
                  <tr className="table-active">
                    <td colSpan="5">
                      <div className="d-flex flex-wrap gap-4 small py-1">
                        <span className="text-secondary">交易編號 <span className="text-body">{r.ref}</span></span>
                        <span className="text-secondary">完整時間 <span className="text-body">{r.d} {r.time}</span></span>
                        <span className="text-secondary">說明 <span className="text-body">{r.memo || r.note || '—'}</span></span>
                        <span className="text-secondary">狀態 <span className="text-success">已完成</span></span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 small">
        <span className="text-secondary">顯示 <b>{firstNo}–{lastNo}</b> / 共 {hit.length} 筆</span>
        <div className="d-flex align-items-center gap-2">
          <label className="text-secondary d-flex align-items-center gap-1 mb-0">每頁
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
            </select>
          </label>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>‹</button>
          <span className="text-secondary">{curPage} / {totalPages}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>›</button>
        </div>
      </div>
    </div>
  );
}
