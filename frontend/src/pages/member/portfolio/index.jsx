import { useEffect } from 'react';
import useAuthStore from '../../../store/authStore';

export default function PortfolioPage() {
  const user = useAuthStore((s) => s.user);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  return (
    <div className="dashboard" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="chart-card">
        <div className="chart-title">
          <div className="chart-icon"><i className="fa-solid fa-chart-line"></i></div>
          <div>
            <h2>資產總覽</h2>
            <p>歡迎回來{user ? `，${user.username || user.email}` : ''}</p>
          </div>
        </div>
        <div className="chart-labels">
          <span className="yes-dot"><i className="fa-solid fa-circle"></i> Yes 價格</span>
          <span className="no-dot"><i className="fa-solid fa-circle"></i> No 價格</span>
        </div>
        <div className="chart-container">
          <canvas id="marketChart"></canvas>
        </div>
        <div className="chart-range">
          <button className="active">1D</button>
          <button>1W</button>
          <button>1M</button>
          <button>1Y</button>
          <button>ALL</button>
        </div>
        <div className="chart-time">
          <span>台北時間 (UTC+8)</span>
          <strong id="taipeiTime">--</strong>
        </div>
      </div>
      <div className="stats-card">
        <div className="stats-glow"></div>
        <div className="card-top">
          <div className="card-icon"><i className="fa-solid fa-wallet"></i></div>
          <h3>$125,430.00</h3>
          <p>可用餘額<br />總收益 <span className="green">+$12,430</span><br />本月收益率 <span className="green">+8.7%</span></p>
        </div>
        <div className="stats-list">
          {[
            { label: '總資產', value: '$135,200' },
            { label: '已實現盈虧', value: '+$12,430', cls: 'green' },
            { label: '未實現盈虧', value: '+$2,770', cls: 'green' },
            { label: '總交易次數', value: '284' },
          ].map((s) => (
            <div className="stat-row" key={s.label}>
              <span>{s.label}</span>
              <strong className={s.cls || ''}>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
