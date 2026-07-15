package com.ucmarket.notification;

import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private final NotificationJobRepository notificationJobRepository;

    public NotificationService(NotificationJobRepository notificationJobRepository) {
        this.notificationJobRepository = notificationJobRepository;
    }

    public void enqueue(
            NotificationEventType eventType,
            UUID recipientUserId,
            String recipientEmail,
            UUID marketId,
            String payload,
            String idempotencyKey) {
    }
}
