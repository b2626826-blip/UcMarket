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
@Table(name = "markets")
public class Market {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    private String category;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "resolution_rule", columnDefinition = "text")
    private String resolutionRule;

    @Column(name = "close_at")
    private LocalDateTime closeAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarketStatus status = MarketStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private MarketResult result;

    @Column(name = "yes_pool", nullable = false)
    private BigDecimal yesPool = BigDecimal.valueOf(100);

    @Column(name = "no_pool", nullable = false)
    private BigDecimal noPool = BigDecimal.valueOf(100);

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected Market() {
    }

    public Market(
            String title,
            String description,
            String category,
            String sourceUrl,
            String resolutionRule,
            LocalDateTime closeAt
    ) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.sourceUrl = sourceUrl;
        this.resolutionRule = resolutionRule;
        this.closeAt = closeAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // ======================
    // Getter
    // ======================

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public String getResolutionRule() {
        return resolutionRule;
    }

    public LocalDateTime getCloseAt() {
        return closeAt;
    }

    public MarketStatus getStatus() {
        return status;
    }

    public MarketResult getResult() {
        return result;
    }

    public BigDecimal getYesPool() {
        return yesPool;
    }

    public BigDecimal getNoPool() {
        return noPool;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    // ======================
    // Setter
    // ======================

    public void setStatus(MarketStatus status) {
        this.status = status;
    }

    public void setResult(MarketResult result) {
        this.result = result;
    }

    // ======================
    // Market Flow
    // ======================

    public void approve() {
        this.status = MarketStatus.ACTIVE;
    }

    public void reject() {
        this.status = MarketStatus.REJECTED;
    }

    public void resolve(MarketResult result) {
        this.status = MarketStatus.RESOLVED;
        this.result = result;
    }

    public void cancel() {
        this.status = MarketStatus.CANCELED;
    }

    // ======================
    // Trading
    // ======================

    public void buy(MarketSide side, BigDecimal amount) {

        if (yesPool == null) {
            yesPool = BigDecimal.ZERO;
        }

        if (noPool == null) {
            noPool = BigDecimal.ZERO;
        }

        if (side == MarketSide.YES) {
            yesPool = yesPool.add(amount);
        } else {
            noPool = noPool.add(amount);
        }
    }
}