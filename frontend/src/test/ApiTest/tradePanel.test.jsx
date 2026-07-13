import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TradePanel from '../../components/market/TradePanel';

const mocks = vi.hoisted(() => {
  const fetchWallet = vi.fn();
  return {
    authState: { user: { id: 'user-1' } },
    walletState: { balance: 10000, fetchWallet },
    fetchWallet,
    getMarketOdds: vi.fn(),
    getTradeQuote: vi.fn(),
    placeTrade: vi.fn(),
  };
});

vi.mock('../../store/authStore', () => ({
  default: (selector) => selector(mocks.authState),
}));

vi.mock('../../store/walletStore', () => ({
  default: (selector) => selector(mocks.walletState),
}));

vi.mock('../../hooks/useGlowEffect', () => ({ default: vi.fn() }));

vi.mock('../../api/marketApi', () => ({
  getMarketOdds: mocks.getMarketOdds,
  getTradeQuote: mocks.getTradeQuote,
  placeTrade: mocks.placeTrade,
}));

describe('TradePanel', () => {
  let container;
  let root;

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getMarketOdds.mockResolvedValue({ yesOdds: 2, noOdds: 2 });
    mocks.getTradeQuote.mockResolvedValue({ odds: 2 });
    mocks.placeTrade.mockResolvedValue({ id: 'trade-1' });

    await act(async () => {
      root.render(<TradePanel marketId="market-1" />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('只傳 marketId 時仍可用錢包餘額下單，成功後刷新餘額', async () => {
    expect(container.textContent).toContain('可用餘額 10,000 USDC');

    const quickBetButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === '10');

    await act(async () => quickBetButton.click());

    const submitButton = container.querySelector('#submitTradeBtn');
    expect(submitButton.disabled).toBe(false);

    await act(async () => submitButton.click());

    expect(mocks.placeTrade).toHaveBeenCalledWith(
      {
        marketId: 'market-1',
        side: 'YES',
        amount: 10,
      },
      expect.stringMatching(/^trade:/),
    );
    expect(mocks.fetchWallet).toHaveBeenCalledTimes(2);
  });

  it('餘額不足時只顯示餘額不足', async () => {
    const error = new Error('餘額不足，userId=user-1：需要 10，可用 0');
    error.status = 422;
    mocks.placeTrade.mockRejectedValueOnce(error);

    const quickBetButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === '10');
    await act(async () => quickBetButton.click());

    const submitButton = container.querySelector('#submitTradeBtn');
    await act(async () => submitButton.click());

    expect(submitButton.textContent).toBe('餘額不足');
  });
});
