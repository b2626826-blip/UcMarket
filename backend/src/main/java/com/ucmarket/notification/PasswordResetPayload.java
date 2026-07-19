package com.ucmarket.notification;

public record PasswordResetPayload(String resetUrl, String username, int expiresInMinutes) {
}
