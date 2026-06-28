import { useState, useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../../store/authStore';

export default function AuthModal({ open, onClose, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'login');
  const { login, register, loading } = useAuthStore();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', confirmPwd: '', agree: false });
  const [loginErrors, setLoginErrors] = useState({});
  const [regErrors, setRegErrors] = useState({});
  const [toast, setToast] = useState('');
  const [loginBtnState, setLoginBtnState] = useState({ text: '', bg: '' });
  const [regBtnState, setRegBtnState] = useState({ text: '', bg: '' });
  const [showPwd, setShowPwd] = useState(false);
  const dialogRef = useRef(null);

  const resetLogin = () => { setLoginForm({ email: '', password: '' }); setLoginErrors({}); };
  const resetReg = () => { setRegForm({ username: '', email: '', password: '', confirmPwd: '', agree: false }); setRegErrors({}); };

  useEffect(() => {
    if (open) {
      tab === 'login' ? resetLogin() : resetReg();
      setTab(initialTab || 'login');
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const handler = (e) => {
      const rect = dialogRef.current.getBoundingClientRect();
      dialogRef.current.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      dialogRef.current.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    };
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validateLogin() {
    const e = {};
    if (!loginForm.email.trim()) e.email = '請輸入 Email';
    else if (!isValidEmail(loginForm.email)) e.email = 'Email 格式不正確';
    if (!loginForm.password) e.password = '請輸入密碼';
    else if (loginForm.password.length < 8) e.password = '密碼至少需要 8 個字元';
    setLoginErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateReg() {
    const e = {};
    if (!regForm.username.trim()) e.username = '請輸入用戶名稱';
    else if (regForm.username.length < 3) e.username = '至少 3 個字元';
    if (!regForm.email.trim()) e.email = '請輸入電子郵件';
    else if (!isValidEmail(regForm.email)) e.email = '格式不正確';
    if (!regForm.password) e.password = '請輸入密碼';
    else if (regForm.password.length < 8) e.password = '至少 8 個字元';
    if (!regForm.confirmPwd) e.confirmPwd = '請再次輸入密碼';
    else if (regForm.confirmPwd !== regForm.password) e.confirmPwd = '兩次密碼不一致';
    if (!regForm.agree) e.agree = '請同意服務條款';
    setRegErrors(e);
    return Object.keys(e).length === 0;
  }

  function showToastMsg(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function handleLogin(e) {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoginBtnState({ text: '登入中...', bg: '' });
    try {
      await login(loginForm.email.trim(), loginForm.password);
      setLoginBtnState({ text: '登入成功', bg: '#00d66f' });
      showToastMsg('登入成功');
      setTimeout(() => { onClose(); resetLogin(); setLoginBtnState({ text: '', bg: '' }); }, 1200);
    } catch (err) {
      setLoginErrors((p) => ({ ...p, email: err.message }));
      setLoginBtnState({ text: '登入帳戶', bg: '' });
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!validateReg()) return;
    setRegBtnState({ text: '註冊中...', bg: '' });
    try {
      await register(regForm.username.trim(), regForm.email.trim(), regForm.password);
      setRegBtnState({ text: '註冊成功', bg: '#00d66f' });
      showToastMsg('註冊成功，帳號已建立');
      setTimeout(() => { onClose(); resetReg(); setRegBtnState({ text: '', bg: '' }); }, 1200);
    } catch (err) {
      setRegErrors((p) => ({ ...p, email: err.message }));
      setRegBtnState({ text: '立即註冊 →', bg: '' });
    }
  }

  function switchTab(t) { setTab(t); t === 'login' ? resetLogin() : resetReg(); setLoginBtnState({ text: '', bg: '' }); setRegBtnState({ text: '', bg: '' }); }

  if (!open) return null;

  return (
    <div className="auth-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-dialog glow-active" ref={dialogRef}>
        <div className="auth-glow"></div>
        <button className="auth-close" onClick={onClose}>&times;</button>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>登入</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>註冊</button>
        </div>
        <div className={`auth-pane ${tab === 'login' ? 'active' : ''}`}>
          <div className="login-header">
            <span className="badge"><i className="fa-solid fa-right-to-bracket"></i> 會員登入</span>
            <h1>歡迎回來</h1>
            <p>登入您的預測市場帳戶，查看持倉、交易紀錄與錢包資產。</p>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <div className="input-box">
                <input type="email" value={loginForm.email} onChange={(e) => { setLoginForm((p) => ({ ...p, email: e.target.value })); setLoginErrors((p) => ({ ...p, email: '' })); }} placeholder="example@gmail.com" />
                <i className="fa-regular fa-envelope"></i>
              </div>
              <small className="error-text">{loginErrors.email}</small>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label>密碼</label>
                <a href="#">忘記密碼？</a>
              </div>
              <div className="input-box">
                <input type={showPwd ? 'text' : 'password'} value={loginForm.password} onChange={(e) => { setLoginForm((p) => ({ ...p, password: e.target.value })); setLoginErrors((p) => ({ ...p, password: '' })); }} placeholder="請輸入密碼" />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(!showPwd)}><i className={`fa-regular fa-eye${showPwd ? '-slash' : ''}`}></i></button>
              </div>
              <small className="error-text">{loginErrors.password}</small>
            </div>
            <label className="remember-row">
              <input type="checkbox" /><span>記住我的登入狀態</span>
            </label>
            <button type="submit" className="login-submit-btn" disabled={loading} style={loginBtnState.bg ? { background: loginBtnState.bg } : undefined}>
              {loginBtnState.text || (loading ? '登入中...' : '登入帳戶')}
            </button>
          </form>
          <div className="login-divider"><span></span><p>或使用以下方式</p><span></span></div>
          <div className="social-login">
            <button><i className="fa-brands fa-google"></i></button>
            <button><i className="fa-solid fa-wallet"></i></button>
            <button><i className="fa-brands fa-github"></i></button>
          </div>
          <p className="register-link">還沒有帳號？<a href="#" onClick={(e) => { e.preventDefault(); switchTab('register'); }}>立即註冊</a></p>
          <div className="security-list">
            <div><i className="fa-solid fa-shield-halved"></i><span>SSL 安全連線</span></div>
            <div><i className="fa-solid fa-lock"></i><span>資料加密保護</span></div>
          </div>
        </div>
        <div className={`auth-pane ${tab === 'register' ? 'active' : ''}`}>
          <div className="register-card-header">
            <span className="badge"><i className="fa-solid fa-user-plus"></i> 建立帳號</span>
            <h2>會員註冊</h2>
            <p>請輸入以下資料建立帳號</p>
          </div>
          <form className="register-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label>用戶名稱</label>
              <div className="input-box">
                <input type="text" value={regForm.username} onChange={(e) => { setRegForm((p) => ({ ...p, username: e.target.value })); setRegErrors((p) => ({ ...p, username: '' })); }} placeholder="輸入您的用戶名稱" />
                <i className="fa-regular fa-user"></i>
              </div>
              <small className="error-text">{regErrors.username}</small>
            </div>
            <div className="form-group">
              <label>電子郵件</label>
              <div className="input-box">
                <input type="email" value={regForm.email} onChange={(e) => { setRegForm((p) => ({ ...p, email: e.target.value })); setRegErrors((p) => ({ ...p, email: '' })); }} placeholder="name@example.com" />
                <i className="fa-regular fa-envelope"></i>
              </div>
              <small className="error-text">{regErrors.email}</small>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>設定密碼</label>
                <div className="input-box">
                  <input type={showPwd ? 'text' : 'password'} value={regForm.password} onChange={(e) => { setRegForm((p) => ({ ...p, password: e.target.value })); setRegErrors((p) => ({ ...p, password: '' })); }} placeholder="至少 8 個字元" />
                  <button type="button" className="password-toggle" tabIndex={-1} onClick={() => setShowPwd(!showPwd)}><i className={`fa-regular fa-eye${showPwd ? '-slash' : ''}`}></i></button>
                </div>
                <small className="error-text">{regErrors.password}</small>
              </div>
              <div className="form-group">
                <label>確認密碼</label>
                <div className="input-box">
                  <input type={showPwd ? 'text' : 'password'} value={regForm.confirmPwd} onChange={(e) => { setRegForm((p) => ({ ...p, confirmPwd: e.target.value })); setRegErrors((p) => ({ ...p, confirmPwd: '' })); }} placeholder="再次輸入密碼" />
                </div>
                <small className="error-text">{regErrors.confirmPwd}</small>
              </div>
            </div>
            <label className="terms-area">
              <input type="checkbox" checked={regForm.agree} onChange={(e) => { setRegForm((p) => ({ ...p, agree: e.target.checked })); setRegErrors((p) => ({ ...p, agree: '' })); }} />
              <span>我同意 UCMARKET 的 <a href="#">服務條款</a>、<a href="#">隱私政策</a> 與 <a href="#">風險披露聲明</a></span>
            </label>
            <small className="terms-error">{regErrors.agree}</small>
            <button type="submit" className="register-submit-btn" disabled={loading} style={regBtnState.bg ? { background: regBtnState.bg } : undefined}>
              {regBtnState.text || (loading ? '註冊中...' : '立即註冊  →')}
            </button>
          </form>
          <div className="register-divider"><span></span><p>或使用以下方式繼續</p><span></span></div>
          <div className="social-register">
            <button><i className="fa-brands fa-google"></i> Google</button>
            <button><i className="fa-solid fa-wallet"></i> 錢包連接</button>
          </div>
          <p className="login-link">已經有帳號？<a href="#" onClick={(e) => { e.preventDefault(); switchTab('login'); }}>立即登入</a></p>
        </div>
        <div className={`auth-toast ${toast ? 'show' : ''}`}>
          <i className="fa-solid fa-check"></i><span>{toast}</span>
        </div>
      </div>
    </div>
  );
}
