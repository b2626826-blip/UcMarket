// ======================================
// REGISTER DOM
// ======================================

const registerForm =
document.getElementById("registerForm");

const usernameInput =
document.getElementById("username");

const emailInput =
document.getElementById("email");

const passwordInput =
document.getElementById("password");

const confirmPasswordInput =
document.getElementById("confirmPassword");

const termsInput =
document.getElementById("terms");

const termsError =
document.getElementById("termsError");

const registerSubmitBtn =
document.getElementById("registerSubmitBtn");

const registerToast =
document.getElementById("registerToast");

// ======================================
// 顯示 / 隱藏密碼
// ======================================

const passwordToggleBtns =
document.querySelectorAll(".password-toggle");

passwordToggleBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        const targetId =
        btn.dataset.target;

        const input =
        document.getElementById(targetId);

        const icon =
        btn.querySelector("i");

        if(input.type === "password"){

            input.type = "text";

            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");

        }else{

            input.type = "password";

            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");

        }

    });

});

// ======================================
// ERROR
// ======================================

function showError(input, message){

    const formGroup =
    input.closest(".form-group");

    const errorText =
    formGroup.querySelector(".error-text");

    errorText.textContent = message;

    input.classList.add("input-error");

}

function clearError(input){

    const formGroup =
    input.closest(".form-group");

    const errorText =
    formGroup.querySelector(".error-text");

    errorText.textContent = "";

    input.classList.remove("input-error");

}

// ======================================
// EMAIL CHECK
// ======================================

function isValidEmail(email){

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

// ======================================
// VALIDATE
// ======================================

function validateRegister(){

    let isValid = true;

    const username =
    usernameInput.value.trim();

    const email =
    emailInput.value.trim();

    const password =
    passwordInput.value.trim();

    const confirmPassword =
    confirmPasswordInput.value.trim();

    clearError(usernameInput);
    clearError(emailInput);
    clearError(passwordInput);
    clearError(confirmPasswordInput);

    termsError.textContent = "";

    if(username === ""){

        showError(
            usernameInput,
            "請輸入用戶名稱"
        );

        isValid = false;

    }else if(username.length < 3){

        showError(
            usernameInput,
            "用戶名稱至少 3 個字元"
        );

        isValid = false;

    }

    if(email === ""){

        showError(
            emailInput,
            "請輸入電子郵件"
        );

        isValid = false;

    }else if(!isValidEmail(email)){

        showError(
            emailInput,
            "電子郵件格式不正確"
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

    if(confirmPassword === ""){

        showError(
            confirmPasswordInput,
            "請再次輸入密碼"
        );

        isValid = false;

    }else if(confirmPassword !== password){

        showError(
            confirmPasswordInput,
            "兩次密碼輸入不一致"
        );

        isValid = false;

    }

    if(!termsInput.checked){

        termsError.textContent =
        "請先同意服務條款與風險披露聲明";

        isValid = false;

    }

    return isValid;

}

// ======================================
// SUBMIT
// ======================================

registerForm.addEventListener("submit", event => {

    event.preventDefault();

    if(!validateRegister()){
        return;
    }

    registerSubmitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> 註冊中...';

    registerSubmitBtn.disabled = true;

    setTimeout(() => {

        registerSubmitBtn.innerHTML =
        '<i class="fa-solid fa-check"></i> 註冊成功';

        registerSubmitBtn.style.background =
        "#00d66f";

        showToast();

        setTimeout(() => {

            registerSubmitBtn.innerHTML =
            '立即註冊 <i class="fa-solid fa-arrow-right"></i>';

            registerSubmitBtn.style.background =
            "";

            registerSubmitBtn.disabled = false;

            registerForm.reset();

        }, 1800);

    }, 1200);

});

// ======================================
// TOAST
// ======================================

function showToast(){

    registerToast.classList.add("show");

    setTimeout(() => {

        registerToast.classList.remove("show");

    }, 2500);

}

// ======================================
// INPUT 即時清除錯誤
// ======================================

[
    usernameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput
].forEach(input => {

    input.addEventListener("input", () => {

        clearError(input);

    });

});

termsInput.addEventListener("change", () => {

    if(termsInput.checked){
        termsError.textContent = "";
    }

});

// ======================================
// CARD GLOW
// ======================================

document.addEventListener("mousemove", event => {

    const card =
    event.target.closest(".register-card");

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
// SOCIAL REGISTER DEMO
// ======================================

const socialBtns =
document.querySelectorAll(".social-register button");

socialBtns.forEach(btn => {

    btn.addEventListener("click", () => {

        registerSubmitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> 第三方註冊中...';

        registerSubmitBtn.disabled = true;

        setTimeout(() => {

            registerSubmitBtn.innerHTML =
            '立即註冊 <i class="fa-solid fa-arrow-right"></i>';

            registerSubmitBtn.disabled = false;

            showToast();

        }, 1200);

    });

});