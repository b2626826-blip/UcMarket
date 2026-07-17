package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.service.MarketService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MarketChangesRequestedNotificationIntegrationTest {

    private static final UUID MARKET_ID =
            UUID.fromString("00000000-0000-4003-8000-000000000002");
    private static final UUID CREATOR_ID =
            UUID.fromString("00000000-0000-4000-8000-000000000004");
    private static final UUID ADMIN_ID =
            UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final int SUBMISSION_VERSION = 5;
    private static final String COMMENT = "Need more sources";

    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private NotificationJobRepository notificationJobRepository;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @MockitoSpyBean
    private NotificationService notificationService;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        deleteChangesRequestedArtifacts();
        jdbc.update("""
                UPDATE markets
                SET status = 'PENDING',
                    submission_version = ?,
                    approved_at = null,
                    approved_by = null
                WHERE id = ?
                """, SUBMISSION_VERSION, MARKET_ID);
    }

    @AfterEach
    void cleanup() {
        deleteChangesRequestedArtifacts();
        jdbc.update("""
                UPDATE markets
                SET status = 'PENDING',
                    submission_version = 0,
                    approved_at = null,
                    approved_by = null
                WHERE id = ?
                """, MARKET_ID);
    }

    @Test
    void requestChanges_createsOneCreatorJob_andRepeatedCallCreatesNoDuplicate() {
        NotificationEventType eventType =
                NotificationEventType.MARKET_CHANGES_REQUESTED;

        Market draft = marketService.requestChanges(MARKET_ID, ADMIN_ID, COMMENT);

        assertEquals(MarketStatus.DRAFT, draft.getStatus());
        assertThrows(
                IllegalStateException.class,
                () -> marketService.requestChanges(MARKET_ID, ADMIN_ID, COMMENT));

        var jobs = notificationJobRepository.findByMarketIdAndEventType(MARKET_ID, eventType);
        assertEquals(1, jobs.size());

        var job = jobs.get(0);
        assertEquals(CREATOR_ID, job.getRecipientUserId());
        assertEquals("macro.cat@ucmarket.test", job.getRecipientEmail());
        assertEquals(
                "Changes were requested for your market \"Pending market\". "
                        + "Comment: Need more sources",
                emailTemplateService.render(job.getEventType(), job.getPayload()).body());
        assertEquals(
                "market:%s:submission:%s:%s:user:%s".formatted(
                        MARKET_ID, SUBMISSION_VERSION, eventType, CREATOR_ID),
                job.getIdempotencyKey());
        assertEquals(1, countReviews());
        assertEquals(1, countChangesRequestedLogs());
    }

    @Test
    void requestChanges_whenEnqueueFails_rollsBackMarketReviewLogAndJob() {
        long jobCountBefore = notificationJobRepository.count();
        int reviewCountBefore = countReviews();
        int logCountBefore = countChangesRequestedLogs();
        AtomicBoolean jobInserted = new AtomicBoolean();

        doAnswer(invocation -> {
            invocation.callRealMethod();
            jobInserted.set(true);
            throw new RuntimeException("simulated enqueue failure after insert");
        }).when(notificationService).enqueue(
                any(), any(), anyString(), any(), anyString(), anyString());

        assertThrows(
                RuntimeException.class,
                () -> marketService.requestChanges(MARKET_ID, ADMIN_ID, COMMENT));

        Market after = marketRepository.findById(MARKET_ID).orElseThrow();
        assertEquals(MarketStatus.PENDING, after.getStatus());
        assertEquals(SUBMISSION_VERSION, after.getSubmissionVersion());
        assertEquals(true, jobInserted.get());
        assertEquals(jobCountBefore, notificationJobRepository.count());
        assertEquals(reviewCountBefore, countReviews());
        assertEquals(logCountBefore, countChangesRequestedLogs());
    }

    private int countReviews() {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM market_reviews WHERE market_id = ?",
                Integer.class,
                MARKET_ID);
    }

    private int countChangesRequestedLogs() {
        return jdbc.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM admin_logs
                        WHERE target_id = ? AND action = 'MARKET_REQUEST_CHANGES'
                        """,
                Integer.class,
                MARKET_ID);
    }

    private void deleteChangesRequestedArtifacts() {
        jdbc.update("""
                DELETE FROM notification_job_attempts
                WHERE job_id IN (
                    SELECT id FROM notification_jobs WHERE market_id = ?
                )
                """, MARKET_ID);
        jdbc.update("DELETE FROM notification_jobs WHERE market_id = ?", MARKET_ID);
        jdbc.update("DELETE FROM market_reviews WHERE market_id = ?", MARKET_ID);
        jdbc.update(
                """
                        DELETE FROM admin_logs
                        WHERE target_id = ? AND action = 'MARKET_REQUEST_CHANGES'
                        """,
                MARKET_ID);
    }
}
