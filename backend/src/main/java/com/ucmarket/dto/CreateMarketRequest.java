package com.ucmarket.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMarketRequest(
	@NotBlank String title,
	String description,
	String category,
	String marketType,
	String sourceUrl,
	String resolutionRule,
	@NotNull LocalDateTime closeAt
) {
}
