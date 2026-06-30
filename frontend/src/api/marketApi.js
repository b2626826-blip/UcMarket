import { getApi, postApi, putApi } from './client';
import { matchesCurrentEventFilter } from '../config/currentEventFilters';
import { mockCurrentEventMarkets } from '../mocks/currentEventMarkets';
import { CURRENT_EVENT_CATEGORY } from '../types/market';

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

  let matchedMarkets = mockCurrentEventMarkets.filter((market) => {
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

  const currentPage = Math.max(
    0,
    Math.trunc(Number(page) || 0)
  );

  const pageSize = Math.max(
    1,
    Math.trunc(Number(size) || 20)
  );

  const start = currentPage * pageSize;

  return {
    content: matchedMarkets.slice(start, start + pageSize),
    page: currentPage,
    size: pageSize,
    totalElements: matchedMarkets.length,
    totalPages: Math.ceil(matchedMarkets.length / pageSize),
  };
}

export async function getCurrentEventMarketDetail(id) {
  return (
    mockCurrentEventMarkets.find(
      (market) => market.id === String(id)
    ) ?? null
  );
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
