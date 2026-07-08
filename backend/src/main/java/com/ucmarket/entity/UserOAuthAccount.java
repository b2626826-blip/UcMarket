package com.ucmarket.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_oauth_accounts")
public class UserOAuthAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "provider_uid", nullable = false, length = 128)
    private String providerUid;

    @Column(length = 128)
    private String email;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected UserOAuthAccount() {
    }

    public UserOAuthAccount(UUID userId, String provider, String providerUid, String email) {
        this.userId = userId;
        this.provider = provider;
        this.providerUid = providerUid;
        this.email = email;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderUid() {
        return providerUid;
    }

    public String getEmail() {
        return email;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
