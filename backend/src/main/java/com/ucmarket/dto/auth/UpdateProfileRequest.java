package com.ucmarket.dto.auth;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 3, max = 32) String username,
    String avatarUrl,
    String bio
) {}
