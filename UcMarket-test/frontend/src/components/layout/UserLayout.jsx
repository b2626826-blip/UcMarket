import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import AuthModal from '../common/AuthModal';
import Toast from '../common/Toast';
import logoImg from '../../assets/logos/ucmarket-logo.png';

export default function UserLayout() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const role = user?.role || user?.userRole;
  const isAdmin = role === 'ADMIN' || role === 'admin';
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [navActionsOpen, setNavActionsOpen] = useState(false);
  const [openFooterSection, setOpenFooterSection] = useState(null);

  const openLogin = useCallback(() => { setAuthTab('login'); setAuthOpen(true); }, []);
  const openRegister = useCallback(() => { setAuthTab('register'); setAuthOpen(true); }, []);
  const closeNavActions = useCallback(() => setNavActionsOpen(false), []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (location.hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(location.hash)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return (
    <>
      <nav className="navbar">
        <Link to={isLanding ? '/' : '/home'} className="logo">
          <img className="logo-image" src={logoImg} alt="UCMARKET" />
          <span>UCMARKET</span>
        </Link>
        {!isLanding && (
          <>
            <div className="nav-menu" onClick={closeNavActions}>
              <Link to="/home" data-page="views/dashboard.html">市場</Link>
              <Link to="/rankings">排行榜</Link>
              <Link to={user ? '/wallet' : '/auth/login'}>錢包</Link>
            </div>
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={navActionsOpen}
              aria-controls="nav-actions"
              onClick={() => setNavActionsOpen((open) => !open)}
            >
              <span className="visually-hidden">{navActionsOpen ? '收合選單' : '展開選單'}</span>
              <i className={`fa-solid ${navActionsOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
            </button>
            <div id="nav-actions" className={`nav-right${navActionsOpen ? ' nav-right--open' : ''}`} onClick={closeNavActions}>
              {user ? (
                <>
                  <span id="user-display" style={{ color: 'var(--gold)', fontWeight: 700 }}>{user.username || user.email}</span>
                  {isAdmin && <Link to="/admin/dashboard" target="UcmarketAdmin" rel="noreferrer">管理員</Link>}
                  <Link to="/markets/new">建立市場</Link>
                  <Link to="/portfolio">儀表板</Link>
                  <Link to="/positions">持倉</Link>
                  <a href="#logout" id="logout-link" onClick={(e) => { e.preventDefault(); logout(); }}>登出</a>
                </>
              ) : (
                <>
                  <a href="#" onClick={(e) => { e.preventDefault(); openLogin(); }}>登入</a>
                  <button className="register-btn" onClick={openRegister}>註冊</button>
                </>
              )}
            </div>
          </>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
      {!isLanding && (
        <footer className="wallet-footer">
          <div className="footer-grid">
            <div className="footer-section">
              <button
                className="footer-section-toggle"
                type="button"
                aria-expanded={openFooterSection === 'platform'}
                aria-controls="footer-section-platform"
                onClick={() => setOpenFooterSection((section) => section === 'platform' ? null : 'platform')}
              >
                <span>平台</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
              <div id="footer-section-platform" className={`footer-links${openFooterSection === 'platform' ? ' is-open' : ''}`}>
                <a href="#">市場</a><a href="#">熱門事件</a><a href="#">排行榜</a>
              </div>
            </div>
            <div className="footer-section">
              <button
                className="footer-section-toggle"
                type="button"
                aria-expanded={openFooterSection === 'resources'}
                aria-controls="footer-section-resources"
                onClick={() => setOpenFooterSection((section) => section === 'resources' ? null : 'resources')}
              >
                <span>資源</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
              <div id="footer-section-resources" className={`footer-links${openFooterSection === 'resources' ? ' is-open' : ''}`}>
                <a href="#">玩法介紹</a><a href="#">白皮書</a><a href="#">API 文件</a>
              </div>
            </div>
            <div className="footer-section">
              <button
                className="footer-section-toggle"
                type="button"
                aria-expanded={openFooterSection === 'company'}
                aria-controls="footer-section-company"
                onClick={() => setOpenFooterSection((section) => section === 'company' ? null : 'company')}
              >
                <span>公司</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
              <div id="footer-section-company" className={`footer-links${openFooterSection === 'company' ? ' is-open' : ''}`}>
                <a href="#">關於我們</a><a href="#">部落格</a><a href="#">徵才</a>
              </div>
            </div>
            <div className="footer-section">
              <button
                className="footer-section-toggle"
                type="button"
                aria-expanded={openFooterSection === 'legal'}
                aria-controls="footer-section-legal"
                onClick={() => setOpenFooterSection((section) => section === 'legal' ? null : 'legal')}
              >
                <span>法律</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
              <div id="footer-section-legal" className={`footer-links${openFooterSection === 'legal' ? ' is-open' : ''}`}>
                <a href="#">服務條款</a><a href="#">隱私政策</a><a href="#">風險聲明</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-brand"><img className="footer-logo-image" src={logoImg} alt="UCMARKET" /><strong>UCMARKET</strong></div>
            <p>&copy; 2026 UCMARKET. All rights reserved.</p>
            <div className="footer-social"><i className="fa-brands fa-x-twitter"></i><i className="fa-brands fa-discord"></i><i className="fa-brands fa-telegram"></i><i className="fa-brands fa-github"></i></div>
          </div>
        </footer>
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />
      <Toast />
    </>
  );
}
