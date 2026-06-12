package com.ucmarket.entity;

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
@Table(name = "market_reviews")
public class MarketReview {

    public enum ReviewStatus {
        APPROVED, REJECTED, CHANGES_REQUESTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 32)
    private String code;

    @Column(name = "market_id", nullable = false)
    private UUID marketId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ReviewStatus status;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected MarketReview() {}

    public MarketReview(UUID marketId, UUID reviewerId, ReviewStatus status, String comment) {
        this.marketId = marketId;
        this.reviewerId = reviewerId;
        this.status = status;
        this.comment = comment;
    }

    @PrePersist
    void onCreate() {
        if (code == null && CodeGenerator.isReady()) {
            code = CodeGenerator.next("REV", "seq_market_review_code");
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public UUID getMarketId() { return marketId; }
    public UUID getReviewerId() { return reviewerId; }
    public ReviewStatus getStatus() { return status; }
    public String getComment() { return comment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
