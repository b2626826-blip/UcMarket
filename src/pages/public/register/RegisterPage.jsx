import { useRef, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, firebaseEnabled, OAuthProviders } from "../../../config/firebase";
import useAuthStore from "../../../store/authStore";
import { createIdempotencyKey } from "../../../utils/idempotency";
import "./RegisterPage.css";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const firebaseLogin = useAuthStore((state) => state.firebaseLogin);
  const loading = useAuthStore((state) => state.loading);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const idemKeyRef = useRef(null);

  function updateForm(patch) {
    idemKeyRef.current = null;
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function validate() {
    if (!form.username.trim()) return "請輸入用戶名稱";
    if (form.username.trim().length < 3) return "用戶名稱至少需要 3 個字元";
    if (!form.email.trim()) return "請輸入 Email";
    if (!isValidEmail(form.email)) return "Email 格式不正確";
    if (!form.password) return "請輸入密碼";
    if (form.password.length < 8) return "密碼至少需要 8 個字元";
    if (!form.confirmPassword) return "請再次輸入密碼";
    if (form.confirmPassword !== form.password) return "兩次輸入的密碼不一致";
    if (!form.agree) return "請先同意條款後再註冊";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const idempotencyKey = idemKeyRef.current ?? createIdempotencyKey("register");
    idemKeyRef.current = idempotencyKey;
    setError("");

    try {
      await register(form.username.trim(), form.email.trim(), form.password, idempotencyKey);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate("/");
      }, 1800);
    } catch (err) {
      setError(err.message || "註冊失敗");
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
        navigate("/");
      }, 1800);
    } catch (err) {
      let message = "第三方登入失敗";
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
      <main className="register-wrapper">
        <div className="register-bg-layer">
          <div className="register-bg-row row1">
            UCMARKET PREDICT TRADE WIN UCMARKET PREDICT TRADE WIN
            UCMARKET PREDICT TRADE WIN UCMARKET PREDICT TRADE WIN
          </div>

          <div className="register-bg-row row2">
            MARKET CRYPTO POLITICS SPORTS MARKET CRYPTO POLITICS SPORTS
            MARKET CRYPTO POLITICS SPORTS MARKET CRYPTO POLITICS SPORTS
          </div>
        </div>

        <section className="register-layout">
          <section className="register-card">
            <div className="register-glow"></div>

            <div className="register-card-header">
              <h2>會員註冊</h2>
              <p>請輸入以下資料建立帳號</p>
            </div>

            <form className="register-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>用戶名稱</label>
                <div className="input-box">
                  <input
                    type="text"
                    placeholder="輸入您的用戶名稱"
                    value={form.username}
                    onChange={(event) => updateForm({ username: event.target.value })}
                  />
                  <span className="material-symbols-outlined">person</span>
                </div>
              </div>

              <div className="form-group">
                <label>電子郵件</label>
                <div className="input-box">
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(event) => updateForm({ email: event.target.value })}
                  />
                  <span className="material-symbols-outlined">mail</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>設定密碼</label>
                  <div className="input-box">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="至少 8 個字元"
                      value={form.password}
                      onChange={(event) => updateForm({ password: event.target.value })}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>確認密碼</label>
                  <div className="input-box">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="再次輸入密碼"
                      value={form.confirmPassword}
                      onChange={(event) => updateForm({ confirmPassword: event.target.value })}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showConfirmPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <label className="terms-area">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(event) => updateForm({ agree: event.target.checked })}
                />
                <span>
                  我同意 UCMARKET 的 <a href="#">服務條款</a>、<a href="#">隱私政策</a> 與
                  <a href="#">風險披露聲明</a>
                </span>
              </label>

              <button type="submit" className="register-submit-btn" disabled={loading}>
                {loading ? "建立帳號中..." : "立即註冊"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className="register-divider">
              <span></span>
              <p>或使用以下方式繼續</p>
              <span></span>
            </div>

            <div className="social-register">
              <button
                type="button"
                disabled={!firebaseEnabled}
                title={!firebaseEnabled ? "Firebase 尚未啟用" : undefined}
                onClick={() => handleSocialLogin("GOOGLE")}
              >
                Google
              </button>
              <button
                type="button"
                disabled={!firebaseEnabled}
                title={!firebaseEnabled ? "Firebase 尚未啟用" : undefined}
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

            <p className="login-link">
              已經有帳號？ <a href="/auth/login">立即登入</a>
            </p>
          </section>
        </section>
      </main>

      <div className={`register-toast ${showToast ? "show" : ""}`}>
        註冊成功，正在為您跳轉...
      </div>
    </>
  );
}
