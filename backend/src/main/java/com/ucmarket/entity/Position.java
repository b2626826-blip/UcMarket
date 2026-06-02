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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "positions")
public class Position {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "market_id", nullable = false)
	private UUID marketId;

	@Column(name = "yes_shares", nullable = false)
	private BigDecimal yesShares = BigDecimal.ZERO;

	@Column(name = "no_shares", nullable = false)
	private BigDecimal noShares = BigDecimal.ZERO;

	@Column(name = "yes_cost", nullable = false)
	private BigDecimal yesCost = BigDecimal.ZERO;

	@Column(name = "no_cost", nullable = false)
	private BigDecimal noCost = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private PositionStatus status = PositionStatus.OPEN;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt = LocalDateTime.now();

	protected Position() {
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

	public UUID getMarketId() {
		return marketId;
	}

	public BigDecimal getYesShares() {
		return yesShares;
	}

	public BigDecimal getNoShares() {
		return noShares;
	}

	public BigDecimal getYesCost() {
		return yesCost;
	}

	public BigDecimal getNoCost() {
		return noCost;
	}

	public PositionStatus getStatus() {
		return status;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void settle() {
		this.status = PositionStatus.SETTLED;
		this.updatedAt = LocalDateTime.now();
	}
}