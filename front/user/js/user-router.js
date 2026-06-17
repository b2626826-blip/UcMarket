(function () {
  'use strict';

  /* ---- Page Routing ---- */
  var mainContent = document.getElementById('main-content');
  var footer = document.getElementById('main-footer');
  var navLinks = document.querySelectorAll('[data-page]');
  var loadedScripts = {};

  function loadScript(src, initFn) {
    if (loadedScripts[src]) {
      if (typeof window[initFn] === 'function') window[initFn]();
      return;
    }
    var script = document.createElement('script');
    script.src = src;
    script.onload = function () {
      loadedScripts[src] = true;
      if (typeof window[initFn] === 'function') window[initFn]();
    };
    document.body.appendChild(script);
  }

  function loadPage(pageUrl) {
    fetch(pageUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + pageUrl);
        return res.text();
      })
      .then(function (html) {
        mainContent.innerHTML = html;
        if (footer) footer.style.display = '';
        if (pageUrl.indexOf('dashboard') !== -1) {
          loadScript('js/dashboard.js', 'initDashboard');
        } else if (pageUrl.indexOf('ranking') !== -1) {
          loadScript('js/ranking.js', 'initRanking');
        } else if (pageUrl.indexOf('trading') !== -1) {
          loadScript('js/trading.js', 'initTrading');
        } else if (pageUrl.indexOf('wallet') !== -1) {
          loadScript('js/wallet.js', 'initWallet');
        }
      })
      .catch(function (err) {
        mainContent.innerHTML = '<div class="error-message" style="color:#ff476d; text-align:center; padding:100px 20px;">無法載入頁面：' + err.message + '</div>';
      });
  }

  function setActiveLink(linkEl) {
    navLinks.forEach(function (link) {
      link.classList.remove('active');
    });
    if (linkEl) {
      linkEl.classList.add('active');
    }
  }

  /* ---- Auth Modal DOM ---- */
  var overlay = document.getElementById('authOverlay');
  var dialog = document.getElementById('authDialog');
  var loginPane = document.getElementById('loginPane');
  var registerPane = document.getElementById('registerPane');
  var loginForm = document.getElementById('loginForm');
  var registerForm = document.getElementById('registerForm');

  var loginEmail = document.getElementById('loginEmail');
  var loginPassword = document.getElementById('loginPassword');
  var loginSubmitBtn = document.getElementById('loginSubmitBtn');
  var loginTogglePwd = document.getElementById('loginTogglePwd');

  var regUsername = document.getElementById('regUsername');
  var regEmail = document.getElementById('regEmail');
  var regPassword = document.getElementById('regPassword');
  var regConfirmPwd = document.getElementById('regConfirmPwd');
  var regTerms = document.getElementById('regTerms');
  var regTermsError = document.getElementById('regTermsError');
  var registerSubmitBtn = document.getElementById('registerSubmitBtn');

  var toast = document.getElementById('authToast');
  var toastMessage = document.getElementById('toastMessage');

  var currentTab = 'login';

  /* ---- Mouse Glow (rAF-throttled) ---- */
  var glowRAF = null;
  var glowAttached = false;

  function onGlowMove(e) {
    if (glowRAF) return;
    glowRAF = requestAnimationFrame(function () {
      glowRAF = null;
      var card = dialog;
      if (!card) return;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');
    });
  }

  function attachGlow() {
    if (glowAttached || !dialog) return;
    dialog.classList.add('glow-active');
    document.addEventListener('mousemove', onGlowMove);
    glowAttached = true;
  }

  function detachGlow() {
    if (!glowAttached) return;
    if (glowRAF) { cancelAnimationFrame(glowRAF); glowRAF = null; }
    if (dialog) dialog.classList.remove('glow-active');
    document.removeEventListener('mousemove', onGlowMove);
    glowAttached = false;
  }

  /* ---- Auth Modal Open/Close ---- */
  function openAuth(tab) {
    currentTab = tab || 'login';
    if (overlay) overlay.style.display = '';
    switchTab(currentTab);
    attachGlow();
  }

  function closeAuth() {
    detachGlow();
    if (overlay) overlay.style.display = 'none';
  }

  function switchTab(tab) {
    currentTab = tab;
    var tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    if (loginPane) loginPane.classList.toggle('active', tab === 'login');
    if (registerPane) registerPane.classList.toggle('active', tab === 'register');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    clearAllErrors();
  }

  function clearAllErrors() {
    document.querySelectorAll('.error-text, .terms-error').forEach(function (el) {
      el.textContent = '';
    });
    document.querySelectorAll('.input-error').forEach(function (el) {
      el.classList.remove('input-error');
    });
  }

  /* ---- Validation ---- */
  function showError(input, message) {
    var formGroup = input.closest('.form-group');
    if (!formGroup) return;
    var errorText = formGroup.querySelector('.error-text');
    if (errorText) errorText.textContent = message;
    input.classList.add('input-error');
  }

  function clearError(input) {
    var formGroup = input.closest('.form-group');
    if (!formGroup) return;
    var errorText = formGroup.querySelector('.error-text');
    if (errorText) errorText.textContent = '';
    input.classList.remove('input-error');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateLogin() {
    var isValid = true;
    var email = loginEmail.value.trim();
    var password = loginPassword.value.trim();

    clearError(loginEmail);
    clearError(loginPassword);

    if (email === '') {
      showError(loginEmail, '請輸入 Email');
      isValid = false;
    } else if (!isValidEmail(email)) {
      showError(loginEmail, 'Email 格式不正確');
      isValid = false;
    }

    if (password === '') {
      showError(loginPassword, '請輸入密碼');
      isValid = false;
    } else if (password.length < 8) {
      showError(loginPassword, '密碼至少需要 8 個字元');
      isValid = false;
    }

    return isValid;
  }

  function validateRegister() {
    var isValid = true;
    var username = regUsername.value.trim();
    var email = regEmail.value.trim();
    var password = regPassword.value.trim();
    var confirmPwd = regConfirmPwd.value.trim();

    clearError(regUsername);
    clearError(regEmail);
    clearError(regPassword);
    clearError(regConfirmPwd);
    if (regTermsError) regTermsError.textContent = '';

    if (username === '') {
      showError(regUsername, '請輸入用戶名稱');
      isValid = false;
    } else if (username.length < 3) {
      showError(regUsername, '用戶名稱至少 3 個字元');
      isValid = false;
    }

    if (email === '') {
      showError(regEmail, '請輸入電子郵件');
      isValid = false;
    } else if (!isValidEmail(email)) {
      showError(regEmail, '電子郵件格式不正確');
      isValid = false;
    }

    if (password === '') {
      showError(regPassword, '請輸入密碼');
      isValid = false;
    } else if (password.length < 8) {
      showError(regPassword, '密碼至少需要 8 個字元');
      isValid = false;
    }

    if (confirmPwd === '') {
      showError(regConfirmPwd, '請再次輸入密碼');
      isValid = false;
    } else if (confirmPwd !== password) {
      showError(regConfirmPwd, '兩次密碼輸入不一致');
      isValid = false;
    }

    if (!regTerms.checked) {
      if (regTermsError) regTermsError.textContent = '請先同意服務條款與風險披露聲明';
      isValid = false;
    }

    return isValid;
  }

  /* ---- Toast ---- */
  var toastTimer;

  function showToast(msg) {
    if (toastMessage) toastMessage.textContent = msg || '成功';
    if (toast) toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (toast) toast.classList.remove('show');
    }, 2500);
  }

  /* ---- Password Toggle ---- */
  function setupPasswordToggles() {
    if (loginTogglePwd) {
      loginTogglePwd.addEventListener('click', function () {
        var icon = loginTogglePwd.querySelector('i');
        if (loginPassword.type === 'password') {
          loginPassword.type = 'text';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          loginPassword.type = 'password';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      });
    }

    document.querySelectorAll('.password-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.dataset.target;
        var input = document.getElementById(targetId);
        if (!input) return;
        var icon = btn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      });
    });
  }

  /* ---- Submit Handlers ---- */
  function setLoginBtnLoading(loading) {
    if (!loginSubmitBtn) return;
    if (loading) {
      loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 登入中...';
      loginSubmitBtn.disabled = true;
    } else {
      loginSubmitBtn.innerHTML = '登入帳戶';
      loginSubmitBtn.disabled = false;
    }
  }

  function setLoginBtnSuccess() {
    if (!loginSubmitBtn) return;
    loginSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> 登入成功';
    loginSubmitBtn.style.background = '#00d66f';
  }

  function resetLoginBtn() {
    if (!loginSubmitBtn) return;
    loginSubmitBtn.innerHTML = '登入帳戶';
    loginSubmitBtn.style.background = '';
    loginSubmitBtn.disabled = false;
  }

  function setRegisterBtnLoading(loading) {
    if (!registerSubmitBtn) return;
    if (loading) {
      registerSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 註冊中...';
      registerSubmitBtn.disabled = true;
    } else {
      registerSubmitBtn.innerHTML = '立即註冊 <i class="fa-solid fa-arrow-right"></i>';
      registerSubmitBtn.disabled = false;
    }
  }

  function setRegisterBtnSuccess() {
    if (!registerSubmitBtn) return;
    registerSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> 註冊成功';
    registerSubmitBtn.style.background = '#00d66f';
  }

  function resetRegisterBtn() {
    if (!registerSubmitBtn) return;
    registerSubmitBtn.innerHTML = '立即註冊 <i class="fa-solid fa-arrow-right"></i>';
    registerSubmitBtn.style.background = '';
    registerSubmitBtn.disabled = false;
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoginBtnLoading(true);

    window.auth.login(loginEmail.value.trim(), loginPassword.value.trim())
      .then(function () {
        setLoginBtnSuccess();
        showToast('登入成功');
        setTimeout(function () {
          closeAuth();
          resetLoginBtn();
          loginForm.reset();
        }, 1200);
      })
      .catch(function (err) {
        showError(loginEmail, err.message || '登入失敗');
        setLoginBtnLoading(false);
      });
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!validateRegister()) return;

    setRegisterBtnLoading(true);

    window.auth.register(regUsername.value.trim(), regEmail.value.trim(), regPassword.value.trim())
      .then(function () {
        setRegisterBtnSuccess();
        showToast('註冊成功，帳號已建立');
        setTimeout(function () {
          closeAuth();
          resetRegisterBtn();
          registerForm.reset();
        }, 1200);
      })
      .catch(function (err) {
        showError(regEmail, err.message || '註冊失敗');
        setRegisterBtnLoading(false);
      });
  }

  /* ---- Real-time Error Clearing ---- */
  function setupInputListeners() {
    [loginEmail, loginPassword].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () { clearError(input); });
    });

    [regUsername, regEmail, regPassword, regConfirmPwd].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () { clearError(input); });
    });

    if (regTerms) {
      regTerms.addEventListener('change', function () {
        if (regTerms.checked && regTermsError) regTermsError.textContent = '';
      });
    }
  }

  /* ---- Social Buttons Demo ---- */
  function setupSocialButtons() {
    document.querySelectorAll('.social-login button, .social-register button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isLogin = btn.closest('.social-login');
        var msg = isLogin ? '第三方登入中...' : '第三方註冊中...';

        if (isLogin) {
          loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + msg;
          loginSubmitBtn.disabled = true;
          setTimeout(function () {
            resetLoginBtn();
            showToast('登入成功');
          }, 1200);
        } else {
          registerSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + msg;
          registerSubmitBtn.disabled = true;
          setTimeout(function () {
            resetRegisterBtn();
            showToast('註冊成功，帳號已建立');
          }, 1200);
        }
      });
    });
  }

  /* ---- Init ---- */
  setupPasswordToggles();
  setupInputListeners();
  setupSocialButtons();

  /* ---- Event Delegation ---- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-page]');
    if (trigger) {
      e.preventDefault();
      var pageUrl = trigger.getAttribute('data-page');
      if (pageUrl) {
        setActiveLink(trigger);
        loadPage(pageUrl);
      }
      return;
    }

    var authOpen = e.target.closest('[data-auth-open]');
    if (authOpen) {
      e.preventDefault();
      openAuth(authOpen.getAttribute('data-auth-open'));
      return;
    }

    if (e.target.closest('#authClose') || e.target === overlay) {
      closeAuth();
      return;
    }

    var authTab = e.target.closest('.auth-tab');
    if (authTab) {
      switchTab(authTab.getAttribute('data-tab'));
      return;
    }

    var switchTabLink = e.target.closest('[data-switch-tab]');
    if (switchTabLink) {
      e.preventDefault();
      switchTab(switchTabLink.getAttribute('data-switch-tab'));
      return;
    }

    if (e.target.closest('#logout-link')) {
      e.preventDefault();
      window.auth.logout().then(function () {
        var defaultLink = document.querySelector('[data-page="views/dashboard.html"]');
        if (defaultLink) { setActiveLink(defaultLink); loadPage('views/dashboard.html'); }
      });
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAuth();
  });

  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);

  document.addEventListener('DOMContentLoaded', function () {
    var defaultLink = document.querySelector('[data-page="views/dashboard.html"]');
    if (defaultLink) {
      setActiveLink(defaultLink);
      loadPage('views/dashboard.html');
    }
    if (window.auth && window.auth.checkAuth) {
      window.auth.checkAuth();
    }
  });
})();
