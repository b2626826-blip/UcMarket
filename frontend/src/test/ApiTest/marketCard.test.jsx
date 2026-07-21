import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import MarketCard from '../../components/market/MarketCard';

describe('MarketCard', () => {
  it('renders volume without the legacy trader count', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <MarketCard
          market={{
            id: 1,
            category: '政治',
            title: '測試政治市場',
            date: '2026/07/14',
            yesPrice: 0.6,
            noPrice: 0.4,
            volume: '$10.0',
            traders: '0',
          }}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('Volume $10.0');
    expect(markup).not.toContain('traders');
  });

  it('links both trade actions to the selected market detail page', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <MarketCard
          market={{
            id: 42,
            category: '政治',
            title: '測試政治市場',
            date: '2026/07/21',
            yesPrice: 0.6,
            noPrice: 0.4,
            volume: '$10.0',
          }}
        />
      </MemoryRouter>,
    );

    expect(markup).toMatch(/<a class="trade-btn buy-btn"[^>]*href="\/markets\/politics\/42"[^>]*>Buy Yes<\/a>/);
    expect(markup).toMatch(/<a class="trade-btn sell-btn"[^>]*href="\/markets\/politics\/42"[^>]*>Buy No<\/a>/);
  });
});
