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
		String sourceUrl,
		String imageUrl,
		String resolutionRule,
		String marketType,
		UUID creatorId,
		String creatorCode,
		LocalDateTime closeAt,
		MarketStatus status,
		MarketResult result,
		BigDecimal resultValue,
		LocalDateTime approvedAt,
		UUID approvedBy,
		LocalDateTime resolvedAt,
		UUID resolvedBy,
		BigDecimal yesPool,
		BigDecimal noPool,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		BigDecimal volume) {

	public static MarketResponse from(Market market, BigDecimal volume) {
		return new MarketResponse(
				market.getId(), market.getCode(), market.getTitle(), market.getDescription(),
				market.getCategory(), market.getSourceUrl(), market.getImageUrl(), market.getResolutionRule(),
				market.getMarketType(), market.getCreatorId(), market.getCreatorCode(), market.getCloseAt(),
				market.getStatus(), market.getResult(), market.getResultValue(), market.getApprovedAt(),
				market.getApprovedBy(), market.getResolvedAt(), market.getResolvedBy(), market.getYesPool(),
				market.getNoPool(), market.getCreatedAt(), market.getUpdatedAt(), volume);
	}
}
