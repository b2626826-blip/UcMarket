import { matchesCurrentEventFilter } from '../config/currentEventFilters';
import { CURRENT_EVENT_CATEGORY, CURRENT_EVENT_CATEGORY_CODE } from '../types/market';
import { getApi, postApi } from './client';

export function getMarkets({ page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return getApi('/api/markets?' + params.toString());
}

export function getMarketsByCategory(category) {
  return getApi(`/api/markets?category=${encodeURIComponent(category)}`);
}

export function getMarketOdds(id) {
  return getApi('/api/markets/' + id + '/odds');
}

export function getMarketPriceHistory(id, from, to) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return getApi('/api/markets/' + id + '/price-history?' + params.toString());
}

export function placeTrade(request) {
  return postApi('/api/trades', request);
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

export async function getPagedCurrentEventMarkets(filters = {}) {
  const {
    status = 'ACTIVE',
    sort = 'popular',
    page = 0,
    size = 20,
  } = filters;

  const query = new URLSearchParams({
    status,
    sort,
    page: String(page),
    size: String(size),
  });

  const response = await getApi(`/api/current-affairs/markets?${query}`);

  return {
    ...response,
    content: response.content.map(normalizeCurrentEventMarket),
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
  };
}
