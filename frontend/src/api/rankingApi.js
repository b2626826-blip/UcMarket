import { getApi } from "./client";

export const rankingApiEndpoints = {
  snapshot: "/api/rankings",
};

const inFlightRankRequests = new Map();

function toRankingNumber(value, multiplier = 1) {
  if (value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue * multiplier : null;
}

function toRanking(item) {
  return {
    rank: toRankingNumber(item.rank),
    userId: item.userId,
    name: item.username,
    account: item.account,
    market: item.primaryMarket,
    profit: toRankingNumber(item.realizedProfit),
    winRate: toRankingNumber(item.winRate, 100),
    resolvedMarketCount: toRankingNumber(item.resolvedMarketCount) ?? 0,
    assets: toRankingNumber(item.totalAssetValue),
  };
}

export function fetchRankings(type) {
  const existingRequest = inFlightRankRequests.get(type);
  if (existingRequest) return existingRequest;

  const request = getApi(
    `${rankingApiEndpoints.snapshot}?metric=${encodeURIComponent(type)}`
  )
    .then((snapshot) => snapshot.items.map(toRanking))
    .finally(() => {
      inFlightRankRequests.delete(type);
    });

  inFlightRankRequests.set(type, request);
  return request;
}
