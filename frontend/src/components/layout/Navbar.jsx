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