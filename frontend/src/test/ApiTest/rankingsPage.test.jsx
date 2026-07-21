import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { filterRankings, getRankingMetric, RankingTable } from '../../pages/member/rankings';

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

  it('完整排行榜不顯示帳號代碼', () => {
    const data = [1, 2, 3, 4].map((rank) => ({
      rank,
      name: `user-${rank}`,
      account: rank === 4 ? 'USR-HIDDEN' : `USR-${rank}`,
      market: null,
      profit: 0,
      winRate: 0,
      assets: 0,
    }));

    const markup = renderToStaticMarkup(<RankingTable data={data} />);

    expect(markup).toContain('user-4');
    expect(markup).not.toContain('USR-HIDDEN');
  });

  it('搜尋不使用已隱藏的帳號代碼', () => {
    const data = [{ name: 'eagle', account: 'USR-0002', market: null }];

    expect(filterRankings(data, 'USR-0002')).toEqual([]);
    expect(filterRankings(data, 'eagle')).toEqual(data);
  });
});
