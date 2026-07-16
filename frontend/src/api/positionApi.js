import { getApi } from './client';

export function getPositions() {
  return getApi('/api/positions/me');
}

export function getOpenPositions() {
  return getApi('/api/positions/me/open');
}

export function getMarketPositions(marketId, { openOnly = false } = {}) {
  return getApi(`/api/positions/market/${marketId}${openOnly ? '/open' : ''}`);
}
