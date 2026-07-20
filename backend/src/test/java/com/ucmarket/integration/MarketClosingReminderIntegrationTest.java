package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.service.MarketClosingReminderService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MarketClosingReminderIntegrationTest {

    private static final UUID MARKET_ID =
            UUID.fromString("00000000-0000-4003-8000-000000000008");
    private static final UUID ACTIVE_USER_ONE =
            UUID.fromString("00000000-0000-4000-8000-000000000003");
    private static final UUID ACTIVE_USER_TWO =
            UUID.fromString("00000000-0000-4000-8000-000000000004");
    private static final UUID BANNED_USER =
            UUID.fromString("00000000-0000-4000-8000-000000000008");
    private static final LocalDateTime NOW =
            LocalDateTime.of(2026, 7, 17, 12, 0);
    private static final LocalDateTime CLOSE_AT = NOW.plusHours(24);
    private static final String EVENT_TYPE = "MARKET_CLOSING_REMINDER";

    @Autowired
    private MarketClosingReminderService marketClosingReminderService;

    @Autowired
    private NotificationJobRepository notificationJobRepository;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc.update(
                "UPDATE markets SET close_at = ? WHERE id = ?",
                Timestamp.valueOf(CLOSE_AT),
                MARKET_ID);
        insertPosition("00000000-0000-4010-8000-000000000001", ACTIVE_USER_ONE);
        insertPosition("00000000-0000-4010-8000-000000000002", ACTIVE_USER_TWO);
        insertPosition("00000000-0000-4010-8000-000000000003", BANNED_USER);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("""
                DELETE FROM notification_job_attempts
                WHERE job_id IN (
                    SELECT id FROM notification_jobs WHERE event_type = ?
                )
                """, EVENT_TYPE);
        jdbc.update("DELETE FROM notification_jobs WHERE event_type = ?", EVENT_TYPE);
        jdbc.update("DELETE FROM positions WHERE market_id = ?", MARKET_ID);
        jdbc.update(
                "UPDATE markets SET close_at = ? WHERE id = ?",
                Timestamp.valueOf(LocalDateTime.of(2026, 12, 31, 23, 59, 59)),
                MARKET_ID);
    }

    @Test
    void enqueueMarketClosingReminders_sameWindowTwice_createsOneJobPerActiveHolder() {
        marketClosingReminderService.enqueueMarketClosingReminders(NOW);
        marketClosingReminderService.enqueueMarketClosingReminders(NOW);

        var jobs = notificationJobRepository.findAll().stream()
                .filter(job -> job.getEventType()
                        == NotificationEventType.MARKET_CLOSING_REMINDER)
                .toList();

        assertEquals(2, jobs.size());
        assertEquals(
                new HashSet<>(java.util.List.of(ACTIVE_USER_ONE, ACTIVE_USER_TWO)),
                new HashSet<>(jobs.stream()
                        .map(job -> job.getRecipientUserId())
                        .toList()));
        for (var job : jobs) {
            assertEquals(MARKET_ID, job.getMarketId());
            assertEquals(
                    "market:%s:closing-reminder:%s:user:%s".formatted(
                            MARKET_ID, CLOSE_AT, job.getRecipientUserId()),
                    job.getIdempotencyKey());
            var email = emailTemplateService.render(job.getEventType(), job.getPayload());
            assertEquals("[UcMarket] Market closing soon", email.subject());
            assertTrue(email.body().contains("Active market 3"));
            assertTrue(email.body().contains("2026-07-18T12:00"));
        }
    }

    private void insertPosition(String id, UUID userId) {
        jdbc.update("""
                INSERT INTO positions (
                    id, user_id, market_id, yes_shares, no_shares,
                    yes_cost, no_cost, status, updated_at
                )
                VALUES (?, ?, ?, 1, 0, 1, 0, 'OPEN', CURRENT_TIMESTAMP)
                """, UUID.fromString(id), userId, MARKET_ID);
    }
}
