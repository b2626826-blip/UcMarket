package com.ucmarket.dto.auth;

import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long expiresIn,
    UserInfo user
) {
    public record UserInfo(UUID id, String username, String email, String role, String status, int reputation, String avatarUrl, String bio) {}
}
