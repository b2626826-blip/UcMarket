package com.ucmarket.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.notification.EmailTemplateService;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.service.MarketService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MarketResolvedNotificationIntegrationTest {

    private static final UUID MARKET_ID =
            UUID.fromString("00000000-0000-4003-8000-000000000004");
    private static final UUID CREATOR_ID =
            UUID.fromString("00000000-0000-4000-8000-000000000005");
    private static final UUID ACTIVE_HOLDER_ONE =
            UUID.fromString("00000000-0000-4000-8000-000000000003");
    private static final UUID ACTIVE_HOLDER_TWO =
            UUID.fromString("00000000-0000-4000-8000-000000000004");
    private static final UUID BANNED_HOLDER =
            UUID.fromString("00000000-0000-4000-8000-000000000008");
    private static final UUID ADMIN_ID =
            UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID HOLDER_WALLET_ID =
            UUID.fromString("00000000-0000-4002-8000-000000000003");
    private static final String EVENT_TYPE = "MARKET_RESOLVED";

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
        deleteResolutionArtifacts();
        prepareMarketAndWallet();
        insertPosition(
                "00000000-0000-4011-8000-000000000001",
                ACTIVE_HOLDER_ONE,
                "1",
                "0",
                "10",
                "0");
        insertPosition(
                "00000000-0000-4011-8000-000000000002",
                ACTIVE_HOLDER_TWO,
                "0",
                "1",
                "0",
                "10");
        insertPosition(
                "00000000-0000-4011-8000-000000000003",
                BANNED_HOLDER,
                "0",
                "1",
                "0",
                "10");
    }

    @AfterEach
    void cleanup() {
        deleteResolutionArtifacts();
        restoreMarketAndWallet();
    }

    @Test
    void resolveMarket_createsUniqueJobsForActiveHoldersAndCreator() {
        marketService.resolveMarket(MARKET_ID, ADMIN_ID, MarketResult.YES);

        assertThrows(
                RuntimeException.class,
                () -> marketService.resolveMarket(
                        MARKET_ID, ADMIN_ID, MarketResult.YES));

        var jobs = notificationJobRepository.findByMarketIdAndEventType(
                MARKET_ID, NotificationEventType.MARKET_RESOLVED);
        assertEquals(3, jobs.size());
        assertEquals(
                new HashSet<>(List.of(
                        ACTIVE_HOLDER_ONE, ACTIVE_HOLDER_TWO, CREATOR_ID)),
                new HashSet<>(jobs.stream()
                        .map(job -> job.getRecipientUserId())
                        .toList()));
        for (var job : jobs) {
            assertEquals(
                    "market:%s:%s:user:%s".formatted(
                            MARKET_ID,
                            NotificationEventType.MARKET_RESOLVED,
                            job.getRecipientUserId()),
                    job.getIdempotencyKey());
            assertEquals(
                    "Market \"Active market 2\" was resolved as YES.",
                    emailTemplateService.render(
                            job.getEventType(), job.getPayload()).body());
        }

        assertEquals(
                MarketStatus.RESOLVED,
                marketRepository.findById(MARKET_ID).orElseThrow().getStatus());
        assertEquals(3, countPositionsWithStatus("SETTLED"));
        assertEquals(1, countResolutionLogs());
    }

    @Test
    void resolveMarket_whenEnqueueFails_rollsBackResolutionPayoutPositionsLogAndJob() {
        BigDecimal walletBalanceBefore = walletBalance();
        AtomicBoolean jobInserted = new AtomicBoolean();

        doAnswer(invocation -> {
            invocation.callRealMethod();
            jobInserted.set(true);
            throw new RuntimeException("simulated enqueue failure after insert");
        }).when(notificationService).enqueue(
                any(), any(), anyString(), any(), anyString(), anyString());

        assertThrows(
                RuntimeException.class,
                () -> marketService.resolveMarket(
                        MARKET_ID, ADMIN_ID, MarketResult.YES));

        var market = marketRepository.findById(MARKET_ID).orElseThrow();
        assertEquals(MarketStatus.CLOSED, market.getStatus());
        assertNull(market.getResult());
        assertNull(market.getResolvedAt());
        assertNull(market.getResolvedBy());
        assertEquals(true, jobInserted.get());
        assertEquals(0, notificationJobRepository
                .findByMarketIdAndEventType(
                        MARKET_ID, NotificationEventType.MARKET_RESOLVED)
                .size());
        assertEquals(3, countPositionsWithStatus("OPEN"));
        assertEquals(walletBalanceBefore, walletBalance());
        assertEquals(0, countResolutionPayouts());
        assertEquals(0, countResolutionLogs());
    }

    private void insertPosition(
            String id,
            UUID userId,
            String yesShares,
            String noShares,
            String yesCost,
            String noCost) {
        jdbc.update("""
                INSERT INTO positions (
                    id, user_id, market_id, yes_shares, no_shares,
                    yes_cost, no_cost, status, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)
                """,
                UUID.fromString(id),
                userId,
                MARKET_ID,
                new BigDecimal(yesShares),
                new BigDecimal(noShares),
                new BigDecimal(yesCost),
                new BigDecimal(noCost));
    }

    private int countPositionsWithStatus(String status) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM positions WHERE market_id = ? AND status = ?",
                Integer.class,
                MARKET_ID,
                status);
    }

    private int countResolutionLogs() {
        return jdbc.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM admin_logs
                        WHERE target_id = ? AND action = 'MARKET_RESOLVE'
                        """,
                Integer.class,
                MARKET_ID);
    }

    private int countResolutionPayouts() {
        return jdbc.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM wallet_transactions
                        WHERE reference_type = 'MARKET' AND reference_id = ?
                        """,
                Integer.class,
                MARKET_ID);
    }

    private BigDecimal walletBalance() {
        return jdbc.queryForObject(
                "SELECT balance FROM wallets WHERE id = ?",
                BigDecimal.class,
                HOLDER_WALLET_ID);
    }

    private void deleteResolutionArtifacts() {
        jdbc.update("""
                DELETE FROM notification_job_attempts
                WHERE job_id IN (
                    SELECT id FROM notification_jobs WHERE market_id = ?
                )
                """, MARKET_ID);
        jdbc.update("DELETE FROM notification_jobs WHERE market_id = ?", MARKET_ID);
        jdbc.update(
                "DELETE FROM wallet_transactions WHERE reference_id = ?",
                MARKET_ID);
        jdbc.update("DELETE FROM positions WHERE market_id = ?", MARKET_ID);
        jdbc.update(
                "DELETE FROM admin_logs WHERE target_id = ? AND action = 'MARKET_RESOLVE'",
                MARKET_ID);
    }

    private void prepareMarketAndWallet() {
        jdbc.update("""
                UPDATE markets
                SET status = 'CLOSED',
                    result = null,
                    resolved_at = null,
                    resolved_by = null
                WHERE id = ?
                """, MARKET_ID);
        jdbc.update("""
                UPDATE wallets
                SET balance = 12800.00,
                    locked_balance = 1200.00,
                    version = 3
                WHERE id = ?
                """, HOLDER_WALLET_ID);
    }

    private void restoreMarketAndWallet() {
        jdbc.update("""
                UPDATE markets
                SET status = 'ACTIVE',
                    result = null,
                    resolved_at = null,
                    resolved_by = null
                WHERE id = ?
                """, MARKET_ID);
        jdbc.update("""
                UPDATE wallets
                SET balance = 12800.00,
                    locked_balance = 1200.00,
                    version = 3
                WHERE id = ?
                """, HOLDER_WALLET_ID);
    }
}
