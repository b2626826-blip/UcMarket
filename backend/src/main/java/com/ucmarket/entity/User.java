package com.ucmarket.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.util.CodeGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(length = 32)
	private String code;

	@Column(nullable = false, length = 32, unique = true)
	private String username;

	@Column(nullable = false, length = 128, unique = true)
	private String email;

    // DB 欄位為 password_hash，Java 屬性採用 camelCase 命名。
    // OAuth 使用者無密碼，因此允許 null。
    @Column(name = "password_hash", length = 128)
    private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private UserRole role = UserRole.USER;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private UserStatus status = UserStatus.ACTIVE;

	@Column(nullable = false)
	private Integer reputation = 0;

	@Column(name = "last_login_at")
	private LocalDateTime lastLoginAt;

	@Column(name = "avatar_url", columnDefinition = "text")
	private String avatarUrl;

	@Column(columnDefinition = "text")
	private String bio;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	protected User() {
	}

	public User(String username, String email, String passwordHash) {
		this.username = username;
		this.email = email;
		this.passwordHash = passwordHash;
	}

	@PrePersist
	void onCreate() {
		if (code == null && CodeGenerator.isReady()) {
			code = CodeGenerator.next("USR", "seq_user_code");
		}
		LocalDateTime now = LocalDateTime.now();
		if (createdAt == null) {
			createdAt = now;
		}
		updatedAt = now;
		if (role == null) {
			role = UserRole.USER;
		}
		if (status == null) {
			status = UserStatus.ACTIVE;
		}
		if (reputation == null) {
			reputation = 0;
		}
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = LocalDateTime.now();
	}

	public UUID getId() {
		return id;
	}

	public String getCode() {
		return code;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public UserRole getRole() {
		return role;
	}

	public UserStatus getStatus() {
		return status;
	}

	public Integer getReputation() {
		return reputation;
	}

	public LocalDateTime getLastLoginAt() {
		return lastLoginAt;
	}

	public String getAvatarUrl() {
		return avatarUrl;
	}

	public String getBio() {
		return bio;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void recordLogin(LocalDateTime loginAt) {
		this.lastLoginAt = loginAt;
	}

	public void changeRole(UserRole role) {
		this.role = role;
	}

	public void changeStatus(UserStatus status) {
		this.status = status;
	}

	public void updateProfile(String avatarUrl, String bio) {
		this.avatarUrl = avatarUrl;
		this.bio = bio;
	}
}
