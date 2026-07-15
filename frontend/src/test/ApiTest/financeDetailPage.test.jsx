import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FinanceDetailPage from '../../pages/public/market-detail-finance';

const mocks = vi.hoisted(() => ({
  getMarketDetail: vi.fn(),
}));

vi.mock('../../api/marketApi', () => ({
  getMarketDetail: mocks.getMarketDetail,
}));

vi.mock('../../components/finance/TradingViewWidget', () => ({
  default: ({ symbol }) => <div data-testid="tv-widget">{symbol || 'EMPTY'}</div>,
}));

vi.mock('../../components/finance/TradingViewNewsWidget', () => ({
  default: () => <div>NEWS</div>,
}));

vi.mock('../../components/market/TradePanel', () => ({
  default: () => <div>TRADE PANEL</div>,
}));

vi.mock('../../hooks/useGlowEffect', () => ({
  default: () => {},
}));

describe('FinanceDetailPage', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('loads market detail and passes tradingViewSymbol into TradingViewWidget', async () => {
    mocks.getMarketDetail.mockResolvedValue({
      id: 'm1',
      code: 'MKT0001',
      category: '金融',
      title: 'Apple 市場',
      description: 'AAPL 描述',
      status: 'ACTIVE',
      closeAt: '2026-07-20T10:00:00Z',
      resolutionRule: '收盤價判定',
      metadata: JSON.stringify({ type: 'FINANCE', tradingViewSymbol: 'NASDAQ:AAPL' }),
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/markets/finance/m1']}>
          <Routes>
            <Route path="/markets/finance/:id" element={<FinanceDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.getMarketDetail).toHaveBeenCalledWith('m1');
    expect(container.textContent).toContain('Apple 市場');
    expect(container.textContent).toContain('AAPL 描述');
    expect(container.textContent).toContain('TradingView Symbol: NASDAQ:AAPL');
    expect(container.querySelector('[data-testid="tv-widget"]')?.textContent).toBe('NASDAQ:AAPL');
  });

  it('shows fallback text when tradingViewSymbol is missing', async () => {
    mocks.getMarketDetail.mockResolvedValue({
      id: 'm2',
      code: 'MKT0002',
      category: '金融',
      title: 'ETH 市場',
      description: 'ETH 描述',
      status: 'ACTIVE',
      closeAt: '2026-07-20T10:00:00Z',
      resolutionRule: '價格判定',
      metadata: JSON.stringify({ type: 'FINANCE' }),
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/markets/finance/m2']}>
          <Routes>
            <Route path="/markets/finance/:id" element={<FinanceDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.getMarketDetail).toHaveBeenCalledWith('m2');
    expect(container.textContent).toContain('尚未設定金融商品');
    expect(container.querySelector('[data-testid="tv-widget"]')?.textContent).toBe('EMPTY');
  });

  it('does not show the trade panel when market detail fails to load', async () => {
    mocks.getMarketDetail.mockRejectedValue(new Error('network down'));

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/markets/finance/m3']}>
          <Routes>
            <Route path="/markets/finance/:id" element={<FinanceDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('network down');
    expect(container.textContent).not.toContain('TRADE PANEL');
  });
});
