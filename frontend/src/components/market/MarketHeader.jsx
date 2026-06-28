import GlassCard from "../common/GlassCard";
import "./MarketHeader.css";

export default function MarketHeader() {
  return (
    <GlassCard className="market-header">
      <div>
        <span className="market-header__tag">Crypto Forecast</span>
        <h1>BTC 是否會在 2026 年底突破 $200,000？</h1>
        <p>市場狀態：Open Market</p>
      </div>

      <div className="market-header__prices">
        <div className="price-box price-box--yes">
          <span>YES Price</span>
          <strong>$0.64</strong>
        </div>

        <div className="price-box price-box--no">
          <span>NO Price</span>
          <strong>$0.36</strong>
        </div>
      </div>
    </GlassCard>
  );
}