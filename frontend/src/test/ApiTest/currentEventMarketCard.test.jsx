import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CurrentEventMarketCard from '../../components/market/CurrentEventMarketCard';

const market = {
  id: 'market-1',
  title: '測試時事市場',
  category: '時事',
  status: 'ACTIVE',
  yesProbability: 60,
  noProbability: 40,
  volume: 100,
  closeAt: '2026-08-01T00:00:00',
};

function renderCard(overrides = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CurrentEventMarketCard market={{ ...market, ...overrides }} />
    </MemoryRouter>,
  );
}

describe('CurrentEventMarketCard', () => {
  it('renders the market image returned by the current-affairs API', () => {
    const markup = renderCard({ imageUrl: 'https://images.example.com/market.jpg' });

    expect(markup).toContain('src="https://images.example.com/market.jpg"');
    expect(markup).not.toContain('fa-newspaper');
  });

  it('renders the fallback icon when no usable image URL is available', () => {
    const markup = renderCard({ imageUrl: '   ' });

    expect(markup).not.toContain('<img');
    expect(markup).toContain('fa-newspaper');
  });
});
