import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';
import logoImg from '../../../assets/logos/uclogoicon.png';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../../assets/styles/admin.css';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('登入失敗：帳號或密碼錯誤');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-body)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 40%, rgba(217,170,67,0.06) 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, rgba(217,170,67,0.04) 0%, transparent 55%)',
      }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 400,
        background: 'rgba(9,9,9,0.85)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        boxShadow: '0 0 0 1px rgba(217,170,67,0.04), 0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          position: 'absolute', top: '-1px', left: '20%', right: '20%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(217,170,67,0.4), transparent)',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <img src={logoImg} alt="UcMarket" width="48" height="48" style={{ borderRadius: 'var(--radius-sm)' }} />
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>UcMarket Admin</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" required placeholder="admin.shung@ucmarket.test"
              autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">密碼</label>
            <input type="password" className="form-control" required placeholder="••••••••"
              autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
          <button type="submit" className="btn btn-primary w-100 d-flex justify-content-center align-items-center" disabled={loading} style={{ padding: 'var(--space-3)', fontSize: '0.95rem' }}>
            {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
            登入
          </button>
        </form>
      </div>
    </div>
  );
}
