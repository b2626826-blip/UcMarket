package com.ucmarket.dto;

import java.time.LocalDateTime;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateMarketRequest(
	@NotBlank String title,
	String description,
	String category,
	String marketType,
	@URL(regexp = "^$|(?i:https?)://.+$", message = "sourceUrl must be a valid HTTP(S) URL") String sourceUrl,
	@URL(regexp = "^$|(?i:https?)://.+$", message = "imageUrl must be a valid HTTP(S) URL") String imageUrl,
	@Pattern(regexp = "^$|^[^<>]+$", message = "tradingViewSymbol must be a TradingView symbol, not embed HTML")
	String tradingViewSymbol,
	String resolutionRule,
	@NotNull LocalDateTime closeAt
) {
}
