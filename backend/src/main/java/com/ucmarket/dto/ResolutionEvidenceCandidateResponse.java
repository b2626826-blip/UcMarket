package com.ucmarket.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.entity.Market;

public record ResolutionEvidenceCandidateResponse(
        UUID marketId,
        String title,
        String sourceUrl,
        String resolutionRule,
        LocalDateTime closeAt) {

    public static ResolutionEvidenceCandidateResponse from(Market market) {
        return new ResolutionEvidenceCandidateResponse(
                market.getId(),
                market.getTitle(),
                market.getSourceUrl(),
                market.getResolutionRule(),
                market.getCloseAt());
    }
}
