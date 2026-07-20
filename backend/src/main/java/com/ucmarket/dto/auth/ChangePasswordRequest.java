package com.ucmarket.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    @NotBlank(message = "請輸入目前密碼")
    String oldPassword,

    @NotBlank(message = "請輸入新密碼")
    @Size(min = 6, max = 128, message = "新密碼長度需為 6–128 字元")
    String newPassword
) {}
