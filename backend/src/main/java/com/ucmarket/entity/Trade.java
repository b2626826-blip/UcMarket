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
@Table(name = "trades")
public class Trade {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "market_id", nullable = false)
	private UUID marketId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private MarketSide side;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private TradeAction action;

	@Column(nullable = false)
	private BigDecimal amount;

	@Column(nullable = false)
	private BigDecimal price;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	protected Trade() {
	}

	public Trade(UUID marketId, MarketSide side, TradeAction action, BigDecimal amount, BigDecimal price) {
		this.marketId = marketId;
		this.side = side;
		this.action = action;
		this.amount = amount;
		this.price = price;
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

	public UUID getMarketId() {
		return marketId;
	}

	public MarketSide getSide() {
		return side;
	}

	public TradeAction getAction() {
		return action;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public BigDecimal getPrice() {
		return price;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}
}