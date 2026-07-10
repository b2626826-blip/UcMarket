import { getApi } from "./client";

export const rankingApiEndpoints = {
  profit: "/api/rankings/profit",
  "win-rate": "/api/rankings/win-rate",
  assets: "/api/rankings/assets",
};

const inFlightRankRequests = new Map();

function mergeRankingData(profitData, winRateData, assetsData) {
  const rankingsByUser = new Map();

  for (const item of profitData) {
    rankingsByUser.set(item.userId, {
      userId: item.userId,
      name: item.username,
      account: item.account,
      market: item.primaryMarket,
      profit: Number(item.realizedProfit),
      winRate: null,
      resolvedMarketCount: 0,
      assets: null,
    });
  }

  for (const item of winRateData) {
    const ranking = rankingsByUser.get(item.userId);
    if (ranking) {
      ranking.winRate = Number(item.winRate) * 100;
      ranking.resolvedMarketCount = Number(item.resolvedMarketCount);
    }
  }

  for (const item of assetsData) {
    const ranking = rankingsByUser.get(item.userId);
    if (ranking) ranking.assets = Number(item.totalAssetValue);
  }

  return [...rankingsByUser.values()];
}

function sortRankings(type, rankings) {
  const field = type === "win-rate" ? "winRate" : type;
  return rankings
    .sort((left, right) =>
      right[field] - left[field]
      || (type === "win-rate" && right.resolvedMarketCount - left.resolvedMarketCount)
      || left.name.localeCompare(right.name)
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function fetchRankings(type) {
  const existingRequest = inFlightRankRequests.get(type);
  if (existingRequest) return existingRequest;

  const request = Promise.all([
    getApi(rankingApiEndpoints.profit),
    getApi(rankingApiEndpoints["win-rate"]),
    getApi(rankingApiEndpoints.assets),
  ])
    .then(([profitData, winRateData, assetsData]) =>
      sortRankings(type, mergeRankingData(profitData, winRateData, assetsData))
    )
    .finally(() => {
      inFlightRankRequests.delete(type);
    });

  inFlightRankRequests.set(type, request);
  return request;
}
