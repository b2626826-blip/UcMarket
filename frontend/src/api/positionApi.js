import { getApi } from './client';

export function getPositions() {
  return getApi('/api/positions');
}

export function getPositionDetail(id) {
  return getApi('/api/positions/' + id);
}
