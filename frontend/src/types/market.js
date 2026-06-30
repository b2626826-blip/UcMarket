export const MarketStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
};

export const StatusLabel = {
  DRAFT: '草稿', PENDING: '待審核', ACTIVE: '進行中',
  CLOSED: '已截止', RESOLVED: '已結算', REJECTED: '已拒絕', CANCELED: '已取消',
};

export const CURRENT_EVENT_CATEGORY = '時事';

/**
 * @typedef {Object} CurrentEventMarket
 * @property {string} id
 * @property {string} code
 * @property {string} title
 * @property {'時事'} category
 * @property {string} description
 * @property {string} sourceUrl
 * @property {string} resolutionRule
 * @property {string} closeAt
 * @property {string} createdAt
 * @property {'ACTIVE'|'CLOSED'|'RESOLVED'|'CANCELED'} status
 * @property {'YES'|'NO'|null} result
 * @property {number} yesProbability
 * @property {number} noProbability
 * @property {number|null} volume
 * @property {string|null} imageUrl
 */