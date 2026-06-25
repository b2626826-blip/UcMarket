package com.ucmarket.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.exception.InsufficientFundsException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "wallets")
public class Wallet {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "user_id", nullable = false, unique = true)
	private UUID userId;

	@Column(nullable = false)
	private BigDecimal balance = BigDecimal.ZERO;

	@Column(name = "locked_balance", nullable = false)
	private BigDecimal lockedBalance = BigDecimal.ZERO;

	@Column(nullable = false)
	private Integer version = 0;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt = LocalDateTime.now();

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt = LocalDateTime.now();

	public Wallet() {
	}

	// Harry：建錢包用（createWalletForUser）
	public Wallet(UUID userId) {
		this.userId = userId;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = LocalDateTime.now();
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public BigDecimal getBalance() {
		return balance;
	}

	public BigDecimal getLockedBalance() {
		return lockedBalance;
	}

	public Integer getVersion() {
		return version;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	// eagle 派彩用（保留，共存）
	public void addBalance(BigDecimal amount) {
		this.balance = this.balance.add(amount);
		this.version = this.version + 1;
		this.updatedAt = LocalDateTime.now();
	}

	// === Harry：credit/debit 的記憶體入口（與 addBalance 並存）===
	public void applyCredit(BigDecimal amount) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("credit 金額必須為正數: " + amount);
		}
		this.balance = this.balance.add(amount);
	}

	public void applyDebit(BigDecimal amount) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("debit 金額必須為正數: " + amount);
		}
		if (balance.compareTo(amount) < 0) {
			throw new InsufficientFundsException(userId, amount, balance);
		}
		this.balance = this.balance.subtract(amount);
	}
}
