package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.service.MarketService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MarketSubmissionNotificationIntegrationTest {

    private static final UUID DRAFT_MARKET_ID = UUID.fromString("00000000-0000-4003-8000-000000000003");

    private static final UUID CREATOR_ID = UUID.fromString("00000000-0000-4000-8000-000000000006");

    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationJobRepository notificationJobRepository;

    @MockitoSpyBean
    private NotificationService notificationService;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Test
    void submitMarket_whenSecondNotificationFails_rollsBackMarketAndJobs() {
        Market before = marketRepository.findById(DRAFT_MARKET_ID).orElseThrow();
        User creator = userRepository.findById(CREATOR_ID).orElseThrow();
        long jobCountBefore = notificationJobRepository.count();

        assertEquals(MarketStatus.DRAFT, before.getStatus());
        assertEquals(0, before.getSubmissionVersion());

        AtomicInteger enqueueCalls = new AtomicInteger();
        doAnswer(invocation -> {
            if (enqueueCalls.incrementAndGet() == 2) {
                throw new RuntimeException("simulated second enqueue failure");
            }
            return invocation.callRealMethod();
        }).when(notificationService).enqueue(
                any(), any(), anyString(), any(), anyString(), anyString());
        assertThrows(RuntimeException.class,
                () -> marketService.submitMarket(DRAFT_MARKET_ID, creator.getId()));

        Market after = marketRepository.findById(DRAFT_MARKET_ID).orElseThrow();

        assertEquals(MarketStatus.DRAFT, after.getStatus());
        assertEquals(0, after.getSubmissionVersion());
        assertEquals(jobCountBefore, notificationJobRepository.count());
    }

    @AfterEach
    void cleanup() {
        jdbc.update("""
                DELETE FROM notification_job_attempts
                WHERE job_id IN (
                    SELECT id FROM notification_jobs WHERE market_id = ?
                )
                """, DRAFT_MARKET_ID);

        jdbc.update(
                "DELETE FROM notification_jobs WHERE market_id = ?",
                DRAFT_MARKET_ID);

        jdbc.update("""
                UPDATE markets
                SET status = 'DRAFT', submission_version = 0
                WHERE id = ?
                """, DRAFT_MARKET_ID);

        jdbc.update(
                "UPDATE users SET role = 'USER', status = 'ACTIVE' WHERE id = ?",
                CREATOR_ID);
    }

    @Test
    void submitMarket_commitsMarketAndAllNotificationJobs() {
        int activeAdminCount = userRepository
                .findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE)
                .size();

        long jobCountBefore = notificationJobRepository.count();

        Market submitted = marketService.submitMarket(DRAFT_MARKET_ID, CREATOR_ID);
        assertEquals(MarketStatus.PENDING, submitted.getStatus());
        assertEquals(1, submitted.getSubmissionVersion());

        Market reloaded = marketRepository.findById(DRAFT_MARKET_ID).orElseThrow();
        assertEquals(MarketStatus.PENDING, reloaded.getStatus());
        assertEquals(1, reloaded.getSubmissionVersion());

        assertEquals(
                jobCountBefore + 1 + activeAdminCount,
                notificationJobRepository.count());

        assertEquals(
                1 + activeAdminCount,
                notificationJobRepository
                        .findByMarketIdAndEventType(
                                DRAFT_MARKET_ID,
                                NotificationEventType.MARKET_SUBMITTED)
                        .size());
    }

    @Test
    void submitMarket_creatorIsActiveAdmin_createsOneCombinedJobForCreator() {
        jdbc.update(
                "UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE id = ?",
                CREATOR_ID);
        int activeAdminCount = userRepository
                .findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE)
                .size();

        marketService.submitMarket(DRAFT_MARKET_ID, CREATOR_ID);

        var jobs = notificationJobRepository.findByMarketIdAndEventType(
                DRAFT_MARKET_ID,
                NotificationEventType.MARKET_SUBMITTED);

        assertEquals(activeAdminCount, jobs.size());
        assertEquals(
                1,
                jobs.stream()
                        .filter(job -> CREATOR_ID.equals(job.getRecipientUserId()))
                        .count());
        var creatorJob = jobs.stream()
                .filter(job -> CREATOR_ID.equals(job.getRecipientUserId()))
                .findFirst()
                .orElseThrow();
        var email = emailTemplateService.render(
                creatorJob.getEventType(),
                creatorJob.getPayload());
        assertEquals(
                "[UcMarket] Market submitted and awaiting your review",
                email.subject());
        assertEquals(
                "Your market \"Draft market\" was submitted and is awaiting your review.",
                email.body());
    }
}
