import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, firebaseEnabled, OAuthProviders } from "../../../config/firebase";
import useAuthStore from "../../../store/authStore";
import { safeInternalPath } from "../../../utils/safeInternalPath";
import "./LoginPage.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, checkAuth, firebaseLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeInternalPath(location.state?.from) || "/";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      await checkAuth();
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate(redirectTo, { replace: true });
      }, 800);
    } catch (err) {
      setError(err?.message || "登入失敗，請確認 Email 與密碼。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(providerName) {
    setError("");
    try {
      const provider = OAuthProviders[providerName];
      if (!provider) return;

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await firebaseLogin(idToken, providerName);

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate(redirectTo, { replace: true });
      }, 800);
    } catch (err) {
      let message = "第三方登入失敗。";
      if (err.code === "auth/account-exists-with-different-credential") {
        message = "這個 Email 已綁定其他登入方式，請改用原本的方法登入。";
      } else if (err.code === "auth/popup-closed-by-user") {
        message = "登入視窗已被關閉，請重新操作。";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    }
  }

  return (
    <>
      <main className="login-wrapper">
        <section className="login-bg-text">
          <div className="bg-row row1">UCMARKET LOGIN SYSTEM UCMARKET LOGIN SYSTEM</div>
          <div className="bg-row row2">UCMARKET LOGIN SYSTEM UCMARKET LOGIN SYSTEM</div>
          <div className="bg-row row3">UCMARKET LOGIN SYSTEM UCMARKET LOGIN SYSTEM</div>
        </section>

        <section className="login-card">
          <div className="login-glow"></div>

          <div className="login-header">
            <h1>歡迎回來</h1>

            <p>登入您的預測市場帳戶，查看持倉、交易紀錄與錢包資產。</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>電子郵件</label>
              <div className="input-box">
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <span className="material-symbols-outlined">mail</span>
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>密碼</label>
                <Link to="/auth/forgot-password">忘記密碼？</Link>
              </div>

              <div className="input-box">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="請輸入您的密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <label className="remember-row">
              <input type="checkbox" />
              <span>記住我的登入狀態</span>
            </label>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "登入中..." : "登入帳戶"}
            </button>
          </form>

          <div className="login-divider">
            <span></span>
            <p>或使用以下方式</p>
            <span></span>
          </div>

          <div className="social-login">
            <button
              type="button"
              disabled={!firebaseEnabled}
              title={!firebaseEnabled ? "Firebase 未啟用" : undefined}
              onClick={() => handleSocialLogin("GOOGLE")}
            >
              Google
            </button>
            <button
              type="button"
              disabled={!firebaseEnabled}
              title={!firebaseEnabled ? "Firebase 未啟用" : undefined}
              onClick={() => handleSocialLogin("GITHUB")}
            >
              GitHub
            </button>
          </div>

          {error && (
            <p className="error-text" style={{ textAlign: "center", marginTop: 12 }}>
              {error}
            </p>
          )}

          <p className="register-link">
            還沒有帳號？ <a href="/auth/register">立即註冊</a>
          </p>

          <div className="security-list">
            <div>
              <span className="material-symbols-outlined">shield</span>
              <span>SSL 加密安全防護</span>
            </div>
            <div>
              <span className="material-symbols-outlined">lock</span>
              <span>帳戶資料受到完整保護</span>
            </div>
          </div>
        </section>
      </main>

      <div className={`login-toast ${showToast ? "show" : ""}`}>
        <span className="material-symbols-outlined">check</span>
        登入成功
      </div>
    </>
  );
}
