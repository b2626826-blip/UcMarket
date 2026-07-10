import { useState } from 'react';

const historyData = [
  { time: '2026-06-23 14:32', market: 'BTC 200K', side: 'YES', action: 'BUY', price: 0.62, amount: 1200, shares: 1935.48, status: 'success' },
  { time: '2026-06-22 10:15', market: 'Fed 降息', side: 'NO', action: 'BUY', price: 0.38, amount: 800, shares: 2105.26, status: 'success' },
  { time: '2026-06-21 09:30', market: '美國大選', side: 'YES', action: 'SELL', price: 0.61, amount: 500, shares: 819.67, status: 'success' },
];

export default function TradeHistoryPage() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? historyData : historyData.filter((t) => t.status === filter);
  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div className="wallet-page-title">
        <h1>交易紀錄</h1>
        <p>你的所有買入 / 賣出紀錄</p>
      </div>
      <div className="trade-history-section" style={{ marginTop: 30 }}>
        <div className="trade-history-header">
          <h3>交易紀錄</h3>
          <div className="trade-filter-tabs">
            {[
              { k: 'all', l: '全部' },
              { k: 'success', l: '成功' },
              { k: 'pending', l: '處理中' },
              { k: 'failed', l: '失敗' },
            ].map((t) => (
              <button key={t.k} className={filter === t.k ? 'active' : ''} onClick={() => setFilter(t.k)}>{t.l}</button>
            ))}
          </div>
        </div>
        <table className="trade-history-table">
          <thead>
            <tr><th>時間</th><th>市場</th><th>方向</th><th>類型</th><th>價格</th><th>金額</th><th>份數</th><th>狀態</th></tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i}>
                <td>{t.time}</td>
                <td>{t.market}</td>
                <td><span className={`tag ${t.side.toLowerCase()}`}>{t.side}</span></td>
                <td><span className={`tag ${t.action === 'BUY' ? 'yes' : 'no'}`}>{t.action === 'BUY' ? '買入' : '賣出'}</span></td>
                <td>${t.price.toFixed(2)}</td>
                <td>${t.amount.toLocaleString()}</td>
                <td>{t.shares.toFixed(2)}</td>
                <td><span className={`status ${t.status}`}>{t.status === 'success' ? '成功' : t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
