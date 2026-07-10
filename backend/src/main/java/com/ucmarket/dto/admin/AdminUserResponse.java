package com.ucmarket.dto.admin;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;

public record AdminUserResponse(
    UUID id,
    String code,
    String username,
    String email,
    UserRole role,
    UserStatus status,
    Integer reputation,
    LocalDateTime lastLoginAt,
    String avatarUrl,
    String bio,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static AdminUserResponse from(User u) {
        return new AdminUserResponse(
            u.getId(), u.getCode(), u.getUsername(), u.getEmail(),
            u.getRole(), u.getStatus(), u.getReputation(),
            u.getLastLoginAt(), u.getAvatarUrl(), u.getBio(),
            u.getCreatedAt(), u.getUpdatedAt()
        );
    }
}
