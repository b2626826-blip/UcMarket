package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RankingProfitResponse(
		UUID userId,
		String username,
		String avatarUrl,
		BigDecimal totalPayout,
		BigDecimal settledCost,
		BigDecimal realizedProfit
) {
}