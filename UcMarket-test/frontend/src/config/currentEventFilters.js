export const currentEventFilters = [
  { id: 'all', label: '全部', keywords: [] },
  {
    id: 'international',
    label: '國際',
    keywords: ['國際', '外交', '聯合國', '跨國', '峰會', '協議'],
  },
  {
    id: 'society',
    label: '社會',
    keywords: ['社會', '政策', '交通', '教育', '醫療', '人口', '住宅'],
  },
  {
    id: 'technology',
    label: '科技',
    keywords: ['科技', 'AI', '人工智慧', '晶片', '軟體', '機器人', '新產品'],
  },
  {
    id: 'celebrity',
    label: '名人',
    keywords: ['名人', '藝人', '歌手', '演員', '網紅', '公開人物'],
  },
  {
    id: 'movie',
    label: '電影',
    keywords: ['電影', '票房', '上映', '導演', '影展'],
  },
  {
    id: 'entertainment',
    label: '娛樂',
    keywords: ['娛樂', '音樂', '演唱會', '專輯', '節目', '綜藝'],
  },
  {
    id: 'gossip',
    label: '八卦',
    keywords: ['戀情', '分手', '結婚', '離婚', '懷孕', '緋聞'],
  },
];

export function matchesCurrentEventFilter(market, filterId = 'all') {
  const activeFilter =
    currentEventFilters.find((filter) => filter.id === filterId) ??
    currentEventFilters[0];

  if (activeFilter.id === 'all') {
    return true;
  }

  const searchableText = [
    market.title,
    market.description,
    market.resolutionRule,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('zh-TW');

  return activeFilter.keywords.some((keyword) =>
    searchableText.includes(keyword.toLocaleLowerCase('zh-TW'))
  );
}