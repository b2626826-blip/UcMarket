import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../../store/authStore';
import useGlowEffect from '../../hooks/useGlowEffect';
import { getMarketOdds, getTradeQuote, placeTrade } from '../../api/marketApi';
import { createIdempotencyKey } from '../../utils/idempotency';
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
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef(null);

  useGlowEffect('.trade-panel');

  const tradeSide = side !== undefined ? side : internalSide;
  const setTradeSide = (nextSide) => {
    if (onSideChange) onSideChange(nextSide);
    else setInternalSide(nextSide);
    idempotencyKeyRef.current = null;
  };

  const amountNumber = Number(amount) || 0;
  const marketTitle = market?.title || `Market #${marketId}`;
  const balance = formatCurrency(resolveBalance(user));
  const liveOdds = resolveDisplayedOdds({
    quotedOdds,
    marketOdds,
    market,
    side: tradeSide,
  });
  const shares = liveOdds > 0 ? amountNumber / liveOdds : 0;
  const estimatedPayout = shares * liveOdds;
  const canSubmit = Boolean(user && market?.id && !submitting);

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
      showButtonState('請先登入', '#ff476d');
      return;
    }

    if (!market?.id) {
      showButtonState('市場暫時無法使用', '#ff476d');
      return;
    }

    if (!amountNumber || amountNumber < 10) {
      showButtonState('最小下單金額為 10 USDC', '#ff476d');
      return;
    }

    if (amountNumber > 50000) {
      showButtonState('下單金額超出限制', '#ff476d');
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey('trade');
    idempotencyKeyRef.current = idempotencyKey;

    try {
      setSubmitting(true);
      setBtnState({ text: '提交中...', bg: '#d9aa43' });
      await placeTrade({
        marketId: market.id,
        side: tradeSide,
        amount: amountNumber,
      }, idempotencyKey);
      setBtnState({ text: '下單成功', bg: '#00d66f' });
      setAmount('');
      setQuotedOdds(null);
      idempotencyKeyRef.current = null;
    } catch (err) {
      showButtonState(err?.message || '下單失敗', '#ff476d');
      return;
    } finally {
      setSubmitting(false);
    }

    window.setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
  }

  function showButtonState(text, bg) {
    setBtnState({ text, bg });
    window.setTimeout(() => setBtnState({ text: '', bg: '' }), 2500);
  }

  function addQuickBet(value) {
    idempotencyKeyRef.current = null;
    const nextAmount = amountNumber + value;
    setAmount(String(nextAmount));
  }

  return (
    <div className="trade-panel trade-panel--revamp">
      <div className="trade-panel__header">
        <div>
          <h3>建立交易</h3>
        </div>
      </div>

      <div className="trade-panel__market-box">
        <span>市場</span>
        <strong>{marketTitle}</strong>
      </div>

      {!user && (
        <p className="trade-panel__login-hint">登入後即可交易</p>
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
          <label htmlFor="tradeAmount">下單金額</label>
          <span className="trade-panel__balance-inline">餘額 {balance} USDC</span>
        </div>
        <div className="trade-panel__input-box">
          <input
            id="tradeAmount"
            type="number"
            min="0"
            step="1"
            value={amount}
            placeholder="輸入金額"
            onChange={(event) => {
              idempotencyKeyRef.current = null;
              setAmount(event.target.value);
            }}
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
            <span>預估份額</span>
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
          {btnState.text || (submitting ? '提交中...' : `買入 ${tradeSide}`)}
        </button>

        <p className="trade-panel__risk-text">
          <i className="fa-solid fa-triangle-exclamation" /> 相同提交意圖的重試會沿用同一組 idempotency key。
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
