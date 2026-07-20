package com.ucmarket.dto.admin;

import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJob;
import com.ucmarket.notification.NotificationJobStatus;

public record AdminNotificationResponse(
        UUID id,
        NotificationEventType eventType,
        String recipient,
        NotificationJobStatus status,
        int attemptCount,
        LocalDateTime nextAttemptAt,
        LocalDateTime lockedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime sentAt,
        String lastError) {

    public static AdminNotificationResponse from(NotificationJob job) {
        return new AdminNotificationResponse(
                job.getId(),
                job.getEventType(),
                job.getRecipientEmail(),
                job.getStatus(),
                job.getAttemptCount(),
                job.getNextAttemptAt(),
                job.getLockedAt(),
                job.getCreatedAt(),
                job.getUpdatedAt(),
                job.getSentAt(),
                job.getLastError());
    }
}
