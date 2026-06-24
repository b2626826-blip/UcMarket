package com.ucmarket.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;

public record PositionResponse(
        UUID id,
        UUID userId,
        UUID marketId,
        BigDecimal yesShares,
        BigDecimal noShares,
        BigDecimal yesCost,
        BigDecimal noCost,
        PositionStatus status,
        LocalDateTime updatedAt
) {
    public static PositionResponse from(Position position) {
        return new PositionResponse(
                position.getId(),
                position.getUserId(),
                position.getMarketId(),
                position.getYesShares(),
                position.getNoShares(),
                position.getYesCost(),
                position.getNoCost(),
                position.getStatus(),
                position.getUpdatedAt()
        );
    }
}