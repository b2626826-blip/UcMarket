import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../../api/authApi";
import "../login/LoginPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await forgotPassword(email.trim());
      setMessage(data?.message || "若此 Email 已註冊，我們已寄出重設信件。");
      setDone(true);
    } catch (err) {
      setError(err?.message || "送出失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="login-wrapper">
        <section className="login-bg-text">
          <div className="bg-row row1">UCMARKET RESET PASSWORD UCMARKET RESET PASSWORD</div>
          <div className="bg-row row2">UCMARKET RESET PASSWORD UCMARKET RESET PASSWORD</div>
          <div className="bg-row row3">UCMARKET RESET PASSWORD UCMARKET RESET PASSWORD</div>
        </section>

        <section className="login-card">
          <div className="login-glow"></div>

          <div className="login-header">
            <h1>忘記密碼</h1>
            <p>輸入註冊 Email，我們會寄出 10 分鐘內有效的重設連結。</p>
          </div>

          {done ? (
            <div className="login-form">
              <p className="error-text" style={{ textAlign: "center", color: "#33e97f" }}>
                {message}
              </p>
              <p className="register-link" style={{ marginTop: 20 }}>
                <Link to="/auth/login">返回登入</Link>
              </p>
            </div>
          ) : (
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

              {error && (
                <p className="error-text" style={{ textAlign: "center", marginTop: 4 }}>
                  {error}
                </p>
              )}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? "送出中..." : "寄送重設信件"}
              </button>

              <p className="register-link">
                想起密碼了？ <Link to="/auth/login">返回登入</Link>
              </p>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
