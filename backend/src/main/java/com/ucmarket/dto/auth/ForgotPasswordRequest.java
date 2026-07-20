package com.ucmarket.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
		@NotBlank(message = "請輸入 Email")
		@Email(message = "Email 格式不正確")
		String email
) {
}
