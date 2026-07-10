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