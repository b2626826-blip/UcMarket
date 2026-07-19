package com.ucmarket.dto.internal;

import java.math.BigDecimal;
import java.time.LocalDate;

// GET /api/internal/notifications/digest 回傳——欄位契約見《n8n關卡執行spec》§3.1
public record DigestResponse(
        LocalDate date,
        long newMarketCount,
        long pendingReviewCount,
        long tradeCount,
        BigDecimal tradeVolume) {
}
