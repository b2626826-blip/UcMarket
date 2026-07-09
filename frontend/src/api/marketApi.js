import { matchesCurrentEventFilter } from '../config/currentEventFilters';
import { CURRENT_EVENT_CATEGORY, CURRENT_EVENT_CATEGORY_CODE } from '../types/market';
import { getApi, postApi } from './client';

export function getMarkets() {
  return getApi('/api/markets');
}

export function getMarketDetail(id) {
  return getApi('/api/markets/' + id);
}

export async function getCurrentEventMarkets(filters = {}) {
  const {
    filterId = 'all',
    status = 'ACTIVE',
    keyword = '',
    sort = 'popular',
    page = 0,
    size = 20,
  } = filters;

  const normalizedKeyword = String(keyword)
    .trim()
    .toLocaleLowerCase('zh-TW');

  const query = new URLSearchParams({
    category: CURRENT_EVENT_CATEGORY_CODE,
    page: String(page),
    size: String(size),
  });

  if (status) {
    query.set('status', status);
  }

  const markets = await getApi(`/api/markets?${query}`);

  let matchedMarkets = markets
    .map(normalizeCurrentEventMarket)
    .filter((market) => {
      const matchesCategory =
        market.category === CURRENT_EVENT_CATEGORY;

      const matchesStatus =
        !status || market.status === status;

      const matchesKeyword =
        !normalizedKeyword ||
        market.title
          .toLocaleLowerCase('zh-TW')
          .includes(normalizedKeyword);

      const matchesFilter =
        matchesCurrentEventFilter(market, filterId);

      return (
        matchesCategory &&
        matchesStatus &&
        matchesKeyword &&
        matchesFilter
      );
    });

  if (sort === 'latest') {
    matchedMarkets = [...matchedMarkets].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  if (sort === 'closing') {
    matchedMarkets = [...matchedMarkets].sort(
      (a, b) => new Date(a.closeAt) - new Date(b.closeAt)
    );
  }

  return {
    content: matchedMarkets
  };
}

export async function getCurrentEventMarketDetail(id) {
  const market = await getApi(`/api/markets/${id}`);

  if (market.category !== CURRENT_EVENT_CATEGORY_CODE) {
    return null;
  }

  return normalizeCurrentEventMarket(market);
}

export function createMarket(data) {
  return postApi('/api/markets', data);
}

export function submitMarket(id) {
  return postApi('/api/markets/' + id + '/submit', null);
}

export function cancelMarket(id) {
  return postApi('/api/markets/' + id + '/cancel', null);
}

export function getAdminMarkets() {
  return getApi('/api/admin/markets');
}

export function approveMarket(id) {
  return postApi('/api/admin/markets/' + id + '/approve', null);
}

export function rejectMarket(id, comment) {
  return postApi('/api/admin/markets/' + id + '/reject', { comment });
}

export function requestMarketChanges(id, comment) {
  return postApi('/api/admin/markets/' + id + '/request-changes', { comment });
}

export function resolveMarket(id, result) {
  return postApi('/api/admin/markets/' + id + '/resolve', { result });
}

function normalizeCurrentEventMarket(market) {
  const yesPool = Number(market.yesPool ?? 0);
  const noPool = Number(market.noPool ?? 0);
  const totalPool = yesPool + noPool;
  const yesProbability = totalPool > 0
    ? Math.round((yesPool / totalPool) * 100)
    : 50;

  return {
    ...market,
    category: CURRENT_EVENT_CATEGORY,
    yesProbability,
    noProbability: 100 - yesProbability,
    volume: null,
    imageUrl: null,
  };
}
