import { describe, expect, it } from 'vitest';
import { showsCurrentEventMarkets } from '../../pages/public/home';

describe('首頁時事市場顯示條件', () => {
  it('全部與時事分類都會顯示時事市場', () => {
    expect(showsCurrentEventMarkets('全部')).toBe(true);
    expect(showsCurrentEventMarkets('時事')).toBe(true);
    expect(showsCurrentEventMarkets('政治')).toBe(false);
  });
});
