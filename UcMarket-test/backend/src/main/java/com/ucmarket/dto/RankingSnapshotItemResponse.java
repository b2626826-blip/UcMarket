package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RankingSnapshotItemResponse(
		Long rank,
		UUID userId,
		String username,
		String account,
		String primaryMarket,
		String avatarUrl,
		BigDecimal realizedProfit,
		BigDecimal winRate,
		Long resolvedMarketCount,
		BigDecimal totalAssetValue
) {
}
