import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useGlowEffect from '../../hooks/useGlowEffect';

const ODDS = {
  YES: 1.62,
  NO: 2.63,
};

export default function TradePanel({ marketId }) {
  const user = useAuthStore((state) => state.user);
  const [tradeSide, setTradeSide] = useState('YES');
  const [amount, setAmount] = useState('');
  const [btnState, setBtnState] = useState({ text: '', bg: '' });

  useGlowEffect('.trade-panel');

  const betAmount = Number(amount) || 0;
  const odds = ODDS[tradeSide];
  const estimatedReturn = betAmount * odds;
  const actualProfit = estimatedReturn - betAmount;

  function handleTrade() {
    if (!user) return;

    if (!betAmount || betAmount < 10) {
      setBtnState({ text: '最低下注金額 $10', bg: '#ff476d' });
      setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
      return;
    }

    if (betAmount > 50000) {
      setBtnState({ text: '下注金額過高', bg: '#ff476d' });
      setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
      return;
    }

    setBtnState({ text: '交易送出成功', bg: '#00d66f' });
    setTimeout(() => setBtnState({ text: '', bg: '' }), 2000);
  }

  return (
    <div className="trade-panel">
      <h3 style={{ fontSize: 20, marginBottom: 14 }}>交易面板</h3>
      {!user && <p style={{ color: 'var(--gold)', fontSize: 14, marginBottom: 12 }}>請先登入後再下注</p>}

      <div className="trade-choice">
        <button className={tradeSide === 'YES' ? 'active' : ''} data-choice="YES" onClick={() => setTradeSide('YES')}>YES</button>
        <button className={tradeSide === 'NO' ? 'active' : ''} data-choice="NO" onClick={() => setTradeSide('NO')}>NO</button>
      </div>

      <div className="trade-form">
        <label>目前賠率</label>
        <div className="readonly-box" id="currentOdds">{odds.toFixed(2)}x</div>

        <label>下注金額</label>
        <input
          id="tradeAmount"
          placeholder="輸入下注金額"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <label>預期回報</label>
        <div className="readonly-box" style={{ color: 'var(--green)' }} id="estimatedReturn">
          ${estimatedReturn.toFixed(2)}
        </div>

        <label>實際收益</label>
        <div className="readonly-box" style={{ color: 'var(--gold)' }} id="actualProfit">
          ${actualProfit.toFixed(2)}
        </div>
      </div>

      <button
        className="submit-trade-btn"
        onClick={handleTrade}
        disabled={!user}
        style={btnState.bg ? { background: btnState.bg } : undefined}
        id="submitTradeBtn"
        data-market-id={marketId}
      >
        {btnState.text || '送出交易'}
      </button>

      <p className="trade-warning">預測市場涉及風險，下注前請自行評估。</p>
    </div>
  );
}
