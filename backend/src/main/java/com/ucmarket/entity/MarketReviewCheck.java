package com.ucmarket.entity;

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
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "market_review_checks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_market_review_checks_submission_rule",
                columnNames = {"market_id", "submission_version", "rule_code", "rule_version"}))
public class MarketReviewCheck {

    public enum CheckStatus {
        PASS, NEEDS_REVIEW, BLOCKED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "market_id", nullable = false)
    private UUID marketId;

    @Column(name = "submission_version", nullable = false)
    private int submissionVersion;

    @Column(name = "rule_code", nullable = false, length = 64)
    private String ruleCode;

    @Column(name = "rule_version", nullable = false)
    private int ruleVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CheckStatus status;

    @Column(nullable = false, columnDefinition = "text")
    private String reason;

    @Column(name = "executed_at", nullable = false)
    private LocalDateTime executedAt;

    protected MarketReviewCheck() {
    }

    public MarketReviewCheck(
            UUID marketId,
            int submissionVersion,
            String ruleCode,
            int ruleVersion,
            CheckStatus status,
            String reason,
            LocalDateTime executedAt) {
        this.marketId = marketId;
        this.submissionVersion = submissionVersion;
        this.ruleCode = ruleCode;
        this.ruleVersion = ruleVersion;
        this.status = status;
        this.reason = reason;
        this.executedAt = executedAt;
    }

    @PrePersist
    void onCreate() {
        if (executedAt == null) {
            executedAt = LocalDateTime.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getMarketId() {
        return marketId;
    }

    public int getSubmissionVersion() {
        return submissionVersion;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public int getRuleVersion() {
        return ruleVersion;
    }

    public CheckStatus getStatus() {
        return status;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getExecutedAt() {
        return executedAt;
    }
}
