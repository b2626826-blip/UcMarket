// ======================================
// LOGIN DOM
// ======================================

const loginForm =
document.getElementById("loginForm");

const emailInput =
document.getElementById("email");

const passwordInput =
document.getElementById("password");

const togglePasswordBtn =
document.getElementById("togglePassword");

const loginSubmitBtn =
document.getElementById("loginSubmitBtn");

const loginToast =
document.getElementById("loginToast");

// ======================================
// 顯示 / 隱藏密碼
// ======================================

togglePasswordBtn.addEventListener("click", () => {

    const icon =
    togglePasswordBtn.querySelector("i");

    if(passwordInput.type === "password"){

        passwordInput.type = "text";

        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");

    }else{

        passwordInput.type = "password";

        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");

    }

});

// ======================================
// 顯示錯誤
// ======================================

function showError(input, message){

    const formGroup =
    input.closest(".form-group");

    const errorText =
    formGroup.querySelector(".error-text");

    errorText.textContent = message;

    input.classList.add("input-error");

}

// ======================================
// 清除錯誤
// ======================================

function clearError(input){

    const formGroup =
    input.closest(".form-group");

    const errorText =
    formGroup.querySelector(".error-text");

    errorText.textContent = "";

    input.classList.remove("input-error");

}

// ======================================
// Email 格式檢查
// ======================================

function isValidEmail(email){

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

// ======================================
// 表單驗證
// ======================================

function validateLogin(){

    let isValid = true;

    const email =
    emailInput.value.trim();

    const password =
    passwordInput.value.trim();

    clearError(emailInput);
    clearError(passwordInput);

    if(email === ""){

        showError(
            emailInput,
            "請輸入 Email"
        );

        isValid = false;

    }else if(!isValidEmail(email)){

        showError(
            emailInput,
            "Email 格式不正確"
        );

        isValid = false;

    }

    if(password === ""){

        showError(
            passwordInput,
            "請輸入密碼"
        );

        isValid = false;

    }else if(password.length < 8){

        showError(
            passwordInput,
            "密碼至少需要 8 個字元"
        );

        isValid = false;

    }

    return isValid;

}

// ======================================
// 登入送出
// ======================================

loginForm.addEventListener("submit", event => {

    event.preventDefault();

    if(!validateLogin()){
        return;
    }

    loginSubmitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> 登入中...';

    loginSubmitBtn.disabled = true;

    setTimeout(() => {

        loginSubmitBtn.innerHTML =
        '<i class="fa-solid fa-check"></i> 登入成功';

        loginSubmitBtn.style.background =
        "#00d66f";

        showToast();

        setTimeout(() => {

            loginSubmitBtn.innerHTML =
            "登入帳戶";

            loginSubmitBtn.style.background =
            "";

            loginSubmitBtn.disabled = false;

            loginForm.reset();

        }, 1800);

    }, 1200);

});

// ======================================
// TOAST
// ======================================

function showToast(){

    loginToast.classList.add("show");

    setTimeout(() => {
        loginToast.classList.remove("show");
    }, 2500);

}

// ======================================
// INPUT 即時清錯
// ======================================

[emailInput, passwordInput].forEach(input => {

    input.addEventListener("input", () => {
        clearError(input);
    });

});

// ======================================
// LOGIN CARD GLOW
// ======================================

document.addEventListener("mousemove", event => {

    const card =
    event.target.closest(".login-card");

    if(!card) return;

    const rect =
    card.getBoundingClientRect();

    const x =
    event.clientX - rect.left;

    const y =
    event.clientY - rect.top;

    card.style.setProperty(
        "--mouse-x",
        `${x}px`
    );

    card.style.setProperty(
        "--mouse-y",
        `${y}px`
    );

});

// ======================================
// SOCIAL LOGIN DEMO
// ======================================

const socialButtons =
document.querySelectorAll(".social-login button");

socialButtons.forEach(button => {

    button.addEventListener("click", () => {

        loginSubmitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> 第三方登入中...';

        loginSubmitBtn.disabled = true;

        setTimeout(() => {

            loginSubmitBtn.innerHTML =
            "登入帳戶";

            loginSubmitBtn.disabled = false;

            showToast();

        }, 1200);

    });

});