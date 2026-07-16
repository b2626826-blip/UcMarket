import { useEffect, useMemo, useState } from 'react';
import useAuthStore from '../../../store/authStore';
import useUiStore from '../../../store/uiStore';
import Button from '../../../components/common/Button';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../../../types/auth';
import './style.css';

function formatJoinedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function defaultAvatarUrl(seed) {
  const s = encodeURIComponent(seed || 'UC');
  return `https://api.dicebear.com/8.x/initials/svg?seed=${s}&backgroundColor=d9aa43&textColor=402d00`;
}

const SECTIONS = [
  { id: 'overview', label: '總覽', icon: 'fa-gauge-high' },
  { id: 'profile', label: '基本資料', icon: 'fa-user' },
  { id: 'security', label: '安全性', icon: 'fa-shield-halved' },
];

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const loading = useAuthStore((s) => s.loading);
  const showToast = useUiStore((s) => s.showToast);

  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState({ username: '', avatarUrl: '', bio: '' });
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;
    setAvatarBroken(false);
    setProfile({
      username: user.username || '',
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
    });
    setProfileDirty(false);
  }, [user]);

  const avatarLetter = useMemo(() => {
    const source = profile.username || user?.email || 'U';
    return source.trim().charAt(0).toUpperCase();
  }, [profile.username, user?.email]);

  const displayAvatar = profile.avatarUrl && !avatarBroken ? profile.avatarUrl : null;
  const roleLabel = user?.role === 'ADMIN' || user?.role === 'admin' ? '管理員' : '一般會員';
  const status = user?.status || 'ACTIVE';
  const statusOk = status === 'ACTIVE';
  const hasPassword = user?.hasPassword !== false;

  const metaCards = [
    { label: '角色', value: roleLabel, icon: 'fa-crown', tone: 'gold' },
    {
      label: '狀態',
      value: statusOk ? '正常' : status,
      icon: 'fa-circle-check',
      tone: statusOk ? 'good' : 'warn',
    },
    {
      label: '登入',
      value: hasPassword ? '密碼' : 'OAuth',
      icon: hasPassword ? 'fa-key' : 'fa-link',
      tone: 'neutral',
    },
  ];

  function markProfile(field, value) {
    setProfileError('');
    if (field === 'avatarUrl') setAvatarBroken(false);
    setProfile((prev) => ({ ...prev, [field]: value }));
    setProfileDirty(true);
  }

  function resetProfile() {
    setProfileError('');
    setAvatarBroken(false);
    setProfile({
      username: user?.username || '',
      avatarUrl: user?.avatarUrl || '',
      bio: user?.bio || '',
    });
    setProfileDirty(false);
  }

  function applySuggestedAvatar() {
    markProfile('avatarUrl', defaultAvatarUrl(profile.username || user?.email));
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError('');
    const username = profile.username.trim();
    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
      setProfileError(`使用者名稱需為 ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} 字元。`);
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({
        username,
        avatarUrl: profile.avatarUrl.trim() || null,
        bio: profile.bio.trim() || null,
      });
      setProfileDirty(false);
      showToast('success', '資料已更新', '個人資料已成功儲存。');
    } catch (err) {
      setProfileError(err?.message || '更新失敗，請稍後再試。');
      showToast('danger', '更新失敗', err?.message || '請稍後再試');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    const { oldPassword, newPassword, confirmPassword } = passwordForm;
    if (!oldPassword || !newPassword) {
      setPasswordError('請填寫目前密碼與新密碼。');
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      setPasswordError(`新密碼長度需為 ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} 字元。`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('兩次輸入的新密碼不一致。');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      showToast('success', '密碼已更新', '下次請使用新密碼登入。');
    } catch (err) {
      setPasswordError(err?.message || '密碼更新失敗。');
      showToast('danger', '密碼更新失敗', err?.message || '請確認目前密碼是否正確');
    } finally {
      setPasswordSaving(false);
    }
  }

  function scrollTo(id) {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const pwdStrength = useMemo(() => {
    const p = passwordForm.newPassword;
    if (!p) return 0;
    let s = 0;
    if (p.length >= PASSWORD_MIN_LENGTH) s += 1;
    if (p.length >= 10) s += 1;
    if (/[A-Za-z]/.test(p) && /\d/.test(p)) s += 1;
    if (/[^A-Za-z0-9]/.test(p)) s += 1;
    return s;
  }, [passwordForm.newPassword]);

  const strengthLabel = ['', '弱', '尚可', '良好', '強'][pwdStrength] || '';

  return (
    <div className="pf">
      {/* Page header */}
      <header className="pf-header">
        <div className="pf-header__text">
          <p className="pf-kicker">Account</p>
          <h1 className="pf-title">個人設定</h1>
          <p className="pf-desc">管理你的公開資訊、頭像與帳號安全。</p>
        </div>
        <div className="pf-header__meta">
          <span className={`pf-pill ${statusOk ? 'pf-pill--good' : 'pf-pill--warn'}`}>
            <i className={`fa-solid ${statusOk ? 'fa-circle-check' : 'fa-circle-exclamation'}`} aria-hidden="true" />
            {statusOk ? '帳號正常' : status}
          </span>
          <span className="pf-pill pf-pill--muted">
            <i className="fa-regular fa-calendar" aria-hidden="true" />
            加入於 {formatJoinedAt(user?.createdAt)}
          </span>
        </div>
      </header>

      <div className="pf-shell">
        {/* Side nav */}
        <aside className="pf-nav" aria-label="設定導覽">
          <div className="pf-nav__identity">
            <div className="pf-nav__avatar">
              {displayAvatar ? (
                <img src={displayAvatar} alt="" onError={() => setAvatarBroken(true)} />
              ) : (
                <span>{avatarLetter}</span>
              )}
            </div>
            <div className="pf-nav__who">
              <strong>{profile.username || '—'}</strong>
              <span>{user?.email || '—'}</span>
            </div>
          </div>

          <nav className="pf-nav__list">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pf-nav__item${activeSection === s.id ? ' is-active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                <i className={`fa-solid ${s.icon}`} aria-hidden="true" />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="pf-nav__hint">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <p>Email 與角色由系統管理，無法在此修改。</p>
          </div>
        </aside>

        {/* Main */}
        <div className="pf-main">
          {/* Overview metrics */}
          <section id="section-overview" className="pf-section">
            <div className="pf-section__head">
              <div>
                <h2>帳號總覽</h2>
                <p>快速檢視會員狀態與關鍵資訊。</p>
              </div>
            </div>
            <div className="pf-metrics">
              {metaCards.map((m) => (
                <article key={m.label} className={`pf-metric pf-metric--${m.tone}`}>
                  <div className="pf-metric__icon">
                    <i className={`fa-solid ${m.icon}`} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="pf-metric__label">{m.label}</span>
                    <strong className="pf-metric__value">{m.value}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="pf-info-grid">
              <div className="pf-info">
                <span>電子郵件</span>
                <strong>{user?.email || '—'}</strong>
              </div>
              <div className="pf-info">
                <span>使用者名稱</span>
                <strong>{user?.username || '—'}</strong>
              </div>
              <div className="pf-info">
                <span>加入日期</span>
                <strong>{formatJoinedAt(user?.createdAt)}</strong>
              </div>
              <div className="pf-info">
                <span>登入方式</span>
                <strong>{hasPassword ? 'Email 與密碼' : '第三方 OAuth'}</strong>
              </div>
            </div>
          </section>

          {/* Profile edit */}
          <section id="section-profile" className="pf-section">
            <div className="pf-section__head">
              <div>
                <h2>基本資料</h2>
                <p>這些資訊會顯示在平台上的會員識別中。</p>
              </div>
              {profileDirty && <span className="pf-dirty">未儲存變更</span>}
            </div>

            <form className="pf-form" onSubmit={handleProfileSubmit}>
              <div className="pf-form__layout">
                {/* Avatar column */}
                <div className="pf-avatar-panel">
                  <div className="pf-avatar-panel__preview">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="" onError={() => setAvatarBroken(true)} />
                    ) : (
                      <span>{avatarLetter}</span>
                    )}
                  </div>
                  <p className="pf-avatar-panel__caption">頭像預覽</p>
                  <div className="pf-avatar-panel__actions">
                    <button type="button" className="pf-ghost-btn" onClick={applySuggestedAvatar}>
                      <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                      產生頭像
                    </button>
                    {profile.avatarUrl && (
                      <button
                        type="button"
                        className="pf-ghost-btn pf-ghost-btn--muted"
                        onClick={() => markProfile('avatarUrl', '')}
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="pf-fields">
                  <div className="pf-field">
                    <label htmlFor="profile-email">電子郵件</label>
                    <div className="pf-input pf-input--readonly">
                      <i className="fa-regular fa-envelope" aria-hidden="true" />
                      <input id="profile-email" type="email" value={user?.email || ''} disabled readOnly />
                      <span className="pf-lock">唯讀</span>
                    </div>
                  </div>

                  <div className="pf-field">
                    <label htmlFor="profile-username">
                      使用者名稱
                      <em>{USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} 字元</em>
                    </label>
                    <div className="pf-input">
                      <i className="fa-regular fa-user" aria-hidden="true" />
                      <input
                        id="profile-username"
                        type="text"
                        value={profile.username}
                        onChange={(e) => markProfile('username', e.target.value)}
                        placeholder="你的顯示名稱"
                        autoComplete="username"
                        maxLength={USERNAME_MAX_LENGTH}
                      />
                    </div>
                  </div>

                  <div className="pf-field">
                    <label htmlFor="profile-avatar">頭像網址</label>
                    <div className="pf-input">
                      <i className="fa-regular fa-image" aria-hidden="true" />
                      <input
                        id="profile-avatar"
                        type="url"
                        value={profile.avatarUrl}
                        onChange={(e) => markProfile('avatarUrl', e.target.value)}
                        placeholder="https://example.com/avatar.png"
                      />
                    </div>
                  </div>

                  <div className="pf-field">
                    <label htmlFor="profile-bio">
                      個人簡介
                      <em>{profile.bio.length}/500</em>
                    </label>
                    <textarea
                      id="profile-bio"
                      className="pf-textarea"
                      rows={4}
                      value={profile.bio}
                      onChange={(e) => markProfile('bio', e.target.value)}
                      placeholder="介紹自己、偏好的市場類型…"
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>

              {profileError && (
                <div className="pf-alert pf-alert--error" role="alert">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                  {profileError}
                </div>
              )}

              <div className="pf-form__footer">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetProfile}
                  disabled={profileSaving || loading || !profileDirty}
                >
                  捨棄變更
                </Button>
                <Button type="submit" variant="primary" disabled={profileSaving || loading || !profileDirty}>
                  {profileSaving ? '儲存中…' : '儲存變更'}
                </Button>
              </div>
            </form>
          </section>

          {/* Security */}
          <section id="section-security" className="pf-section">
            <div className="pf-section__head">
              <div>
                <h2>安全性</h2>
                <p>
                  {hasPassword
                    ? `定期更新密碼。新密碼至少 ${PASSWORD_MIN_LENGTH} 碼，建議英數混合。`
                    : '此帳號使用第三方登入，無需在此管理密碼。'}
                </p>
              </div>
            </div>

            {hasPassword ? (
              <form className="pf-form" onSubmit={handlePasswordSubmit}>
                <div className="pf-fields pf-fields--security">
                  <div className="pf-field">
                    <label htmlFor="old-password">目前密碼</label>
                    <div className="pf-input">
                      <i className="fa-solid fa-lock" aria-hidden="true" />
                      <input
                        id="old-password"
                        type={showOld ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={passwordForm.oldPassword}
                        onChange={(e) => {
                          setPasswordError('');
                          setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }));
                        }}
                        placeholder="輸入目前密碼"
                      />
                      <button
                        type="button"
                        className="pf-eye"
                        onClick={() => setShowOld((v) => !v)}
                        aria-label={showOld ? '隱藏密碼' : '顯示密碼'}
                      >
                        <i className={`fa-solid ${showOld ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="pf-field-row">
                    <div className="pf-field">
                      <label htmlFor="new-password">新密碼</label>
                      <div className="pf-input">
                        <i className="fa-solid fa-key" aria-hidden="true" />
                        <input
                          id="new-password"
                          type={showNew ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={passwordForm.newPassword}
                          onChange={(e) => {
                            setPasswordError('');
                            setPasswordForm((p) => ({ ...p, newPassword: e.target.value }));
                          }}
                          placeholder={`至少 ${PASSWORD_MIN_LENGTH} 個字元`}
                        />
                        <button
                          type="button"
                          className="pf-eye"
                          onClick={() => setShowNew((v) => !v)}
                          aria-label={showNew ? '隱藏密碼' : '顯示密碼'}
                        >
                          <i className={`fa-solid ${showNew ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                        </button>
                      </div>
                      {passwordForm.newPassword && (
                        <div className="pf-strength" data-level={pwdStrength}>
                          <div className="pf-strength__bars" aria-hidden="true">
                            <span /><span /><span /><span />
                          </div>
                          <em>強度：{strengthLabel}</em>
                        </div>
                      )}
                    </div>

                    <div className="pf-field">
                      <label htmlFor="confirm-password">確認新密碼</label>
                      <div className="pf-input">
                        <i className="fa-solid fa-check-double" aria-hidden="true" />
                        <input
                          id="confirm-password"
                          type={showConfirm ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => {
                            setPasswordError('');
                            setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }));
                          }}
                          placeholder="再輸入一次"
                        />
                        <button
                          type="button"
                          className="pf-eye"
                          onClick={() => setShowConfirm((v) => !v)}
                          aria-label={showConfirm ? '隱藏密碼' : '顯示密碼'}
                        >
                          <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {passwordError && (
                  <div className="pf-alert pf-alert--error" role="alert">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                    {passwordError}
                  </div>
                )}

                <div className="pf-form__footer">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={passwordSaving || loading}
                    onClick={() => {
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                  >
                    清除
                  </Button>
                  <Button type="submit" variant="primary" disabled={passwordSaving || loading}>
                    {passwordSaving ? '更新中…' : '更新密碼'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="pf-oauth">
                <div className="pf-oauth__icon">
                  <i className="fa-solid fa-link" aria-hidden="true" />
                </div>
                <div>
                  <h3>第三方登入帳號</h3>
                  <p>此帳號透過 Google / GitHub 等 OAuth 登入，密碼由外部服務管理，無法在此變更。</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
