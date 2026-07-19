package com.ucmarket.dto.internal;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// GET /api/internal/notifications/failed 回傳——05 FAILED 告警的資料源。
// 走 internal 面（service token）而非 admin 面（admin JWT）：n8n 不用養機器帳號，
// 也不用把 service token 的放行範圍擴進 /api/admin/**。
public record FailedNotificationsResponse(
        long count,
        List<FailedNotificationItem> recent) {

    public record FailedNotificationItem(
            UUID id,
            String eventType,
            String recipientEmail,
            String lastError,
            LocalDateTime updatedAt) {
    }
}
