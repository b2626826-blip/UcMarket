const CATEGORY_LABELS = {
  POLITICS: '政治',
  POLITICAL: '政治',
  FINANCE: '金融',
  FINANCIAL: '金融',
  CRYPTO: '加密貨幣',
  CRYPTOCURRENCY: '加密貨幣',
  WEATHER: '天氣',
  SPORTS: '運動',
  CURRENT_AFFAIRS: '時事',
};

const MARKET_PATHS = {
  POLITICS: 'politics',
  POLITICAL: 'politics',
  FINANCE: 'finance',
  FINANCIAL: 'finance',
  WEATHER: 'weather',
  SPORTS: 'sports',
  CURRENT_AFFAIRS: 'current-affairs',
};

export function buildDisplayPositions(positionRows = [], marketsById = new Map()) {
  return positionRows.flatMap((position) => {
    const market = marketsById.get(position.marketId) || {};
    return ['YES', 'NO'].flatMap((side) => {
      const shares = toNumber(position[`${side.toLowerCase()}Shares`]);
      if (shares <= 0) return [];

      const totalCost = toNumber(position[`${side.toLowerCase()}Cost`]);
      const currentOdds = getCurrentOdds(market, side);
      return [{
        id: `${position.id}-${side}`,
        positionId: position.id,
        marketId: position.marketId,
        marketCategory: market.category || '',
        title: market.title || `市場 ${position.marketId}`,
        category: getCategoryLabel(market.category),
        side,
        shares,
        cost: totalCost,
        avgOdds: shares > 0 ? totalCost / shares : 0,
        currentOdds,
        potentialPayout: getPotentialPayout({
          status: position.status,
          result: market.result,
          side,
          cost: totalCost,
          currentOdds,
        }),
        status: position.status || 'OPEN',
        closeAt: formatDate(market.closeAt),
        updatedAt: position.updatedAt,
      }];
    });
  });
}

export function getMarketPath(position) {
  const segment = MARKET_PATHS[position.marketCategory];
  return segment ? `/markets/${segment}/${position.marketId}` : '/home';
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || '其他';
}

function getCurrentOdds(market, side) {
  const yesPool = toNumber(market.yesPool);
  const noPool = toNumber(market.noPool);
  const totalPool = yesPool + noPool;
  const sidePool = side === 'YES' ? yesPool : noPool;
  if (totalPool <= 0 || sidePool <= 0) return 0;
  return totalPool / sidePool;
}

function getPotentialPayout({ status, result, side, cost, currentOdds }) {
  if (status === 'CANCELED') return cost;
  if (status === 'SETTLED') {
    return result === side ? cost * currentOdds : 0;
  }
  return cost * currentOdds;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}
