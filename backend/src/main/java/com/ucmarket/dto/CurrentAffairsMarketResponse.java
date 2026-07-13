package com.ucmarket.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;

public record CurrentAffairsMarketResponse(
		UUID id,
		String code,
		String title,
		String description,
		String category,
		String sourceUrl,
		String imageUrl,
		String resolutionRule,
		LocalDateTime closeAt,
		MarketStatus status,
		BigDecimal yesPool,
		BigDecimal noPool,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		BigDecimal volume) {

	public static CurrentAffairsMarketResponse from(Market market, BigDecimal volume) {
		return new CurrentAffairsMarketResponse(
				market.getId(), market.getCode(), market.getTitle(), market.getDescription(),
				market.getCategory(), market.getSourceUrl(), market.getImageUrl(), market.getResolutionRule(), market.getCloseAt(),
				market.getStatus(), market.getYesPool(), market.getNoPool(), market.getCreatedAt(),
				market.getUpdatedAt(), volume);
	}
}
