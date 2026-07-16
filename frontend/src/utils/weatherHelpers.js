export function parseMetadata(market) {
  if (!market.metadata) return {};
  try {
    return typeof market.metadata === 'string' ? JSON.parse(market.metadata) : market.metadata;
  } catch {
    return {};
  }
}

export function formatDateLabel(dateText) {
  if (!dateText) return '';
  const [, m, d] = dateText.split('-');
  return `${m}/${d}`;
}

function formatMonthLabel(dateText) {
  if (!dateText) return '';
  const month = parseInt(dateText.split('-')[1], 10);
  return `${month}月`;
}

export function getMetricLabel(metric) {
  if (metric === 'maxTemp') return '最高溫預測';
  if (metric === 'monthlyRain') return '月降雨量預測';
  return '降雨預測';
}

export function groupWeatherMarkets(markets) {
  const groups = new Map();

  markets.forEach((market) => {
    const meta = parseMetadata(market);
    if (!meta.city || !meta.date || !meta.metric) return;
    const key = `${meta.city}|${meta.date}|${meta.metric}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: market.id,
        city: meta.city,
        date: meta.date,
        metric: meta.metric,
        totalYesPool: 0,
        totalNoPool: 0,
        earliestCloseAt: market.closeAt,
        status: market.status,
        eventCount: 0,
      });
    }

    const g = groups.get(key);
    g.eventCount++;
    g.totalYesPool += Number(market.yesPool) || 0;
    g.totalNoPool += Number(market.noPool) || 0;

    if (market.status === 'ACTIVE' && g.status !== 'ACTIVE') {
      g.id = market.id;
      g.status = 'ACTIVE';
    }
    if (new Date(market.closeAt) < new Date(g.earliestCloseAt)) {
      g.earliestCloseAt = market.closeAt;
    }
  });

  const result = [];
  for (const [, g] of groups) {
    const totalPool = g.totalYesPool + g.totalNoPool;
    const yesProbability = totalPool > 0 ? Math.round((g.totalYesPool / totalPool) * 100) : 50;

    let dateLabel;
    let title;
    if (g.metric === 'monthlyRain') {
      dateLabel = formatMonthLabel(g.date);
      title = `${dateLabel} ${g.city}月降雨量預測`;
    } else {
      dateLabel = formatDateLabel(g.date);
      title = `${dateLabel} ${g.city}最高溫預測`;
    }

    result.push({
      id: g.id,
      city: g.city,
      date: g.date,
      metric: g.metric,
      title,
      yesPool: g.totalYesPool,
      noPool: g.totalNoPool,
      volume: g.totalYesPool + g.totalNoPool,
      yesProbability,
      noProbability: 100 - yesProbability,
      closeAt: g.earliestCloseAt,
      status: g.status,
      eventCount: g.eventCount,
    });
  }

  result.sort((a, b) => {
    const statusA = a.status === 'ACTIVE' ? 0 : 1;
    const statusB = b.status === 'ACTIVE' ? 0 : 1;
    if (statusA !== statusB) return statusA - statusB;
    if (a.metric === 'monthlyRain' && b.metric !== 'monthlyRain') return 1;
    if (a.metric !== 'monthlyRain' && b.metric === 'monthlyRain') return -1;
    const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
    if (dateCmp !== 0) return dateCmp;
    const cityCmp = a.city.localeCompare(b.city);
    if (cityCmp !== 0) return cityCmp;
    return a.metric.localeCompare(b.metric);
  });

  return result;
}
