import { matchesCurrentEventFilter } from '../config/currentEventFilters';
import { CURRENT_EVENT_CATEGORY, CURRENT_EVENT_CATEGORY_CODE } from '../types/market';
import { getApi, postApi } from './client';

const TRADING_VIEW_SYMBOL_CATALOG = [
  { symbol: 'NASDAQ:AAPL', exchange: 'NASDAQ', description: 'Apple Inc', type: 'stock' },
  { symbol: 'NASDAQ:TSLA', exchange: 'NASDAQ', description: 'Tesla', type: 'stock' },
  { symbol: 'NASDAQ:NVDA', exchange: 'NASDAQ', description: 'NVIDIA', type: 'stock' },
  { symbol: 'NASDAQ:MSFT', exchange: 'NASDAQ', description: 'Microsoft', type: 'stock' },
  { symbol: 'NASDAQ:AMZN', exchange: 'NASDAQ', description: 'Amazon', type: 'stock' },
  { symbol: 'NASDAQ:META', exchange: 'NASDAQ', description: 'Meta Platforms', type: 'stock' },
  { symbol: 'NASDAQ:GOOGL', exchange: 'NASDAQ', description: 'Alphabet Class A', type: 'stock' },
  { symbol: 'NASDAQ:AMD', exchange: 'NASDAQ', description: 'AMD', type: 'stock' },
  { symbol: 'NASDAQ:QQQ', exchange: 'NASDAQ', description: 'Invesco QQQ Trust', type: 'etf' },
  { symbol: 'AMEX:SPY', exchange: 'AMEX', description: 'SPDR S&P 500 ETF Trust', type: 'etf' },
  { symbol: 'INDEX:SPX', exchange: 'INDEX', description: 'S&P 500', type: 'index' },
  { symbol: 'INDEX:NDX', exchange: 'INDEX', description: 'NASDAQ 100', type: 'index' },
  { symbol: 'TVC:DJI', exchange: 'TVC', description: 'Dow Jones Industrial Average', type: 'index' },
  { symbol: 'TVC:VIX', exchange: 'TVC', description: 'CBOE Volatility Index', type: 'index' },
  { symbol: 'BINANCE:BTCUSDT', exchange: 'BINANCE', description: 'Bitcoin / Tether', type: 'crypto' },
  { symbol: 'BINANCE:ETHUSDT', exchange: 'BINANCE', description: 'Ethereum / Tether', type: 'crypto' },
  { symbol: 'BINANCE:SOLUSDT', exchange: 'BINANCE', description: 'Solana / Tether', type: 'crypto' },
  { symbol: 'BINANCE:XRPUSDT', exchange: 'BINANCE', description: 'XRP / Tether', type: 'crypto' },
  { symbol: 'BINANCE:BNBUSDT', exchange: 'BINANCE', description: 'BNB / Tether', type: 'crypto' },
  { symbol: 'BINANCE:DOGEUSDT', exchange: 'BINANCE', description: 'Dogecoin / Tether', type: 'crypto' },
  { symbol: 'BITSTAMP:BTCUSD', exchange: 'BITSTAMP', description: 'Bitcoin / US Dollar', type: 'crypto' },
  { symbol: 'FX:USDJPY', exchange: 'FX', description: 'US Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'FX:EURUSD', exchange: 'FX', description: 'Euro / US Dollar', type: 'forex' },
  { symbol: 'FX:GBPUSD', exchange: 'FX', description: 'British Pound / US Dollar', type: 'forex' },
  { symbol: 'TVC:GOLD', exchange: 'TVC', description: 'Gold', type: 'commodity' },
  { symbol: 'TVC:SILVER', exchange: 'TVC', description: 'Silver', type: 'commodity' },
  { symbol: 'COMEX:GC1!', exchange: 'COMEX', description: 'Gold Futures', type: 'futures' },
  { symbol: 'NYMEX:CL1!', exchange: 'NYMEX', description: 'Crude Oil Futures', type: 'futures' },
  { symbol: 'TPE:2330', exchange: 'TPE', description: '台積電', type: 'stock' },
  { symbol: 'TPE:2317', exchange: 'TPE', description: '鴻海', type: 'stock' },
  { symbol: 'TPE:2454', exchange: 'TPE', description: '聯發科', type: 'stock' },
];

export function getMarkets({ page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size), status: 'ACTIVE' });
  return getApi('/api/markets?' + params.toString());
}

export function getMarketsByCategory(category) {
  return getApi(`/api/markets?category=${encodeURIComponent(category)}&size=1000`);
}

export function getMarketOdds(id) {
  return getApi('/api/markets/' + id + '/odds');
}

export function getTradeQuote(marketId, request) {
  return postApi('/api/markets/' + marketId + '/trades/quote', request);
}

export function getMarketPriceHistory(id, from, to) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return getApi('/api/markets/' + id + '/price-history?' + params.toString());
}

export function placeTrade(request, idempotencyKey) {
  return postApi(
    '/api/trades',
    request,
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
}

export function getMarketDetail(id) {
  return getApi('/api/markets/' + id);
}

export async function searchTradingViewSymbols(keyword, { signal } = {}) {
  const text = String(keyword ?? '').trim();
  if (!text) {
    return [];
  }

  const localMatches = searchLocalTradingViewSymbols(text);

  const params = new URLSearchParams({
    text,
    hl: 'zh-TW',
    exchange: '',
    lang: 'zh_TW',
    search_type: 'undefined',
    domain: 'production',
  });

  try {
    const response = await fetch(`https://symbol-search.tradingview.com/symbol_search/?${params}`, { signal });
    if (!response.ok) {
      return localMatches;
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return localMatches;
    }

    const remoteMatches = payload
      .map((item) => {
        const exchange = item.exchange?.trim();
        const rawSymbol = item.symbol?.trim() || item.ticker?.trim();
        const fullName = item.full_name?.trim();
        const symbol = fullName || (exchange && rawSymbol ? `${exchange}:${rawSymbol}` : rawSymbol);

        if (!symbol) {
          return null;
        }

        return {
          symbol,
          exchange: exchange || '',
          description: item.description?.trim() || '',
          type: item.type?.trim() || '',
        };
      })
      .filter(Boolean);

    return mergeTradingViewSymbolResults(localMatches, remoteMatches);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    return localMatches;
  }
}

function searchLocalTradingViewSymbols(keyword) {
  const normalized = keyword.trim().toLocaleLowerCase('zh-TW');

  return TRADING_VIEW_SYMBOL_CATALOG
    .map((item) => ({
      ...item,
      score: getTradingViewSymbolScore(item, normalized),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
    .slice(0, 8)
    .map(({ score, ...item }) => item);
}

function getTradingViewSymbolScore(item, normalizedKeyword) {
  const haystacks = [
    item.symbol,
    item.exchange,
    item.description,
    item.type,
  ].map((value) => String(value ?? '').toLocaleLowerCase('zh-TW'));

  if (haystacks[0].startsWith(normalizedKeyword)) return 120;
  if (haystacks[0].includes(`:${normalizedKeyword}`)) return 110;
  if (haystacks[2].startsWith(normalizedKeyword)) return 100;
  if (haystacks.some((value) => value.includes(normalizedKeyword))) return 80;
  return 0;
}

function mergeTradingViewSymbolResults(localMatches, remoteMatches) {
  const merged = new Map();

  for (const item of [...localMatches, ...remoteMatches]) {
    if (!merged.has(item.symbol)) {
      merged.set(item.symbol, item);
    }
  }

  return Array.from(merged.values());
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

export function getAdminMarkets(params) {
  const q = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString() : '';
  return getApi('/api/admin/markets' + q);
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
