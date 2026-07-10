import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Modal from '../../../components/common/Modal';
import useGlowEffect from '../../../hooks/useGlowEffect';

export default function WalletPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [filter, setFilter] = useState('all');
  const [range, setRange] = useState('30');
  const chartRef = useRef(null);
  useGlowEffect('.wallet-balance-section, .asset-chart-card, .asset-allocation-card, .transaction-section, .profit-card, .asset-item');

  const chartData = {
    '7': [119000,121000,122300,123100,124200,124800,125430],
    '30': [87800,92500,98000,103000,110500,114800,118000,122300,120400,123600,124700,125430],
    '90': [70000,76000,81000,89000,97000,103000,109000,114000,120000,125430],
    '365': [42000,51000,60000,69000,76000,84000,92000,102000,111000,118000,122000,125430],
    'all': [18000,26000,34000,47000,62000,76000,91000,108000,125430],
  };

  function renderChart(r) {
    const canvas = document.getElementById('walletChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const values = chartData[r] || chartData['30'];
    if (chartRef.current) chartRef.current.destroy();
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    gradient.addColorStop(0, 'rgba(0,214,79,.35)');
    gradient.addColorStop(1, 'rgba(0,214,79,0)');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: values.map((_, i) => i + 1),
        datasets: [{ data: values, borderColor: '#00d64f', backgroundColor: gradient, fill: true, borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: '#00d64f' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0b0b0b', borderColor: '#222', borderWidth: 1, callbacks: { label: (ctx) => '$' + ctx.raw.toLocaleString() } } },
        scales: { x: { display: false }, y: { border: { display: false }, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#777', callback: (v) => '$' + v.toLocaleString() } } }
      }
    });
  }

  useEffect(() => {
    renderChart(range);
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, []);

  function switchRange(r) { setRange(r); setTimeout(() => renderChart(r), 50); }

  useEffect(() => {
    const dc = document.getElementById('drawCanvas');
    if (!dc) return;
    const ctx = dc.getContext('2d');
    let drawing = false, startX = 0, startY = 0;
    const lines = [];
    function resize() { dc.width = dc.offsetWidth; dc.height = dc.offsetHeight; redraw(); }
    function redraw() {
      ctx.clearRect(0, 0, dc.width, dc.height);
      ctx.strokeStyle = '#d9aa43';
      ctx.lineWidth = 2;
      lines.forEach((l) => { ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); ctx.fillStyle = '#d9aa43'; ctx.beginPath(); ctx.arc(l.x1, l.y1, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(l.x2, l.y2, 4, 0, Math.PI * 2); ctx.fill(); });
    }
    window.addEventListener('resize', resize);
    resize();
    dc.addEventListener('mousedown', (e) => { drawing = true; startX = e.offsetX; startY = e.offsetY; });
    dc.addEventListener('mouseup', (e) => { if (!drawing) return; drawing = false; lines.push({ x1: startX, y1: startY, x2: e.offsetX, y2: e.offsetY }); redraw(); });
    return () => { window.removeEventListener('resize', resize); };
  }, []);

  function openModal(type) { setModalType(type); setModalAmount(''); setModalOpen(true); }

  const txData = [
    { token: 'USDC', type: 'deposit', action: '充值', amount: '+$5,000.00', status: 'done', time: '2026-06-23 14:32' },
    { token: 'USDC', type: 'trade', action: '買入 YES', amount: '-$1,200.00', status: 'done', time: '2026-06-23 12:10' },
    { token: 'USDC', type: 'withdraw', action: '提現', amount: '-$2,000.00', status: 'done', time: '2026-06-22 09:45' },
  ];

  const filtered = filter === 'all' ? txData : txData.filter((t) => t.type === filter);

  return (
    <div className="wallet-wrapper" style={{ paddingTop: 40, paddingBottom: 90 }}>
      <div className="wallet-page-title">
        <h1>錢包</h1>
        <p>管理你的資產與交易紀錄</p>
      </div>
      <div className="wallet-balance-section">
        <div className="balance-main">
          <span>可用餘額</span>
          <h2>$125,430.00</h2>
        </div>
        <div className="balance-status">
          <p><span className="green-dot"></span>錢包狀態：正常</p>
          <p><span className="gold-dot"></span>最後更新：2026-06-23 14:32</p>
        </div>
        <div className="balance-actions">
          <button className="deposit-btn" id="depositBtn" onClick={() => openModal('充值')}>充值</button>
          <button id="withdrawBtn" onClick={() => openModal('提現')}>提現</button>
          <button id="tradeBtn" onClick={() => openModal('交易')}>交易</button>
        </div>
      </div>
      <div className="profit-grid">
        {[
          { label: '總收益', value: '+$12,430.00', cls: 'green' },
          { label: '本月收益', value: '+$3,210.00', cls: 'green' },
          { label: '總充值', value: '$50,000.00' },
          { label: '總提現', value: '$12,000.00' },
        ].map((p) => (
          <div className="profit-card" key={p.label}>
            <p>{p.label}</p>
            <strong className={p.cls || ''}>{p.value}</strong>
            <span>+12.5%</span>
          </div>
        ))}
      </div>
      <div className="wallet-dashboard">
        <div className="asset-chart-card">
          <div className="card-header">
            <div><h3>資產走勢</h3><div className="asset-chart-value"><strong>$125,430</strong><span>+8.7%</span></div></div>
            <div className="range-tabs">
              {['7', '30', '90', '365', 'all'].map((r) => (
                <button key={r} className={range === r ? 'active' : ''} onClick={() => switchRange(r)}>{r === 'all' ? 'ALL' : r + 'D'}</button>
              ))}
            </div>
          </div>
          <div className="chart-box">
            <canvas id="walletChart"></canvas>
            <canvas id="drawCanvas"></canvas>
          </div>
          <div className="chart-summary">
            <div><p>起始</p><strong>$87,800</strong></div>
            <div><p>當前</p><strong>$125,430</strong></div>
            <div><p>變動</p><strong className="positive">+$37,630</strong></div>
          </div>
        </div>
        <div className="asset-allocation-card">
          <h3>資產配置</h3>
          <div className="allocation-total">
            <h2>$125,430</h2>
            <p>總資產價值</p>
          </div>
          <div className="asset-list">
            {[
              { name: 'USDC', pct: '65%', amt: '$81,530', bar: '65%', cls: '' },
              { name: 'ETH', pct: '15%', amt: '$18,815', bar: '15%', cls: 'gold' },
              { name: 'BTC', pct: '12%', amt: '$15,052', bar: '12%', cls: 'gold' },
              { name: 'SOL', pct: '5%', amt: '$6,272', bar: '5%', cls: '' },
              { name: 'POL', pct: '3%', amt: '$3,761', bar: '3%', cls: 'gray' },
            ].map((a) => (
              <div className="asset-item" key={a.name}>
                <div className="asset-info">
                  <div className={`coin-icon ${a.name.toLowerCase()}`}><i className={`fa-brands fa-${a.name === 'USDC' ? 'usb' : a.name.toLowerCase()}`}></i></div>
                  <div><strong>{a.name}</strong><p>{a.pct}</p></div>
                </div>
                <div className="asset-price"><strong>{a.amt}</strong></div>
                <div className={`asset-bar ${a.cls}`}><span style={{ width: a.bar }}></span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="transaction-section">
        <div className="transaction-header">
          <h3>錢包異動紀錄</h3>
          <div className="transaction-tabs">
            {[
              { k: 'all', l: '全部' },
              { k: 'deposit', l: '充值' },
              { k: 'withdraw', l: '提現' },
              { k: 'trade', l: '交易' },
            ].map((t) => (
              <button key={t.k} className={filter === t.k ? 'active' : ''} onClick={() => setFilter(t.k)}>{t.l}</button>
            ))}
          </div>
        </div>
        <table className="transaction-table">
          <thead>
            <tr><th>資產</th><th>類型</th><th>金額</th><th>狀態</th><th>時間</th></tr>
          </thead>
          <tbody>
            {filtered.map((tx, i) => (
              <tr key={i}>
                <td><span className={`token ${tx.token.toLowerCase()}`}></span> {tx.token}</td>
                <td><span className={`tag ${tx.type}`}>{tx.action}</span></td>
                <td className={tx.amount.startsWith('+') ? 'positive' : 'negative'}>{tx.amount}</td>
                <td><span className={`status ${tx.status}`}>{tx.status === 'done' ? '已完成' : tx.status}</span></td>
                <td>{tx.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalType} description={`輸入要${modalType}的金額`}>
        <input className="form-control" placeholder="輸入金額" value={modalAmount} onChange={(e) => setModalAmount(e.target.value)} />
        <div className="modal-actions">
          <button id="modalCancel" onClick={() => setModalOpen(false)}>取消</button>
          <button id="modalConfirm" onClick={() => { alert(`${modalType}成功\n\n金額：$${Number(modalAmount).toLocaleString()}`); setModalOpen(false); }}>確認</button>
        </div>
      </Modal>
    </div>
  );
}
