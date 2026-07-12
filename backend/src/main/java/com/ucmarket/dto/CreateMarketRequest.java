package com.ucmarket.dto;

import java.time.LocalDateTime;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMarketRequest(
	@NotBlank String title,
	String description,
	String category,
	String marketType,
	@URL(regexp = "^$|(?i:https?)://.+$", message = "sourceUrl must be a valid HTTP(S) URL") String sourceUrl,
	String resolutionRule,
	@NotNull LocalDateTime closeAt,
	@URL(regexp = "^$|(?i:https?)://.+$", message = "imageUrl must be a valid HTTP(S) URL") String imageUrl
) {
	public CreateMarketRequest(
			String title,
			String description,
			String category,
			String marketType,
			String sourceUrl,
			String resolutionRule,
			LocalDateTime closeAt) {
		this(title, description, category, marketType, sourceUrl, resolutionRule, closeAt, null);
	}
}
