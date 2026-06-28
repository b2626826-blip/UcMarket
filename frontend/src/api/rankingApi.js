import { getApi } from "./client";
// Ranking API placeholder.
// This file will later switch ranking data from mock data to backend API.

export const rankingApiEndpoints = {
  profit: "/api/rankings/profit",
  "win-rate": "/api/rankings/win-rate",
  assets: "/api/rankings/assets",
};

export function fetchRankings(type) {
  const endpoint = rankingApiEndpoints[type];
  return getApi(endpoint);
}