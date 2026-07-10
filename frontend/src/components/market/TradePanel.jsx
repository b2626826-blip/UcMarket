import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import useGlowEffect from '../../hooks/useGlowEffect';

export default function TradePanel({ marketId }) {
  const user = useAuthStore((s) => s.user);
  const [tradeSide, setTradeSide] = useState('YES');
  const [tradeTab, setTradeTab] = useState('now');
  const [amount, setAmount] = useState('');
  const [btnState, setBtnState] = useState({ text: '', bg: '' });
  const [currentPrice, setCurrentPrice] = useState('$0.62');
  const btnRef = useRef(null);
  useGlowEffect('.trade-panel');

  const basePrice = tradeSide === 'YES' ? 0.62 : tradeSide === 'NO' ? 0.38 : 0.42;
  const price = Number(currentPrice.replace('$', '')) || basePrice;
  const shares = Number(amount) / price || 0;

  useEffect(() => {
    const timer = setInterval(() => {
      const activeEl = document.querySelector('.trade-choice .active');
      if (!activeEl) return;
      const type = activeEl.dataset.choice;
      if (type === 'YES') setCurrentPrice('$' + (0.55 + Math.random() * 0.15).toFixed(2));
      else if (type === 'NO') setCurrentPrice('$' + (0.30 + Math.random() * 0.15).toFixed(2));
      else setCurrentPrice((40 + Math.random() * 10).toFixed(0) + '%');
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function handleTrade() {
    const val = Number(amount);
    if (!val || val < 10) {
      setBtnState({ text: '最低下注 $10', bg: '#ff476d' });
      setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
      return;
    }
    if (val > 50000) {
      setBtnState({ text: '餘額不足', bg: '#ff476d' });
      setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
      return;
    }
    setBtnState({ text: '交易成功', bg: '#00d66f' });
    setTimeout(() => setBtnState({ text: '', bg: '' }), 2000);
  }

  function selectChoice(type) {
    setTradeSide(type);
    if (type === 'YES') setCurrentPrice('$0.62');
    else if (type === 'NO') setCurrentPrice('$0.38');
    else setCurrentPrice('42%');
  }

  return (
    <div className="trade-panel">
      <h3 style={{ fontSize: 20, marginBottom: 18 }}>交易面板</h3>
      {!user && <p style={{ color: 'var(--gold)', fontSize: 14, marginBottom: 16 }}>請先登入以進行交易</p>}
      <div className="trade-tabs">
        <button className={tradeTab === 'now' ? 'active' : ''} onClick={() => setTradeTab('now')}>市價</button>
        <button className={tradeTab === 'limit' ? 'active' : ''} onClick={() => setTradeTab('limit')}>限價</button>
      </div>
      <div className="trade-choice">
        <button className={tradeSide === 'YES' ? 'active' : ''} data-choice="YES" onClick={() => selectChoice('YES')}>YES</button>
        <button className={tradeSide === 'NO' ? 'active' : ''} data-choice="NO" onClick={() => selectChoice('NO')}>NO</button>
        <button className={tradeSide === 'OPTION' ? 'active' : ''} data-choice="OPTION" onClick={() => selectChoice('OPTION')}>OPTION</button>
      </div>
      <div className="trade-form">
        <label>目前價格</label>
        <div className="readonly-box" id="currentPrice">{currentPrice}</div>
        <label>投資金額</label>
        <input id="tradeAmount" placeholder="輸入金額" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label>獲得份數</label>
        <div className="readonly-box" style={{ color: 'var(--gold)' }} id="estimatedShares">{shares.toFixed(2)} shares</div>
        <label>預期回報</label>
        <div className="readonly-box" style={{ color: 'var(--green)' }} id="estimatedReturn">${(shares * 1).toFixed(2)}</div>
      </div>
      <button
        ref={btnRef}
        className="submit-trade-btn"
        onClick={handleTrade}
        disabled={!user}
        style={btnState.bg ? { background: btnState.bg } : undefined}
        id="submitTradeBtn"
      >
        {btnState.text || '送出交易'}
      </button>
      <p className="trade-warning">預測市場涉及風險，請詳閱風險披露聲明。</p>
    </div>
  );
}
