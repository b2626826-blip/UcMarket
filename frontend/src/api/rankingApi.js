import { getApi } from "./client";

export const rankingApiEndpoints = {
  profit: "/api/rankings/profit",
  "win-rate": "/api/rankings/win-rate",
  assets: "/api/rankings/assets",
};

const inFlightRankRequests = new Map();

function mergeRankingData(profitData, winRateData, assetsData) {
  const rankingsByUser = new Map();

  const getRanking = (item) => {
    if (!rankingsByUser.has(item.userId)) {
      rankingsByUser.set(item.userId, {
        userId: item.userId,
        name: item.username,
        account: item.account,
        market: item.primaryMarket,
        profit: null,
        winRate: null,
        resolvedMarketCount: 0,
        assets: null,
      });
    }

    return rankingsByUser.get(item.userId);
  };

  for (const item of profitData) {
    getRanking(item).profit = Number(item.realizedProfit);
  }

  for (const item of winRateData) {
    const ranking = getRanking(item);
    ranking.winRate = Number(item.winRate) * 100;
    ranking.resolvedMarketCount = Number(item.resolvedMarketCount);
  }

  for (const item of assetsData) {
    getRanking(item).assets = Number(item.totalAssetValue);
  }

  return [...rankingsByUser.values()];
}

function sortRankings(type, rankings) {
  const field = type === "win-rate" ? "winRate" : type;

  return rankings
    .sort((left, right) => {
      const leftValue = left[field];
      const rightValue = right[field];
      const leftHasValue = leftValue !== null && leftValue !== undefined;
      const rightHasValue = rightValue !== null && rightValue !== undefined;

      if (leftHasValue !== rightHasValue) return rightHasValue ? 1 : -1;
      if (leftHasValue && rightValue !== leftValue) return rightValue - leftValue;
      if (type === "win-rate" && right.resolvedMarketCount !== left.resolvedMarketCount) {
        return right.resolvedMarketCount - left.resolvedMarketCount;
      }

      return left.name.localeCompare(right.name);
    })
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
