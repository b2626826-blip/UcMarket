package com.ucmarket.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "market_resolution_evidence",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_market_resolution_evidence_market_source",
                columnNames = { "market_id", "source_url" }),
        indexes = @Index(
                name = "idx_market_resolution_evidence_market_created",
                columnList = "market_id, created_at"))
public class MarketResolutionEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "market_id", nullable = false)
    private UUID marketId;

    @Column(name = "source_url", nullable = false, length = 2048)
    private String sourceUrl;

    @Column(name = "source_title", nullable = false, length = 500)
    private String sourceTitle;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MarketResolutionEvidence() {
    }

    public MarketResolutionEvidence(
            UUID marketId,
            String sourceUrl,
            String sourceTitle,
            Instant publishedAt) {
        this.marketId = marketId;
        this.sourceUrl = sourceUrl;
        this.sourceTitle = sourceTitle;
        this.publishedAt = publishedAt;
        Instant now = Instant.now();
        this.fetchedAt = now;
        this.createdAt = now;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (fetchedAt == null) fetchedAt = now;
        if (createdAt == null) createdAt = now;
    }

    public UUID getId() { return id; }
    public UUID getMarketId() { return marketId; }
    public String getSourceUrl() { return sourceUrl; }
    public String getSourceTitle() { return sourceTitle; }
    public Instant getPublishedAt() { return publishedAt; }
    public Instant getFetchedAt() { return fetchedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
