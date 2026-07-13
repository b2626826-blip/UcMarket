import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../assets/styles/admin.css';
import logoImg from '../../assets/logos/uclogoicon.png';
import useGlobalMouseGlow from '../../hooks/useGlobalMouseGlow';

const navItems = [
  { group: '儀表板', items: [
    { path: '/admin/dashboard', icon: 'bi-speedometer2', label: '總覽' },
  ]},
  { group: '事件管理', items: [
    { path: '/admin/markets', icon: 'bi-list-ul', label: '全部事件' },
    { path: '/admin/markets/create', icon: 'bi-plus-circle', label: '建立事件' },
  ]},
  { group: '用戶與交易', items: [
    { path: '/admin/users', icon: 'bi-people', label: '用戶清單' },
    { path: '/admin/transactions', icon: 'bi-credit-card', label: '交易紀錄' },
  ]},
  { group: '系統管理', items: [
    { path: '/admin/admins', icon: 'bi-shield-lock', label: '管理員清單' },
    { path: '/admin/settings', icon: 'bi-gear', label: '系統設定' },
    { path: '/admin/logs', icon: 'bi-journal-text', label: '操作日誌' },
  ]},
];

export default function AdminLayout() {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);
  const [hiding, setHiding] = useState(null);

  useGlobalMouseGlow();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'UcmarketAdmin';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setHiding(toast.id);
        setTimeout(() => { clearToast(); setHiding(null); }, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  function isActive(path) {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname === path;
  }

  const toastIcons = {
    success: 'bi-check-circle-fill',
    danger: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  return (
    <div className="admin-shell">
      <div className="global-mouse-glow" aria-hidden="true" />
      <nav className="sidebar">
        <div className="sidebar-brand">
          <img src={logoImg} alt="UcMarket" width="128" height="128" />
          <div className="brand-text">
            <span className="brand-name">UcMarket</span>
            <span className="brand-sub">Admin</span>
          </div>
        </div>
        <div className="sidebar-nav">
          {navItems.map((group, gi) => (
            <div key={gi}>
              <div className="sidebar-group-label">{group.group}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <i className={`bi ${item.icon}`}></i> {item.label}
                </Link>
              ))}
              {gi < navItems.length - 1 && <div className="sidebar-divider" />}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <a className="sidebar-link" style={{ cursor: 'pointer' }} onClick={() => logout()}>
            <i className="bi bi-box-arrow-right"></i> 登出
          </a>
        </div>
      </nav>

      <main className="main-content" key={location.pathname}>
        <Outlet />
      </main>

      <div className="toast-container">
        {toast && (
          <div className={`admin-toast toast-${toast.type} ${hiding === toast.id ? 'hide' : ''}`}>
            <i className={`bi ${toastIcons[toast.type] || 'bi-info-circle-fill'} text-${toast.type === 'danger' ? 'danger' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'success' : 'primary'}`} style={{ fontSize: '1.1rem', lineHeight: 1.4 }}></i>
            <div className="admin-toast-body">
              <div className="fw-semibold">{toast.title}</div>
              {toast.message && <div className="small text-secondary">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => { setHiding(toast.id); setTimeout(() => { clearToast(); setHiding(null); }, 300); }}>&times;</button>
          </div>
        )}
      </div>
    </div>
  );
}
