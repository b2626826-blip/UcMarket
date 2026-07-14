package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RankingAssetsResponse(
		UUID userId,
		String username,
		String account,
		String primaryMarket,
		String avatarUrl,
		BigDecimal walletBalance,
		BigDecimal openPositionValue,
		BigDecimal totalAssetValue
) {
}
