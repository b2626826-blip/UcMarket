package com.ucmarket.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record FirebaseLoginRequest(
        @NotBlank String idToken,
        @NotBlank String provider
) {
}
