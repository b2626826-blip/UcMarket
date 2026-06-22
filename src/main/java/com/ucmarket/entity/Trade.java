package com.ucmarket.entity;

import java.math.BigDecimal;
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
import jakarta.persistence.Table;

@Entity
@Table(name = "trades")
public class Trade {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(length = 32)
	private String code;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

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

	@Column()
	private BigDecimal price;
	
	@Column()
	private BigDecimal shares;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	protected Trade() {
	}

	public Trade(UUID userId, UUID marketId, MarketSide side, TradeAction action, BigDecimal amount, BigDecimal price, BigDecimal shares) {
		this.userId = userId;
		this.marketId = marketId;
		this.side = side;
		this.action = action;
		this.amount = amount;
		this.price = price;
		this.shares = shares;
	}

	@PrePersist
	void onCreate() {
		if (code == null && CodeGenerator.isReady()) {
			code = CodeGenerator.next("TRX", "seq_trade_code");
		}
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public String getCode() {
		return code;
	}

	public UUID getUserId() {
		return userId;
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
	
	public BigDecimal getShares() {
		return shares;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	@jakarta.persistence.Transient
	private String userCode;

	@jakarta.persistence.Transient
	private String marketCode;

	public String getUserCode() { return userCode; }
	public void setUserCode(String userCode) { this.userCode = userCode; }
	public String getMarketCode() { return marketCode; }
	public void setMarketCode(String marketCode) { this.marketCode = marketCode; }
}