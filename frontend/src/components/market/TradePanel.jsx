import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../../store/authStore';
import useWalletStore from '../../store/walletStore';
import useGlowEffect from '../../hooks/useGlowEffect';
import { getMarketOdds, getTradeQuote, placeTrade } from '../../api/marketApi';
import { createIdempotencyKey } from '../../utils/idempotency';
import { getFallbackOdds, getOddsFromApiResponse, getOddsFromMarket } from '../../utils/odds';
import './TradePanel.css';

const QUICK_BETS = [10, 50, 100, 500];
const MIN_TRADE_AMOUNT = 10;
const MAX_TRADE_AMOUNT = 50000;

export default function TradePanel({ marketId, market, side, onSideChange, onMarketOddsChange, onTradeSuccess }) {
  const user = useAuthStore((state) => state.user);
  const walletBalance = useWalletStore((state) => state.balance);
  const fetchWallet = useWalletStore((state) => state.fetchWallet);
  const [internalSide, setInternalSide] = useState('YES');
  const [amount, setAmount] = useState('');
  const [btnState, setBtnState] = useState({ text: '', bg: '' });
  const [marketOdds, setMarketOdds] = useState(null);
  const [quotedOdds, setQuotedOdds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef(null);

  useGlowEffect('.trade-panel');

  const tradeSide = side !== undefined ? side : internalSide;
  const amountNumber = Number(amount) || 0;
  const marketTitle = market?.title || `市場 #${marketId}`;
  const balance = formatCurrency(walletBalance);
  const liveOdds = resolveDisplayedOdds({
    quotedOdds,
    marketOdds,
    market,
    side: tradeSide,
  });
  const shares = liveOdds > 0 ? amountNumber / liveOdds : 0;
  const estimatedPayout = shares * liveOdds;
  const canSubmit = Boolean(user && marketId && !submitting);

  const setTradeSide = (nextSide) => {
    if (onSideChange) {
      onSideChange(nextSide);
    } else {
      setInternalSide(nextSide);
    }
    idempotencyKeyRef.current = null;
  };

  async function refreshMarketOdds(currentMarketId) {
    if (!currentMarketId) {
      setMarketOdds(null);
      return null;
    }

    try {
      const response = await getMarketOdds(currentMarketId);
      setMarketOdds(response);
      onMarketOddsChange?.(currentMarketId, response);
      return response;
    } catch {
      setMarketOdds(null);
      return null;
    }
  }

  useEffect(() => {
    if (user) {
      fetchWallet();
    }
  }, [fetchWallet, user]);

  useEffect(() => {
    let active = true;
    idempotencyKeyRef.current = null;

    if (!marketId) {
      setMarketOdds(null);
      return undefined;
    }

    refreshMarketOdds(marketId).then((response) => {
      if (!active) {
        return;
      }
      setMarketOdds(response);
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
        if (!active) {
          return;
        }
        setQuotedOdds(response);
      })
      .catch(() => {
        if (!active) {
          return;
        }
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

    if (!marketId) {
      showButtonState('市場不存在', '#ff476d');
      return;
    }

    if (!amountNumber || amountNumber < MIN_TRADE_AMOUNT) {
      showButtonState(`最低下注 ${MIN_TRADE_AMOUNT} USDC`, '#ff476d');
      return;
    }

    if (amountNumber > MAX_TRADE_AMOUNT) {
      showButtonState(`最高下注 ${MAX_TRADE_AMOUNT} USDC`, '#ff476d');
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey('trade');
    idempotencyKeyRef.current = idempotencyKey;

    try {
      setSubmitting(true);
      setBtnState({ text: '下注送出中...', bg: '#d9aa43' });
      await placeTrade(
        {
          marketId,
          side: tradeSide,
          amount: amountNumber,
        },
        idempotencyKey,
      );
      await fetchWallet();
      await refreshMarketOdds(marketId);
      await onTradeSuccess?.(marketId);
      setBtnState({ text: '下注成功', bg: '#00d66f' });
      setAmount('');
      setQuotedOdds(null);
      idempotencyKeyRef.current = null;
    } catch (err) {
      showButtonState(
        err?.status === 422 ? '餘額不足' : (err?.message || '下注失敗'),
        '#ff476d',
      );
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
    setAmount(String(amountNumber + value));
  }

  return (
    <div className="trade-panel trade-panel--revamp">
      <div className="trade-panel__header">
        <div>
          <h3>我要下注</h3>
        </div>
      </div>

      <div className="trade-panel__market-box">
        <span>市場</span>
        <strong>{marketTitle}</strong>
      </div>

      {!user && (
        <p className="trade-panel__login-hint">請先登入後再下注。</p>
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
        <label htmlFor="currentOdds">即時賠率</label>
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
            placeholder="請輸入金額"
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
            <span>預估派彩</span>
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
          {btnState.text || (submitting ? '下注送出中...' : `買入 ${tradeSide}`)}
        </button>

        <p className="trade-panel__risk-text">
          <i className="fa-solid fa-triangle-exclamation" /> 每次下注後賠率都可能變動，送出前請再次確認目前的即時賠率。
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

  const backendOdds = getOddsFromApiResponse(marketOdds, side);
  if (backendOdds) {
    return backendOdds;
  }

  return resolveFallbackOdds(market, side);
}

function resolveFallbackOdds(market, side) {
  const marketOdds = getOddsFromMarket(market, side);
  if (marketOdds) {
    return marketOdds;
  }

  return getFallbackOdds(side);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}
