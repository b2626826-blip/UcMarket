import { describe, expect, it } from 'vitest';
import { getOddsFromApiResponse, getOddsFromPools, MAX_ODDS, MIN_ODDS } from '../../utils/odds';

describe('odds helpers', () => {
  it('clamps pool-derived odds to the backend minimum and maximum', () => {
    expect(getOddsFromPools(100, 100, 'YES')).toBe(2);
    expect(getOddsFromPools(100, 20, 'YES')).toBe(MIN_ODDS);
    expect(getOddsFromPools(20, 100, 'YES')).toBe(MAX_ODDS);
  });

  it('uses the same odds bounds for backend responses', () => {
    expect(getOddsFromApiResponse({ yesOdds: '1.2' }, 'YES')).toBe(MIN_ODDS);
    expect(getOddsFromApiResponse({ noOdds: '8.4' }, 'NO')).toBe(MAX_ODDS);
  });
});
