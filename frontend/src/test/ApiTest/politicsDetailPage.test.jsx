import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PoliticsDetailPage from '../../pages/public/market-detail-politics';

const mocks = vi.hoisted(() => ({
  getMarketDetail: vi.fn(),
}));

vi.mock('../../api/marketApi', () => ({
  getMarketDetail: mocks.getMarketDetail,
}));

vi.mock('../../components/common/DetailPageTemplate', () => ({
  default: ({ children, market, showHeroMain, tradePanel }) => (
    <div
      data-testid="detail-template"
      data-has-market={market ? 'true' : 'false'}
      data-show-hero-main={String(showHeroMain)}
    >
      {children}
      {tradePanel ?? <div>TRADE PANEL</div>}
    </div>
  ),
}));

vi.mock('../../components/market/TradePanel', () => ({
  default: () => <div>TRADE PANEL</div>,
}));

describe('PoliticsDetailPage', () => {
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

  async function renderPage() {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/markets/politics/p1']}>
          <Routes>
            <Route path="/markets/politics/:id" element={<PoliticsDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it('passes the loaded market to the detail template and hides its default hero', async () => {
    mocks.getMarketDetail.mockResolvedValue({
      id: 'p1',
      code: 'POL-1',
      category: '政治',
      title: '政治市場測試',
      marketType: 'BINARY',
      status: 'ACTIVE',
      yesPool: 60,
      noPool: 40,
      closeAt: '2026-07-20T10:00:00Z',
    });

    await renderPage();

    const template = container.querySelector('[data-testid="detail-template"]');
    expect(template?.dataset.hasMarket).toBe('true');
    expect(template?.dataset.showHeroMain).toBe('false');
    expect(container.textContent).toContain('政治市場測試');
    expect(container.textContent).toContain('TRADE PANEL');
  });

  it('does not show the trade panel when market detail fails to load', async () => {
    mocks.getMarketDetail.mockRejectedValue(new Error('network down'));

    await renderPage();

    expect(container.textContent).toContain('network down');
    expect(container.textContent).not.toContain('TRADE PANEL');
  });
});
