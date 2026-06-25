import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const navItems = [
  { path: '/admin/pending-markets', icon: 'bi-speedometer2', label: '儀表板' },
  { path: '/admin/create-market', icon: 'bi-plus-circle', label: '建立市場' },
  { path: '/admin/transactions', icon: 'bi-currency-dollar', label: '交易管理' },
  { path: '/admin/markets/review/1', icon: 'bi-search', label: '審核市場' },
  { path: '/admin/markets/resolve/1', icon: 'bi-check2-square', label: '結算市場' },
  { path: '/admin/users', icon: 'bi-people', label: '使用者管理' },
  { path: '/admin/logs', icon: 'bi-journal-text', label: '操作紀錄' },
  { path: '/admin/settings', icon: 'bi-gear', label: '系統設定' },
];

export default function AdminLayout() {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  function isActive(path) {
    return location.pathname === path || (path.includes('/review/') && location.pathname.includes('/review/'));
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-top">
            <div className="brand-icon">U</div>
            <h2>UcMarket</h2>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-group-label">管理</div>
          {navItems.slice(0, 3).map((item) => (
            <Link key={item.path} to={item.path} className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}>
              <i className={`bi ${item.icon}`}></i> {item.label}
            </Link>
          ))}
          <div className="sidebar-group-label" style={{ marginTop: 16 }}>系統</div>
          {navItems.slice(3).map((item) => (
            <Link key={item.path} to={item.path} className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}>
              <i className={`bi ${item.icon}`}></i> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-link" style={{ cursor: 'pointer' }} onClick={() => logout()}>
            <i className="bi bi-box-arrow-right"></i> 登出
          </div>
        </div>
      </aside>
      <div className="main-content">
        <Outlet />
      </div>
      <div id="toast-container" className="toast-container"></div>
    </div>
  );
}
