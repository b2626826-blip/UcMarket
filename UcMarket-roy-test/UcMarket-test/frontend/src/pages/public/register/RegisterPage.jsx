import { useState } from "react";
import "./RegisterPage.css";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      <main className="register-wrapper">
        <div className="register-bg-layer">
          <div className="register-bg-row row1">
            UCMARKET • PREDICT • TRADE • WIN • UCMARKET • PREDICT • TRADE • WIN •
            UCMARKET • PREDICT • TRADE • WIN • UCMARKET • PREDICT • TRADE • WIN •
          </div>

          <div className="register-bg-row row2">
            MARKET • CRYPTO • POLITICS • SPORTS • MARKET • CRYPTO • POLITICS • SPORTS •
            MARKET • CRYPTO • POLITICS • SPORTS • MARKET • CRYPTO • POLITICS • SPORTS •
          </div>
        </div>

        <section className="register-hero">
          <span className="badge">
            <span className="material-symbols-outlined">person_add</span>
            建立帳號
          </span>

          <h1>加入 UCMARKET</h1>

          <p>建立您的預測市場帳號，開始交易、管理持倉與查看排行榜。</p>
        </section>

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
                  <input type="text" placeholder="輸入您的用戶名稱" />
                  <span className="material-symbols-outlined">person</span>
                </div>
              </div>

              <div className="form-group">
                <label>電子郵件</label>
                <div className="input-box">
                  <input type="email" placeholder="name@example.com" />
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
                <input type="checkbox" />
                <span>
                  我同意 UCMARKET 的 <a href="#">服務條款</a>、<a href="#">隱私政策</a> 與
                  <a href="#">風險披露聲明</a>
                </span>
              </label>

              <button type="submit" className="register-submit-btn">
                立即註冊
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className="register-divider">
              <span></span>
              <p>或使用以下方式繼續</p>
              <span></span>
            </div>

            <div className="social-register">
              <button>Google</button>
              <button>錢包連接</button>
            </div>

            <p className="login-link">
              已經有帳號？ <a href="/auth/login">立即登入</a>
            </p>
          </section>
        </section>
      </main>

      <div className={`register-toast ${showToast ? "show" : ""}`}>
        註冊成功，帳號已建立
      </div>
    </>
  );
}

