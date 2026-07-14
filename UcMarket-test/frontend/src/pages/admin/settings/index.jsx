import { useState, useEffect } from 'react';
import { getDashboardStats } from '../../../api/adminApi';

export default function SettingsPage() {
  const [stats, setStats] = useState(null);
  const [serverOnline, setServerOnline] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then((s) => setStats(s))
      .catch(() => setStats({}));
    fetch('/api/health')
      .then((r) => r.json())
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  const st = stats || {};

  const platformInfo = [
    { label: '平台名稱', value: 'UcMarket' },
    { label: '版本', value: '1.0.0' },
    { label: '後端', value: 'Java 21 / Spring Boot 3.5.0', cls: 'text-primary' },
    { label: '資料庫', value: 'PostgreSQL' },
  ];

  const systemInfo = [
    { label: '前端框架', value: 'React 19 + Bootstrap 5.3.8' },
    { label: '認證機制', value: 'JWT + Refresh Token' },
    { label: '密碼加密', value: 'BCrypt' },
    { label: '伺服器狀態', value: serverOnline === null ? '檢查中…' : serverOnline ? '正常運行' : '離線', dot: serverOnline === null ? 'offline' : serverOnline ? 'online' : 'offline' },
  ];

  const statsInfo = [
    { label: '總用戶數', value: st.totalUsers || st.total_users || '-' },
    { label: '總事件數', value: st.totalMarkets || st.total_markets || '-' },
    { label: '進行中', value: st.activeCount || st.active_count || '-' },
    { label: '待審核', value: st.pendingCount || st.pending_count || '-' },
  ];

  const adminInfo = [
    { label: '已結算', value: st.resolvedCount || st.resolved_count || '-' },
    { label: '已拒絕', value: st.rejectedCount || st.rejected_count || '-' },
    { label: '管理員數', value: st.totalAdmins || '-' },
    { label: '系統版本', value: '1.0.0' },
  ];

  function renderList(items) {
    return items.map((item, i) => (
      <div key={i} className="system-item">
        <span className="label">{item.label}</span>
        {item.dot ? (
          <span className="status-indicator">
            <span className={`dot ${item.dot}`}></span>
            <span className="value" style={{ color: 'var(--success)' }}>{item.value}</span>
          </span>
        ) : (
          <span className={`value ${item.cls || ''}`}>{item.value}</span>
        )}
      </div>
    ));
  }

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">系統設定</h1>
        <p className="text-secondary mb-0">平台基本資訊與系統狀態一覽。</p>
      </div>

      <section className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="block-card h-100">
            <div className="block-card-header"><i className="bi bi-info-circle text-primary"></i> 平台資訊</div>
            <div className="block-card-body">{renderList(platformInfo)}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="block-card h-100">
            <div className="block-card-header"><i className="bi bi-cpu text-primary"></i> 系統狀態</div>
            <div className="block-card-body">{renderList(systemInfo)}</div>
          </div>
        </div>
      </section>

      <section className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="block-card h-100">
            <div className="block-card-header"><i className="bi bi-bar-chart text-primary"></i> 統計概覽</div>
            <div className="block-card-body">{renderList(statsInfo)}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="block-card h-100">
            <div className="block-card-header"><i className="bi bi-shield-check text-primary"></i> 管理資訊</div>
            <div className="block-card-body">{renderList(adminInfo)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
