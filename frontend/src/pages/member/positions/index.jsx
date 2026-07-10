export default function PositionsPage() {
  const positions = [
    { market: 'BTC 是否會在 2027 年前突破 200K？', side: 'YES', shares: 120, avgPrice: 0.62, currentPrice: 0.72, pnl: '+$12.00' },
    { market: '美國債務上限是否會被永久取消？', side: 'NO', shares: 85, avgPrice: 0.55, currentPrice: 0.59, pnl: '+$3.40' },
  ];

  return (
    <div className="trade-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div className="wallet-page-title">
        <h1>持倉</h1>
        <p>你目前持有的預測市場部位</p>
      </div>
      <div className="trade-history-section" style={{ marginTop: 30 }}>
        <table className="trade-history-table">
          <thead>
            <tr><th>市場</th><th>方向</th><th>份數</th><th>均價</th><th>當前價格</th><th>盈虧</th></tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={i}>
                <td>{p.market}</td>
                <td><span className={`tag ${p.side.toLowerCase()}`}>{p.side}</span></td>
                <td>{p.shares}</td>
                <td>${p.avgPrice.toFixed(2)}</td>
                <td>${p.currentPrice.toFixed(2)}</td>
                <td className={p.pnl.startsWith('+') ? 'positive' : 'negative'}>{p.pnl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
