/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * （僅被同為孤兒的 MarketHeader / MarketStats 參照，屬傳遞性死鏈。）
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
import "./GlassCard.css";

export default function GlassCard({ children, className = "" }) {
    return <div className={`glass-card ${className}`}>{children}</div>;
}