package com.ucmarket.dto;

import java.time.LocalDateTime;

import org.hibernate.validator.constraints.URL;

public record UpdateMarketRequest(
    String title,
    String description,
    String category,
    String marketType,
    @URL(regexp = "^$|(?i:https?)://.+$", message = "sourceUrl must be a valid HTTP(S) URL") String sourceUrl,
    String resolutionRule,
    LocalDateTime closeAt,
    @URL(regexp = "^$|(?i:https?)://.+$", message = "imageUrl must be a valid HTTP(S) URL") String imageUrl
) {}
