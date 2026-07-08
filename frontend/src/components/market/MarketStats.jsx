/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
import GlassCard from "../common/GlassCard";
import "./MarketStats.css";

export default function MarketStats() {
  return (
    <GlassCard className="market-stats">
      <h3>Market Stats</h3>

      <div className="market-stats__item">
        <span>Volume</span>
        <strong>$12.4M</strong>
      </div>

      <div className="market-stats__item">
        <span>Liquidity</span>
        <strong>$840K</strong>
      </div>

      <div className="market-stats__item">
        <span>Traders</span>
        <strong>8.2K</strong>
      </div>

      <div className="market-stats__item">
        <span>Close Time</span>
        <strong>2026-12-31</strong>
      </div>
    </GlassCard>
  );
}