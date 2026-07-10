import { getApi } from "./client";
// Ranking API placeholder.
// This file will later switch ranking data from mock data to backend API.

export const rankingApiEndpoints = {
  profit: "/api/rankings/profit",
  "win-rate": "/api/rankings/win-rate",
  assets: "/api/rankings/assets",
};

const inFlightRankRequests = new Map();

function normalizeRankingItem(type, item, index) {
  const baseRanking = {
    userId : item.userId,
    rank : index + 1,
    name : item.username,
    account : null,
    market : null,
    profit : null,
    winRate : null,
    assets : null,
  };

  if (type === 'profit') {
    return {
      ...baseRanking,
      profit : Number(item.realizedProfit),
    };
  }

  if (type === "win-rate") {
    return {
      ...baseRanking,
      winRate : Number(item.winRate) * 100,
    };
  }

  if (type === "assets") {
    return {
      ...baseRanking,
      assets : Number(item.totalAssetValue),
    };
  }
  return baseRanking;
}

export function fetchRankings(type) {
  const existingRequest = inFlightRankRequests.get(type);
  if (existingRequest) return existingRequest;

  const endpoint = rankingApiEndpoints[type];
  const request = getApi(endpoint).then((data) =>
  data.map((item, index) => normalizeRankingItem(type, item, index)))
  .finally(() => {
    inFlightRankRequests.delete(type);
  });

  inFlightRankRequests.set(type, request);
  return request;
}