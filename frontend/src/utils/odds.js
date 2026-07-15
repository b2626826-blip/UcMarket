export const MIN_ODDS = 1.5;
export const MAX_ODDS = 5.0;

export function clampOdds(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.min(MAX_ODDS, Math.max(MIN_ODDS, value));
}

export function getOddsFromPools(yesPoolInput, noPoolInput, side) {
  const yesPool = Number(yesPoolInput ?? 0);
  const noPool = Number(noPoolInput ?? 0);
  const totalPool = yesPool + noPool;
  const sidePool = side === 'YES' ? yesPool : noPool;

  if (totalPool <= 0 || sidePool <= 0) {
    return null;
  }

  return clampOdds(totalPool / sidePool);
}

export function getOddsFromMarket(market, side) {
  if (!market) {
    return null;
  }

  return getOddsFromPools(market.yesPool, market.noPool, side);
}

export function getOddsFromApiResponse(oddsResponse, side) {
  const rawValue = Number(side === 'YES' ? oddsResponse?.yesOdds : oddsResponse?.noOdds);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return null;
  }

  return clampOdds(rawValue);
}

export function getFallbackOdds(side) {
  return side === 'YES' ? 1.82 : 2.22;
}
