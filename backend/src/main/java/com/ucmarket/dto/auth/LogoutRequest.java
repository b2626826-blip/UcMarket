package com.ucmarket.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(
    @NotBlank(message = "缺少重新整理權杖")
    String refreshToken
) {}
