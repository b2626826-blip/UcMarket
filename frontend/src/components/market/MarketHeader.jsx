/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
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