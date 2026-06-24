package com.ucmarket.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "trades")
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "market_id", nullable = false)
    private UUID marketId;

    @Column(name = "option_id")
    private UUID optionId;

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

    @Column(nullable = false)
    private BigDecimal shares;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Trade() {
    }

    public Trade(
            UUID userId,
            UUID marketId,
            UUID optionId,
            MarketSide side,
            TradeAction action,
            BigDecimal amount,
            BigDecimal price,
            BigDecimal shares
    ) {
        this.userId = userId;
        this.marketId = marketId;
        this.optionId = optionId;
        this.side = side;
        this.action = action;
        this.amount = amount;
        this.price = price;
        this.shares = shares;
        this.createdAt = LocalDateTime.now();
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

    public UUID getOptionId() {
        return optionId;
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
}