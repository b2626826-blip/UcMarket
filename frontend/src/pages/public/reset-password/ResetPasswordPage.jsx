import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../../api/authApi";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../../../types/auth";
import "../login/LoginPage.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("重設連結無效或已過期。");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      setError(`新密碼長度需為 ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} 字元。`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("兩次輸入的密碼不一致。");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate("/auth/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(err?.message || "重設失敗，請重新申請連結。");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="login-wrapper">
        <section className="login-card">
          <div className="login-header">
            <h1>重設密碼</h1>
            <p>重設連結無效或已過期，請重新申請。</p>
          </div>
          <p className="register-link">
            <Link to="/auth/forgot-password">重新申請重設信件</Link>
            {" · "}
            <Link to="/auth/login">返回登入</Link>
          </p>
        </section>
      </main>
    );
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
            <h1>設定新密碼</h1>
            <p>請輸入新密碼。連結僅 10 分鐘有效，且只能使用一次。</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>新密碼</label>
              <div className="input-box">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={`至少 ${PASSWORD_MIN_LENGTH} 個字元`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}>
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>確認新密碼</label>
              <div className="input-box">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="再輸入一次"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}>
                  <span className="material-symbols-outlined">
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p className="error-text" style={{ textAlign: "center", marginTop: 4 }}>
                {error}
              </p>
            )}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "更新中..." : "重設密碼"}
            </button>

            <p className="register-link">
              <Link to="/auth/login">返回登入</Link>
            </p>
          </form>
        </section>
      </main>

      <div className={`login-toast ${showToast ? "show" : ""}`}>
        <span className="material-symbols-outlined">check</span>
        密碼已重設
      </div>
    </>
  );
}
