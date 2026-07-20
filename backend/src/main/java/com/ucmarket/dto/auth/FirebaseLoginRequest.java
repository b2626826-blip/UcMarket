package com.ucmarket.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record FirebaseLoginRequest(
        @NotBlank(message = "缺少登入憑證")
        String idToken,

        @NotBlank(message = "請指定登入方式")
        String provider
) {
}
