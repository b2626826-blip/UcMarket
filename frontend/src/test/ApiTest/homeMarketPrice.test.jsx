import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../../pages/public/home';

const mocks = vi.hoisted(() => ({
  getMarkets: vi.fn(),
  getMarketsByCategory: vi.fn(),
  getPagedCurrentEventMarkets: vi.fn(),
}));

vi.mock('../../api/marketApi', () => ({
  getMarkets: mocks.getMarkets,
  getMarketsByCategory: mocks.getMarketsByCategory,
  getPagedCurrentEventMarkets: mocks.getPagedCurrentEventMarkets,
}));

vi.mock('../../components/market/MarketTrendCarousel', () => ({
  default: () => null,
}));

vi.mock('../../hooks/useGlowEffect', () => ({ default: () => {} }));

describe('HomePage market prices', () => {
  let container;
  let root;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mocks.getMarkets.mockResolvedValue([{
      id: 'market-1',
      category: 'POLITICS',
      title: 'Test market',
      yesPool: 60,
      noPool: 40,
      volume: 100,
      closeAt: '2026-07-30T00:00:00Z',
    }]);
    mocks.getPagedCurrentEventMarkets.mockResolvedValue({
      content: [],
      totalPages: 0,
      hasNext: false,
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps API pool prices instead of changing them on a timer', async () => {
    const marketCard = container.querySelector('.market-card');
    expect(marketCard.textContent).toContain('$0.60');
    expect(marketCard.textContent).toContain('$0.40');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(marketCard.textContent).toContain('$0.60');
    expect(marketCard.textContent).toContain('$0.40');
  });
});
