import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, OAuthProviders } from "../../../config/firebase";
import useAuthStore from "../../../store/authStore";
import "./LoginPage.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState("");
  const { firebaseLogin } = useAuthStore();

  function handleSubmit(e) {
    e.preventDefault();
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 1800);
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
      setTimeout(() => setShowToast(false), 1800);
    } catch (err) {
      let msg = "登入失敗";
      if (err.code === "auth/account-exists-with-different-credential") {
        msg = "此 Email 已使用其他登入方式註冊。";
      } else if (err.code === "auth/popup-closed-by-user") {
        msg = "登入視窗已關閉，請重新嘗試。";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    }
  }

  return (
    <>
      <main className="login-wrapper">
        <section className="login-bg-text">
          <div className="bg-row row1">• UCMARKET • LOGIN • SYSTEM • UCMARKET • LOGIN • SYSTEM</div>
          <div className="bg-row row2">• UCMARKET • LOGIN • SYSTEM • UCMARKET • LOGIN • SYSTEM</div>
          <div className="bg-row row3">• UCMARKET • LOGIN • SYSTEM • UCMARKET • LOGIN • SYSTEM</div>
        </section>

        <section className="login-card">
          <div className="login-glow"></div>

          <div className="login-header">
            <span className="badge">
              <span className="material-symbols-outlined">login</span>
              會員登入
            </span>

            <h1>歡迎回來</h1>

            <p>登入您的預測市場帳戶，查看持倉、交易紀錄與錢包資產。</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>

              <div className="input-box">
                <input type="email" placeholder="example@gmail.com" />
                <span className="material-symbols-outlined">mail</span>
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>密碼</label>
                <a href="#">忘記密碼？</a>
              </div>

              <div className="input-box">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="請輸入密碼"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
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

            <button type="submit" className="login-submit-btn">
              登入帳戶
            </button>
          </form>

          <div className="login-divider">
            <span></span>
            <p>或使用以下方式</p>
            <span></span>
          </div>

          <div className="social-login">
            <button type="button" onClick={() => handleSocialLogin("GOOGLE")}>G</button>
            <button type="button" onClick={() => handleSocialLogin("GITHUB")}>GH</button>
          </div>
          {error && <p className="error-text" style={{ textAlign: "center", marginTop: 12 }}>{error}</p>}

          <p className="register-link">
            還沒有帳號？ <a href="/auth/register">立即註冊</a>
          </p>

          <div className="security-list">
            <div>
              <span className="material-symbols-outlined">shield</span>
              <span>SSL 安全連線</span>
            </div>

            <div>
              <span className="material-symbols-outlined">lock</span>
              <span>資料加密保護</span>
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