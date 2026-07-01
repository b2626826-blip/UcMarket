import { useState, useEffect, useRef } from 'react';
import { Chart, DoughnutController, ArcElement, Legend, Tooltip } from 'chart.js';
import { getDashboardStats, getDashboardReviews } from '../../../api/adminApi';
import { approveMarket, rejectMarket, requestMarketChanges } from '../../../api/marketApi';
import useUiStore from '../../../store/uiStore';

Chart.register(DoughnutController, ArcElement, Legend, Tooltip);

const STATUS_LABEL = { PENDING: '待審核', ACTIVE: '進行中', CLOSED: '已截止', RESOLVED: '已結算', REJECTED: '已拒絕', DRAFT: '草稿', CANCELED: '已取消' };

function formatTime(val) {
  if (!val) return '';
  return val.replace('T', ' ').substring(0, 19);
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, reviewsRes] = await Promise.all([
        getDashboardStats().catch(() => null),
        getDashboardReviews().catch(() => null),
      ]);
      setStats(statsRes || { pendingCount: 0, activeCount: 0, rejectedCount: 0, draftCount: 0 });
      setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
    } catch {
      setStats({ pendingCount: 0, activeCount: 0, rejectedCount: 0, draftCount: 0 });
      setReviews([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (stats && chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      chartInstance.current = new Chart(chartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['進行中', '待審核', '已拒絕', '要求修改'],
          datasets: [{
            data: [stats.activeCount || 0, stats.pendingCount || 0, stats.rejectedCount || 0, stats.draftCount || 0],
            backgroundColor: ['#00d66f', '#d9aa43', '#ff476d', 'rgba(217,170,67,0.5)'],
            borderColor: '#090909',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9a9a9a', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 } },
            tooltip: { backgroundColor: '#111', titleColor: '#fff', bodyColor: '#9a9a9a' },
          },
        },
      });
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [stats]);

  async function handleApprove(id) {
    if (!confirm('確定要核准此市場上架嗎？')) return;
    try { await approveMarket(id); showToast('success', '已核准', '市場已核准上架。'); loadData(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }
  async function handleReject(id) {
    const reason = prompt('請輸入拒絕原因：');
    if (!reason) return;
    try { await rejectMarket(id, reason); showToast('warning', '已拒絕', '市場已被拒絕。'); loadData(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }
  async function handleChanges(id) {
    const comment = prompt('請輸入要求修改的原因：');
    if (!comment) return;
    try { await requestMarketChanges(id, comment); showToast('info', '已送回', '已要求修改。'); loadData(); }
    catch (err) { showToast('danger', '失敗', err.message); }
  }

  const st = stats || {};

  return (
    <>
      <div className="page-header mb-3">
        <h1 className="h3 mb-1">總覽</h1>
        <p className="text-secondary mb-0">事件審核儀表板，快速掌握平台狀態。</p>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        {[
          { tag: '待審核事件', num: st.pendingCount, cls: 'text-warning' },
          { tag: '進行中', num: st.activeCount, cls: 'text-success' },
          { tag: '已拒絕', num: st.rejectedCount, cls: 'text-danger' },
          { tag: '要求修改', num: st.draftCount, cls: 'text-warning' },
        ].map((kpi, i) => (
          <article key={i} className="dash-kpi-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', transition: 'all var(--ease)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-1)' }}>{kpi.tag}</div>
            <div className={kpi.cls} style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>{loading ? '-' : kpi.num}</div>
          </article>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="block-card">
          <div className="block-card-header">事件狀態分布</div>
          <div className="block-card-body" style={{ padding: 'var(--space-4)' }}>
            <canvas ref={chartRef} style={{ maxHeight: 240 }}></canvas>
          </div>
        </div>
        <div className="block-card">
          <div className="block-card-header">快速操作</div>
          <div className="block-card-body" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <a href="/admin/markets/create" className="quick-action-btn"><i className="bi bi-plus-circle"></i> 建立新事件</a>
              <a href="/admin/markets" className="quick-action-btn"><i className="bi bi-list-ul"></i> 管理全部事件</a>
              <a href="/admin/users" className="quick-action-btn"><i className="bi bi-people"></i> 管理用戶</a>
              <a href="/admin/logs" className="quick-action-btn"><i className="bi bi-journal-text"></i> 查看操作日誌</a>
            </div>
          </div>
        </div>
      </section>

      <section className="block-card">
        <div className="block-card-header">待審核事件列表 ({reviews.length})</div>
        <div className="block-card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr><th>標題</th><th>提交者</th><th>提交時間</th><th>類別</th><th>截止時間</th><th>操作</th></tr>
              </thead>
              <tbody>
                {!reviews.length ? (
                  <tr><td colSpan="6" className="text-center text-secondary py-4">暫無待審事件</td></tr>
                ) : reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title || ''}</td>
                    <td>{r.creatorCode || (r.creatorId || '').substring(0, 8)}</td>
                    <td>{formatTime(r.createdAt)}</td>
                    <td><span className="status-badge status-pending"><span className="status-dot"></span>{r.category || ''}</span></td>
                    <td>{formatTime(r.closeAt)}</td>
                    <td>
                      <button className="icon-btn text-success" title="核准" onClick={() => handleApprove(r.id)}><i className="bi bi-check-lg"></i></button>
                      {' '}
                      <button className="icon-btn text-danger" title="拒絕" onClick={() => handleReject(r.id)}><i className="bi bi-x-lg"></i></button>
                      {' '}
                      <button className="icon-btn text-warning" title="要求修改" onClick={() => handleChanges(r.id)}><i className="bi bi-pencil"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .dash-chart-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
