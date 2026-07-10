package com.ucmarket.dto;

import java.time.LocalDateTime;

public record UpdateMarketRequest(
    String title,
    String description,
    String category,
    String marketType,
    String sourceUrl,
    String resolutionRule,
    LocalDateTime closeAt
) {}
