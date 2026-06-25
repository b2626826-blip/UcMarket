import { useState, useEffect } from 'react';
import { getDashboardStats } from '../../../api/adminApi';

export default function SettingsPage() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
  }, []);

  function renderList(items) {
    return items.map((item, i) => (
      <div className="system-item" key={i}>
        <span className="text-secondary">{item.label}</span>
        <span className={`fw-semibold ${item.cls || ''}`}>{item.value}</span>
      </div>
    ));
  }

  return (
    <div>
      <div className="page-header">
        <h1>系統設定</h1>
        <p>平台資訊與系統狀態</p>
      </div>
      <div className="page-grid" style={{ marginTop: 24 }}>
        {[
          { title: '平台資訊', items: [
            { label: '平台名稱', value: 'UcMarket' },
            { label: '版本', value: '1.0.0' },
            { label: '後端', value: 'Java 21 / Spring Boot 3.5.0' },
            { label: '資料庫', value: 'PostgreSQL' },
          ]},
          { title: '伺服器狀態', items: [
            { label: '總用戶數', value: stats.totalUsers || 0 },
            { label: '總事件數', value: stats.totalMarkets || 0 },
            { label: '進行中', value: stats.activeCount || 0 },
            { label: '待審核', value: stats.pendingCount || 0 },
          ]},
        ].map((section) => (
          <div className="block-card" key={section.title}>
            <div className="block-card-header">{section.title}</div>
            <div className="block-card-body">
              {renderList(section.items)}
            </div>
          </div>
        ))}
      </div>
      <div className="block-card" style={{ marginTop: 24 }}>
        <div className="block-card-header">系統資訊</div>
        <div className="block-card-body">
          {renderList([
            { label: '前端框架', value: 'React 19' },
            { label: '認證機制', value: 'JWT + Refresh Token' },
            { label: '密碼加密', value: 'BCrypt' },
            { label: '伺服器狀態', value: '正常運行', cls: 'text-success' },
          ])}
        </div>
      </div>
    </div>
  );
}
