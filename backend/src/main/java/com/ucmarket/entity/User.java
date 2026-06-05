package com.ucmarket.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true, length = 32)
	private String username;

	@Column(name = "avatar_url", columnDefinition = "text")
	private String avatarUrl;

	protected User() {
	}

	public UUID getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public String getAvatarUrl() {
		return avatarUrl;
	}
}