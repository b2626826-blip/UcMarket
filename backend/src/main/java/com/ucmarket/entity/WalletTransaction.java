package com.ucmarket.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "wallet_id", nullable = false)
	private UUID walletId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private WalletTransactionType type;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;

	@Column(name = "balance_after", nullable = false, precision = 18, scale = 2)
	private BigDecimal balanceAfter;

	@Column(name = "reference_type")
	private String referenceType;

	@Column(name = "reference_id")
	private UUID referenceId;

	@Column(name = "idempotency_key")
	private String idempotencyKey;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	protected WalletTransaction() {
	}

	public WalletTransaction(
			UUID walletId,
			WalletTransactionType type,
			BigDecimal amount,
			BigDecimal balanceAfter,
			String referenceType,
			UUID referenceId,
			String idempotencyKey
	) {
		this.walletId = walletId;
		this.type = type;
		this.amount = amount;
		this.balanceAfter = balanceAfter;
		this.referenceType = referenceType;
		this.referenceId = referenceId;
		this.idempotencyKey = idempotencyKey;
	}

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public UUID getWalletId() {
		return walletId;
	}

	public WalletTransactionType getType() {
		return type;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public BigDecimal getBalanceAfter() {
		return balanceAfter;
	}

	public String getReferenceType() {
		return referenceType;
	}

	public UUID getReferenceId() {
		return referenceId;
	}

	public String getIdempotencyKey() {
		return idempotencyKey;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}
}