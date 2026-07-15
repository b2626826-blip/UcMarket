package com.ucmarket.notification;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationJobRepository notificationJobRepository;

    public NotificationService(NotificationJobRepository notificationJobRepository) {
        this.notificationJobRepository = notificationJobRepository;
    }

    @Transactional
    public void enqueue(
            NotificationEventType eventType,
            UUID recipientUserId,
            String recipientEmail,
            UUID marketId,
            String payload,
            String idempotencyKey) {
        notificationJobRepository.insertIfAbsent(
                UUID.randomUUID(),
                eventType.name(),
                recipientUserId,
                recipientEmail,
                marketId,
                payload,
                idempotencyKey);
    }
}
