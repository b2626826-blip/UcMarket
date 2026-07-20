package com.ucmarket.dto;

import java.time.Instant;
import java.util.UUID;

import com.ucmarket.entity.MarketResolutionEvidence;

public record ResolutionEvidenceResponse(
        UUID id,
        UUID marketId,
        String sourceUrl,
        String sourceTitle,
        Instant publishedAt,
        Instant fetchedAt,
        Instant createdAt) {

    public static ResolutionEvidenceResponse from(MarketResolutionEvidence evidence) {
        return new ResolutionEvidenceResponse(
                evidence.getId(),
                evidence.getMarketId(),
                evidence.getSourceUrl(),
                evidence.getSourceTitle(),
                evidence.getPublishedAt(),
                evidence.getFetchedAt(),
                evidence.getCreatedAt());
    }
}
