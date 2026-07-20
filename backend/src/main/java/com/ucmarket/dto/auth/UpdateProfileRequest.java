package com.ucmarket.dto.auth;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 3, max = 32, message = "使用者名稱長度需為 3–32 字元")
    String username,
    String avatarUrl,
    String bio
) {}
