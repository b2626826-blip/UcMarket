package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RankingWinRateResponse(
		UUID userId,
		String username,
		String account,
		String primaryMarket,
		String avatarUrl,
		Long resolvedMarketCount,
		Long correctCount,
		BigDecimal winRate
) {
}
