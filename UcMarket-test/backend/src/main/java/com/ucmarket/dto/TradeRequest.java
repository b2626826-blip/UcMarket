package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.ucmarket.entity.MarketSide;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TradeRequest(
		@NotNull
		UUID marketId,

		@NotNull
		MarketSide side,

		@NotNull
		@Positive
		BigDecimal amount
	) {
	}
