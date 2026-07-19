import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, firebaseEnabled, OAuthProviders } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import { createIdempotencyKey } from '../../utils/idempotency';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
  const registerKeyRef = useRef(null);

  const resetLogin = () => {
    setLoginForm({ email: '', password: '' });
    setLoginErrors({});
  };

  const resetReg = () => {
    registerKeyRef.current = null;
    setRegForm({ username: '', email: '', password: '', confirmPwd: '', agree: false });
    setRegErrors({});
  };

  useEffect(() => {
    if (open) {
      if ((initialTab || 'login') === 'login') resetLogin();
      else resetReg();
      setTab(initialTab || 'login');
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const handler = (event) => {
      const rect = dialogRef.current.getBoundingClientRect();
      dialogRef.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
      dialogRef.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
    };
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function validateLogin() {
    const errors = {};
    if (!loginForm.email.trim()) errors.email = '請輸入 Email';
    else if (!isValidEmail(loginForm.email)) errors.email = 'Email 格式不正確';
    if (!loginForm.password) errors.password = '請輸入密碼';
    else if (loginForm.password.length < 8) errors.password = '密碼至少需要 8 個字元';
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateReg() {
    const errors = {};
    if (!regForm.username.trim()) errors.username = '請輸入用戶名稱';
    else if (regForm.username.trim().length < 3) errors.username = '用戶名稱至少需要 3 個字元';
    if (!regForm.email.trim()) errors.email = '請輸入 Email';
    else if (!isValidEmail(regForm.email)) errors.email = 'Email 格式不正確';
    if (!regForm.password) errors.password = '請輸入密碼';
    else if (regForm.password.length < 8) errors.password = '密碼至少需要 8 個字元';
    if (!regForm.confirmPwd) errors.confirmPwd = '請再次輸入密碼';
    else if (regForm.confirmPwd !== regForm.password) errors.confirmPwd = '兩次輸入的密碼不一致';
    if (!regForm.agree) errors.agree = '請先同意條款後再註冊';
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function showToastMsg(message) {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  }

  function updateRegisterForm(patch) {
    registerKeyRef.current = null;
    setRegForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!validateLogin()) return;
    setLoginBtnState({ text: '登入中...', bg: '' });
    try {
      await login(loginForm.email.trim(), loginForm.password);
      setLoginBtnState({ text: '登入成功', bg: '#00d66f' });
      showToastMsg('登入成功');
      setTimeout(() => {
        onClose();
        resetLogin();
        setLoginBtnState({ text: '', bg: '' });
      }, 1200);
    } catch (error) {
      setLoginErrors((prev) => ({ ...prev, email: error.message }));
      setLoginBtnState({ text: '登入失敗', bg: '' });
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (!validateReg()) return;

    const idempotencyKey = registerKeyRef.current ?? createIdempotencyKey('register');
    registerKeyRef.current = idempotencyKey;
    setRegBtnState({ text: '建立帳號中...', bg: '' });

    try {
      await register(
        regForm.username.trim(),
        regForm.email.trim(),
        regForm.password,
        idempotencyKey
      );
      setRegBtnState({ text: '帳號建立成功', bg: '#00d66f' });
      showToastMsg('註冊成功');
      setTimeout(() => {
        onClose();
        resetReg();
        setRegBtnState({ text: '', bg: '' });
      }, 1200);
    } catch (error) {
      setRegErrors((prev) => ({ ...prev, email: error.message }));
      setRegBtnState({ text: '註冊失敗', bg: '' });
    }
  }

  function switchTab(nextTab) {
    setTab(nextTab);
    if (nextTab === 'login') resetLogin();
    else resetReg();
    setLoginBtnState({ text: '', bg: '' });
    setRegBtnState({ text: '', bg: '' });
  }

  async function handleSocialLogin(providerName) {
    setLoginBtnState({ text: '登入中...', bg: '' });
    setRegBtnState({ text: '建立帳號中...', bg: '' });
    try {
      const provider = OAuthProviders[providerName];
      if (!provider) return;
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await useAuthStore.getState().firebaseLogin(idToken, providerName);
      showToastMsg('登入成功');
      setTimeout(() => {
        onClose();
        resetLogin();
        resetReg();
        setLoginBtnState({ text: '', bg: '' });
        setRegBtnState({ text: '', bg: '' });
      }, 1200);
    } catch (error) {
      let message = '第三方登入失敗';
      if (error.code === 'auth/account-exists-with-different-credential') {
        message = '這個 Email 已綁定其他登入方式，請改用原本的方法登入。';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = '登入視窗已被關閉，請重新操作。';
      } else if (error.message) {
        message = error.message;
      }
      setLoginErrors((prev) => ({ ...prev, email: message }));
      setRegErrors((prev) => ({ ...prev, email: message }));
      setLoginBtnState({ text: '', bg: '' });
      setRegBtnState({ text: '', bg: '' });
    }
  }

  if (!open) return null;

  return (
    <div className="auth-overlay" style={{ display: 'flex' }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="auth-dialog glow-active" ref={dialogRef}>
        <div className="auth-glow"></div>
        <button className="auth-close" onClick={onClose}>&times;</button>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>登入</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>註冊</button>
        </div>
        <div className={`auth-pane ${tab === 'login' ? 'active' : ''}`}>
          <div className="login-header">
            <h1>歡迎回來</h1>
            <p>登入後即可交易、查看錢包並追蹤持倉。</p>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>電子郵件</label>
              <div className="input-box">
                <input type="email" value={loginForm.email} onChange={(event) => { setLoginForm((prev) => ({ ...prev, email: event.target.value })); setLoginErrors((prev) => ({ ...prev, email: '' })); }} placeholder="example@gmail.com" />
                <i className="fa-regular fa-envelope"></i>
              </div>
              <small className="error-text">{loginErrors.email}</small>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label>密碼</label>
                <Link to="/auth/forgot-password" onClick={onClose}>忘記密碼？</Link>
              </div>
              <div className="input-box">
                <input type={showPwd ? 'text' : 'password'} value={loginForm.password} onChange={(event) => { setLoginForm((prev) => ({ ...prev, password: event.target.value })); setLoginErrors((prev) => ({ ...prev, password: '' })); }} placeholder="請輸入您的密碼" />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(!showPwd)}><i className={`fa-regular fa-eye${showPwd ? '-slash' : ''}`}></i></button>
              </div>
              <small className="error-text">{loginErrors.password}</small>
            </div>
            <button type="submit" className="login-submit-btn" disabled={loading} style={loginBtnState.bg ? { background: loginBtnState.bg } : undefined}>
              {loginBtnState.text || (loading ? '登入中...' : '登入帳戶')}
            </button>
          </form>
          <div className="login-divider"><span></span><p>或使用以下方式</p><span></span></div>
          <div className="social-login">
            <button type="button" disabled={!firebaseEnabled} title={!firebaseEnabled ? 'Firebase 未啟用' : undefined} onClick={() => handleSocialLogin('GOOGLE')}><i className="fa-brands fa-google"></i></button>
            <button type="button" disabled={!firebaseEnabled} title={!firebaseEnabled ? 'Firebase 未啟用' : undefined} onClick={() => handleSocialLogin('GITHUB')}><i className="fa-brands fa-github"></i></button>
          </div>
          <p className="register-link">還沒有帳號？<a href="#" onClick={(event) => { event.preventDefault(); switchTab('register'); }}>立即註冊</a></p>
        </div>
        <div className={`auth-pane ${tab === 'register' ? 'active' : ''}`}>
          <div className="register-card-header">
            <h2>會員註冊</h2>
            <p>請填寫以下資料建立帳號。</p>
          </div>
          <form className="register-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label>用戶名稱</label>
              <div className="input-box">
                <input type="text" value={regForm.username} onChange={(event) => { updateRegisterForm({ username: event.target.value }); setRegErrors((prev) => ({ ...prev, username: '' })); }} placeholder="輸入您的用戶名稱" />
                <i className="fa-regular fa-user"></i>
              </div>
              <small className="error-text">{regErrors.username}</small>
            </div>
            <div className="form-group">
              <label>電子郵件</label>
              <div className="input-box">
                <input type="email" value={regForm.email} onChange={(event) => { updateRegisterForm({ email: event.target.value }); setRegErrors((prev) => ({ ...prev, email: '' })); }} placeholder="name@example.com" />
                <i className="fa-regular fa-envelope"></i>
              </div>
              <small className="error-text">{regErrors.email}</small>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>設定密碼</label>
                <div className="input-box">
                  <input type={showPwd ? 'text' : 'password'} value={regForm.password} onChange={(event) => { updateRegisterForm({ password: event.target.value }); setRegErrors((prev) => ({ ...prev, password: '' })); }} placeholder="至少 8 個字元" />
                  <button type="button" className="password-toggle" tabIndex={-1} onClick={() => setShowPwd(!showPwd)}><i className={`fa-regular fa-eye${showPwd ? '-slash' : ''}`}></i></button>
                </div>
                <small className="error-text">{regErrors.password}</small>
              </div>
              <div className="form-group">
                <label>確認密碼</label>
                <div className="input-box">
                  <input type={showPwd ? 'text' : 'password'} value={regForm.confirmPwd} onChange={(event) => { updateRegisterForm({ confirmPwd: event.target.value }); setRegErrors((prev) => ({ ...prev, confirmPwd: '' })); }} placeholder="再次輸入密碼" />
                </div>
                <small className="error-text">{regErrors.confirmPwd}</small>
              </div>
            </div>
            <label className="terms-area">
              <input type="checkbox" checked={regForm.agree} onChange={(event) => { updateRegisterForm({ agree: event.target.checked }); setRegErrors((prev) => ({ ...prev, agree: '' })); }} />
              <span>我同意服務條款與隱私政策</span>
            </label>
            <small className="terms-error">{regErrors.agree}</small>
            <button type="submit" className="register-submit-btn" disabled={loading} style={regBtnState.bg ? { background: regBtnState.bg } : undefined}>
              {regBtnState.text || (loading ? '建立帳號中...' : '立即註冊')}
            </button>
          </form>
          <div className="register-divider"><span></span><p>或使用以下方式</p><span></span></div>
          <div className="social-register">
            <button type="button" disabled={!firebaseEnabled} title={!firebaseEnabled ? 'Firebase 未啟用' : undefined} onClick={() => handleSocialLogin('GOOGLE')}><i className="fa-brands fa-google"></i> Google</button>
            <button type="button" disabled={!firebaseEnabled} title={!firebaseEnabled ? 'Firebase 未啟用' : undefined} onClick={() => handleSocialLogin('GITHUB')}><i className="fa-brands fa-github"></i> GitHub</button>
          </div>
          <p className="login-link">已經有帳號？<a href="#" onClick={(event) => { event.preventDefault(); switchTab('login'); }}>立即登入</a></p>
        </div>
        <div className={`auth-toast ${toast ? 'show' : ''}`}>
          <i className="fa-solid fa-check"></i><span>{toast}</span>
        </div>
      </div>
    </div>
  );
}
