package com.ucmarket.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;

public record MarketResponse(
		UUID id,
		String code,
		String title,
		String description,
		String category,
		String marketType,
		String sourceUrl,
		String resolutionRule,
		UUID creatorId,
		String creatorCode,
		LocalDateTime closeAt,
		MarketStatus status,
		MarketResult result,
		BigDecimal resultValue,
		BigDecimal yesPool,
		BigDecimal noPool,
		LocalDateTime approvedAt,
		UUID approvedBy,
		LocalDateTime resolvedAt,
		UUID resolvedBy,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
) {

	public static MarketResponse from(Market market) {
		return from(market, null);
	}

	public static MarketResponse from(Market market, String creatorCode) {
		return new MarketResponse(
				market.getId(),
				market.getCode(),
				market.getTitle(),
				market.getDescription(),
				market.getCategory(),
				market.getMarketType(),
				market.getSourceUrl(),
				market.getResolutionRule(),
				market.getCreatorId(),
				creatorCode,
				market.getCloseAt(),
				market.getStatus(),
				market.getResult(),
				market.getResultValue(),
				market.getYesPool(),
				market.getNoPool(),
				market.getApprovedAt(),
				market.getApprovedBy(),
				market.getResolvedAt(),
				market.getResolvedBy(),
				market.getCreatedAt(),
				market.getUpdatedAt()
		);
	}
}
