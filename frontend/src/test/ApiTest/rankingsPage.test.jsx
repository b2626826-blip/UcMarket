import { describe, expect, it } from 'vitest';
import { getRankingMetric } from '../../pages/member/rankings';

const user = {
  profit: 1250,
  winRate: 72.5,
  assets: 8300,
};

describe('排行榜前三名指標', () => {
  it.each([
    ['profit', '收益', '+$1,250', '勝率', '72.5%'],
    ['win-rate', '勝率', '72.5%', '收益', '+$1,250'],
    ['assets', '資產', '$8,300', undefined, undefined],
  ])('%s 榜顯示正確指標', (type, label, value, secondaryLabel, secondaryValue) => {
    expect(getRankingMetric(type, user)).toEqual({
      label,
      value,
      ...(secondaryLabel && { secondaryLabel, secondaryValue }),
    });
  });
});
