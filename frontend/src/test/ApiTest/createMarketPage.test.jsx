import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateMarketPage from '../../pages/member/create-market';

const mocks = vi.hoisted(() => ({
  createMarket: vi.fn(),
  submitMarket: vi.fn(),
  getMyMarkets: vi.fn(),
  searchTradingViewSymbols: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../api/marketApi', () => ({
  createMarket: mocks.createMarket,
  submitMarket: mocks.submitMarket,
  getMyMarkets: mocks.getMyMarkets,
  searchTradingViewSymbols: mocks.searchTradingViewSymbols,
}));

vi.mock('../../store/uiStore', () => ({
  default: () => ({
    showToast: mocks.showToast,
  }),
}));

describe('CreateMarketPage', () => {
  let container;
  let root;

  function setNativeValue(element, value) {
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor.set.call(element, value);
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mocks.createMarket.mockResolvedValue({ id: 'market-1' });
    mocks.submitMarket.mockResolvedValue({});
    mocks.getMyMarkets.mockResolvedValue([]);
    mocks.searchTradingViewSymbols.mockResolvedValue([
      {
        symbol: 'NASDAQ:AAPL',
        exchange: 'NASDAQ',
        description: 'Apple Inc',
        type: 'stock',
      },
    ]);

    await act(async () => {
      root.render(<CreateMarketPage />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows symbol suggestions for finance category and fills selected symbol', async () => {
    const select = container.querySelector('select');
    const symbolInput = () => container.querySelector('input[placeholder*="AAPL"]');

    await act(async () => {
      setNativeValue(select, '金融');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(symbolInput()).not.toBeNull();

    await act(async () => {
      setNativeValue(symbolInput(), 'AAPL');
      symbolInput().dispatchEvent(new Event('input', { bubbles: true }));
      symbolInput().dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(mocks.searchTradingViewSymbols).toHaveBeenCalledWith('AAPL', expect.any(Object));
    expect(container.textContent).toContain('NASDAQ:AAPL');
    expect(container.textContent).toContain('Apple Inc');

    const suggestionButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('NASDAQ:AAPL'));

    await act(async () => {
      suggestionButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(symbolInput().value).toBe('NASDAQ:AAPL');
  });
});
