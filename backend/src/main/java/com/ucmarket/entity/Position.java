package com.ucmarket.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(
        name = "positions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_positions_user_market",
                        columnNames = {"user_id", "market_id"}
                )
        }
)
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

    public Position() {
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void settle() {
        this.status = PositionStatus.SETTLED;
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = PositionStatus.CANCELED;
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getMarketId() {
        return marketId;
    }

    public void setMarketId(UUID marketId) {
        this.marketId = marketId;
    }

    public BigDecimal getYesShares() {
        return yesShares;
    }

    public void setYesShares(BigDecimal yesShares) {
        this.yesShares = yesShares;
    }

    public BigDecimal getNoShares() {
        return noShares;
    }

    public void setNoShares(BigDecimal noShares) {
        this.noShares = noShares;
    }

    public BigDecimal getYesCost() {
        return yesCost;
    }

    public void setYesCost(BigDecimal yesCost) {
        this.yesCost = yesCost;
    }

    public BigDecimal getNoCost() {
        return noCost;
    }

    public void setNoCost(BigDecimal noCost) {
        this.noCost = noCost;
    }

    public PositionStatus getStatus() {
        return status;
    }

    public void setStatus(PositionStatus status) {
        this.status = status;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
