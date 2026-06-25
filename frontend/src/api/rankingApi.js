import { getApi } from './client';

export function getRankings() {
  return getApi('/api/rankings');
}
