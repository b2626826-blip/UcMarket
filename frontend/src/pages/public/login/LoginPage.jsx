import { useState } from "react";
import "./LoginPage.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 1800);
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
            <button>G</button>
            <button>
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </button>
            <button>GH</button>
          </div>

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