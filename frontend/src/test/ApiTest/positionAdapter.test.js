import { describe, expect, it } from 'vitest';
import {
  buildDisplayPositions,
  getMarketPath,
} from '../../pages/member/positions/positionAdapter';

describe('positionAdapter', () => {
  const market = {
    id: 'm1',
    title: '測試市場',
    category: 'WEATHER',
    status: 'ACTIVE',
    closeAt: '2026-07-20T23:59:59',
    yesPool: 60,
    noPool: 40,
  };

  it('將同一筆後端持倉拆成 YES 與 NO 顯示卡', () => {
    const result = buildDisplayPositions([{
      id: 'p1',
      marketId: 'm1',
      yesShares: 20,
      noShares: 10,
      yesCost: 40,
      noCost: 25,
      status: 'OPEN',
    }], new Map([['m1', market]]));

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'p1-YES',
      category: '天氣',
      side: 'YES',
      shares: 20,
      cost: 40,
      avgOdds: 2,
      currentOdds: 100 / 60,
      potentialPayout: 40 * (100 / 60),
    });
    expect(result[1]).toMatchObject({
      id: 'p1-NO',
      side: 'NO',
      currentOdds: 2.5,
      potentialPayout: 62.5,
    });
  });

  it('略過零份額，已結算市場依結果計價', () => {
    const result = buildDisplayPositions([{
      id: 'p1',
      marketId: 'm1',
      yesShares: 5,
      noShares: 0,
      yesCost: 2,
      noCost: 0,
      status: 'SETTLED',
    }], new Map([['m1', { ...market, status: 'RESOLVED', result: 'NO' }]]));

    expect(result).toHaveLength(1);
    expect(result[0].potentialPayout).toBe(0);
  });

  it('取消持倉以投入成本作為退款金額', () => {
    const result = buildDisplayPositions([{
      id: 'p1',
      marketId: 'm1',
      yesShares: 5,
      noShares: 0,
      yesCost: 10,
      noCost: 0,
      status: 'CANCELED',
    }], new Map([['m1', { ...market, status: 'CANCELED' }]]));

    expect(result[0].potentialPayout).toBe(10);
  });

  it('依市場分類建立正確詳情路由', () => {
    expect(getMarketPath({ marketCategory: 'WEATHER', marketId: 'm1' }))
      .toBe('/markets/weather/m1');
    expect(getMarketPath({ marketCategory: 'UNKNOWN', marketId: 'm1' }))
      .toBe('/home');
  });
});
