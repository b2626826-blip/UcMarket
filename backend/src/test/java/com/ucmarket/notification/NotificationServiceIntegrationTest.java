package com.ucmarket.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(NotificationService.class)
class NotificationServiceIntegrationTest {
    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationJobRepository notificationJobRepository;

    @Test
    void enqueue_withSameIdempotencyKey_createsOneJob() {
        UUID recipientUserId = UUID.randomUUID();
        UUID marketId = UUID.randomUUID();
        String idempotencyKey = "market:%s:submission:1:%s:user:%s".formatted(
                marketId, NotificationEventType.MARKET_SUBMITTED, recipientUserId);
        notificationService.enqueue(
                NotificationEventType.MARKET_SUBMITTED,
                recipientUserId,
                "owner@example.com",
                marketId,
                "{}",
                idempotencyKey);
        notificationService.enqueue(
                NotificationEventType.MARKET_SUBMITTED,
                recipientUserId,
                "owner@example.com",
                marketId,
                "{}",
                idempotencyKey);
        assertEquals(1, notificationJobRepository.count());
    }
}
