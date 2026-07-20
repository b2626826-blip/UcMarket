package com.ucmarket.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "請輸入使用者名稱")
    @Size(min = 3, max = 32, message = "使用者名稱長度需為 3–32 字元")
    String username,

    @NotBlank(message = "請輸入 Email")
    @Email(message = "Email 格式不正確")
    @Size(max = 128, message = "Email 長度不可超過 128 字元")
    String email,

    @NotBlank(message = "請輸入密碼")
    @Size(min = 6, max = 128, message = "密碼長度需為 6–128 字元")
    String password
) {}
