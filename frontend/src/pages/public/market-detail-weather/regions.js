export const REGIONS = [
  { id: 5, city: '台中', dateLabel: '明天', offset: 1, metric: 'maxTemp', relatedIds: [501, 502, 6] },
  { id: 501, city: '台北', dateLabel: '明天', offset: 1, metric: 'maxTemp', relatedIds: [5, 502, 6] },
  { id: 502, city: '台南', dateLabel: '明天', offset: 1, metric: 'maxTemp', relatedIds: [5, 501, 6] },
  { id: 6, city: '台北', dateLabel: '七月', offset: 0, metric: 'monthlyRain', relatedIds: [5, 501, 502] },
];

// js 補 縣市

export function getRegionById(id) {
  const numericId = Number(id);
  return REGIONS.find((r) => r.id === numericId) || REGIONS[0];
}

export function getRelatedRegions(region) {
  if (!region) return [];
  return REGIONS.filter((r) => region.relatedIds.includes(r.id));
}
