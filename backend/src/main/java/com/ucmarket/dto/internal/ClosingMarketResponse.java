package com.ucmarket.dto.internal;

import java.time.LocalDateTime;
import java.util.UUID;

// GET /api/internal/notifications/closing-markets 回傳單筆——契約見《n8n關卡執行spec》§3.2
public record ClosingMarketResponse(
        UUID marketId,
        String title,
        LocalDateTime closeAt,
        String creatorName) {
}
