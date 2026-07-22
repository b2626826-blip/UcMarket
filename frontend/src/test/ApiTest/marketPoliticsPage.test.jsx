import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MarketPolitics from '../../pages/public/market-politics';

const mocks = vi.hoisted(() => ({
  getMarkets: vi.fn(),
}));

vi.mock('../../api/marketApi', () => ({
  getMarkets: mocks.getMarkets,
}));

describe('MarketPolitics', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getMarkets.mockResolvedValue([]);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the politics banner image', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MarketPolitics />
        </MemoryRouter>,
      );
    });

    const banner = container.querySelector('.politics-banner img');
    expect(banner?.getAttribute('src')).toContain('politics-banner.jpg');
    expect(banner?.getAttribute('alt')).toBe('政治市場');
  });
});
