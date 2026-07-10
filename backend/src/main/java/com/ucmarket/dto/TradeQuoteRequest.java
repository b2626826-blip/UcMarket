package com.ucmarket.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import com.ucmarket.entity.MarketSide;

public record TradeQuoteRequest(
		@NotNull
		MarketSide side,

		@NotNull
		@Positive
		BigDecimal amount
	) {
	}