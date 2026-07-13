import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import useGlowEffect from '../../hooks/useGlowEffect';
import { getMarketOdds, getTradeQuote, placeTrade } from '../../api/marketApi';
import './TradePanel.css';

const FALLBACK_ODDS = {
  YES: 1.82,
  NO: 2.22,
};

const QUICK_BETS = [10, 50, 100, 500];

export default function TradePanel({ marketId, market, side, onSideChange }) {
  const user = useAuthStore((state) => state.user);
  const [internalSide, setInternalSide] = useState('YES');
  const [amount, setAmount] = useState('');
  const [btnState, setBtnState] = useState({ text: '', bg: '' });
  const [marketOdds, setMarketOdds] = useState(null);
  const [quotedOdds, setQuotedOdds] = useState(null);

  useGlowEffect('.trade-panel');

  const tradeSide = side !== undefined ? side : internalSide;
  const setTradeSide = (nextSide) => {
    if (onSideChange) onSideChange(nextSide);
    else setInternalSide(nextSide);
  };

  const amountNumber = Number(amount) || 0;
  const marketTitle = market?.title || `市場 #${marketId}`;
  const balance = formatCurrency(resolveBalance(user));
  const liveOdds = resolveDisplayedOdds({
    quotedOdds,
    marketOdds,
    market,
    side: tradeSide,
  });
  const shares = liveOdds > 0 ? amountNumber / liveOdds : 0;
  const estimatedPayout = shares * liveOdds;
  const canSubmit = Boolean(user && market?.id);

  useEffect(() => {
    let active = true;

    if (!marketId) {
      setMarketOdds(null);
      return undefined;
    }

    getMarketOdds(marketId)
      .then((response) => {
        if (!active) return;
        setMarketOdds(response);
      })
      .catch(() => {
        if (!active) return;
        setMarketOdds(null);
      });

    return () => {
      active = false;
    };
  }, [marketId]);

  useEffect(() => {
    let active = true;

    if (!marketId || !amountNumber) {
      setQuotedOdds(null);
      return undefined;
    }

    getTradeQuote(marketId, {
      side: tradeSide,
      amount: amountNumber,
    })
      .then((response) => {
        if (!active) return;
        setQuotedOdds(response);
      })
      .catch(() => {
        if (!active) return;
        setQuotedOdds(null);
      });

    return () => {
      active = false;
    };
  }, [amountNumber, marketId, tradeSide]);

  async function handleTrade() {
    if (!user) {
      showButtonState('請先登入後再交易', '#ff476d');
      return;
    }

    if (!market?.id) {
      showButtonState('找不到可交易的市場', '#ff476d');
      return;
    }

    if (!amountNumber || amountNumber < 10) {
      showButtonState('請輸入至少 10 USDC', '#ff476d');
      return;
    }

    if (amountNumber > 50000) {
      showButtonState('交易金額不可超過上限', '#ff476d');
      return;
    }

    try {
      setBtnState({ text: '交易送出中...', bg: '#d9aa43' });
      await placeTrade({
        marketId: market.id,
        side: tradeSide,
        amount: amountNumber,
      });
      setBtnState({ text: '交易已送出', bg: '#00d66f' });
      setAmount('');
      setQuotedOdds(null);
    } catch (err) {
      showButtonState(err?.message || '交易失敗', '#ff476d');
      return;
    }

    window.setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
  }

  function showButtonState(text, bg) {
    setBtnState({ text, bg });
    window.setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
  }

  function addQuickBet(value) {
    const nextAmount = amountNumber + value;
    setAmount(String(nextAmount));
  }

  return (
    <div className="trade-panel trade-panel--revamp">
      <div className="trade-panel__header">
        <div>
          <h3>立即交易</h3>
        </div>
      </div>

      <div className="trade-panel__market-box">
        <span>市場</span>
        <strong>{marketTitle}</strong>
      </div>

      {!user && (
        <p className="trade-panel__login-hint">請先登入後再下單</p>
      )}

      <div className="trade-panel__side-switch">
        <button
          type="button"
          className={tradeSide === 'YES' ? 'active yes' : 'yes'}
          onClick={() => setTradeSide('YES')}
        >
          YES
        </button>
        <button
          type="button"
          className={tradeSide === 'NO' ? 'active no' : 'no'}
          onClick={() => setTradeSide('NO')}
        >
          NO
        </button>
      </div>

      <div className="trade-panel__form">
        <label htmlFor="currentOdds">賠率</label>
        <div className="trade-panel__input-box">
          <input id="currentOdds" value={liveOdds.toFixed(4)} readOnly />
          <span>x</span>
        </div>

        <div className="trade-panel__field-head">
          <label htmlFor="tradeAmount">交易金額</label>
          <span className="trade-panel__balance-inline">可用餘額 {balance} USDC</span>
        </div>
        <div className="trade-panel__input-box">
          <input
            id="tradeAmount"
            type="number"
            min="0"
            step="1"
            value={amount}
            placeholder="請輸入交易金額"
            onChange={(event) => setAmount(event.target.value)}
          />
          <span>USDC</span>
        </div>

        <div className="trade-panel__quick-bets">
          {QUICK_BETS.map((value) => (
            <button key={value} type="button" onClick={() => addQuickBet(value)}>
              {value}
            </button>
          ))}
        </div>

        <div className="trade-panel__summary">
          <div>
            <span>預估持有股數</span>
            <strong>{shares.toFixed(4)}</strong>
          </div>
          <div>
            <span>預估回報</span>
            <strong>${estimatedPayout.toFixed(2)}</strong>
          </div>
        </div>

        <button
          className="submit-trade-btn trade-panel__submit"
          onClick={handleTrade}
          disabled={!canSubmit}
          style={btnState.bg ? { background: btnState.bg } : undefined}
          id="submitTradeBtn"
          data-market-id={marketId}
          type="button"
        >
          {btnState.text || `買入 ${tradeSide}`}
        </button>

        <p className="trade-panel__risk-text">
          <i className="fa-solid fa-triangle-exclamation" /> 預測市場具有風險，請在了解規則與風險後再進行交易。
        </p>
      </div>
    </div>
  );
}

function resolveDisplayedOdds({ quotedOdds, marketOdds, market, side }) {
  const quoted = Number(quotedOdds?.odds);
  if (Number.isFinite(quoted) && quoted > 0) {
    return quoted;
  }

  const backendOdds = Number(side === 'YES' ? marketOdds?.yesOdds : marketOdds?.noOdds);
  if (Number.isFinite(backendOdds) && backendOdds > 0) {
    return backendOdds;
  }

  return resolveFallbackOdds(market, side);
}

function resolveFallbackOdds(market, side) {
  if (!market) {
    return FALLBACK_ODDS[side];
  }

  const yesPool = Number(market.yesPool ?? 0);
  const noPool = Number(market.noPool ?? 0);
  const totalPool = yesPool + noPool;

  if (totalPool > 0) {
    const sidePool = side === 'YES' ? yesPool : noPool;
    if (sidePool > 0) {
      return clampOdds(totalPool / sidePool);
    }
  }

  return FALLBACK_ODDS[side];
}

function clampOdds(value) {
  return Math.min(5, Math.max(1.5, value));
}

function resolveBalance(user) {
  const candidates = [
    user?.balance,
    user?.walletBalance,
    user?.wallet?.balance,
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}
