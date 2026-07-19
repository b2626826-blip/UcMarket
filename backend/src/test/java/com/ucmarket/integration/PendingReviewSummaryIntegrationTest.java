package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDate;
import java.util.HashSet;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.service.PendingReviewSummaryService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class PendingReviewSummaryIntegrationTest {

    private static final LocalDate SUMMARY_DATE = LocalDate.of(2026, 7, 17);
    private static final String EVENT_TYPE = "DAILY_PENDING_REVIEW_SUMMARY";

    @Autowired
    private PendingReviewSummaryService pendingReviewSummaryService;

    @Autowired
    private NotificationJobRepository notificationJobRepository;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void cleanup() {
        jdbc.update("""
                DELETE FROM notification_job_attempts
                WHERE job_id IN (
                    SELECT id FROM notification_jobs WHERE event_type = ?
                )
                """, EVENT_TYPE);
        jdbc.update("DELETE FROM notification_jobs WHERE event_type = ?", EVENT_TYPE);
    }

    @Test
    void enqueueDailyPendingReviewSummary_sameDateTwice_createsOneJobPerActiveAdmin() {
        NotificationEventType eventType =
                NotificationEventType.DAILY_PENDING_REVIEW_SUMMARY;
        int activeAdminCount = userRepository
                .findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE)
                .size();
        int pendingCount = marketRepository
                .findByStatus(com.ucmarket.entity.MarketStatus.PENDING)
                .size();

        pendingReviewSummaryService.enqueueDailyPendingReviewSummary(SUMMARY_DATE);
        pendingReviewSummaryService.enqueueDailyPendingReviewSummary(SUMMARY_DATE);

        var jobs = notificationJobRepository.findAll().stream()
                .filter(job -> job.getEventType() == eventType)
                .toList();

        assertEquals(activeAdminCount, jobs.size());
        assertEquals(
                activeAdminCount,
                new HashSet<>(jobs.stream()
                        .map(job -> job.getRecipientUserId())
                        .toList())
                        .size());

        for (var job : jobs) {
            assertNull(job.getMarketId());
            assertEquals(
                    "pending-review-summary:%s:admin:%s".formatted(
                            SUMMARY_DATE, job.getRecipientUserId()),
                    job.getIdempotencyKey());
            assertEquals(
                    """
                            Pending review summary for 2026-07-17: %s market(s) awaiting review.
                            - Pending market""".formatted(pendingCount),
                    emailTemplateService.render(job.getEventType(), job.getPayload()).body());
        }
    }
}
