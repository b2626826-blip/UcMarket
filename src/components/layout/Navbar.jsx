/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          UCMARKET
        </Link>

        <nav className="navbar__links">
          <NavLink to="/markets">Markets</NavLink>
          <NavLink to="/rankings">Leaderboard</NavLink>
          <NavLink to="/portfolio">Portfolio</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
        </nav>

        <div className="navbar__actions">
          <Link to="/auth/login" className="navbar__login">
            登入
          </Link>
          <Link to="/auth/register" className="navbar__register">
            註冊
          </Link>
        </div>
      </div>
    </header>
  );
}