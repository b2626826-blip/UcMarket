package com.ucmarket.dto;

import java.math.BigDecimal;

public record TradeQuoteResponse(
		BigDecimal odds,
		BigDecimal amount
	) {
	}
