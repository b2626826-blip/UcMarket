package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ucmarket.dto.internal.ClosingMarketResponse;
import com.ucmarket.dto.internal.DigestResponse;
import com.ucmarket.dto.internal.FailedNotificationsResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.entity.User;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJob;

import jakarta.persistence.EntityManager;

// 關卡 3 查詢層實測（H2 PostgreSQL 模式）。
// 造數用「遠古日期窗 2000-01-01」隔離 digest 斷言、唯一 title 標記隔離 closing 斷言、
// 差值斷言隔離 pending 快照——data.sql 的 mock 資料無論怎麼改都不會弄髒這些測試。
// created_at 由 @PrePersist 蓋掉，所以 persist 後用 SQL update 撥回目標時間。
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("pgtest")
@Import(NotificationQueryService.class)
class NotificationQueryServiceIntegrationTest {

    private static final LocalDate ANCIENT = LocalDate.of(2000, 1, 1);

    @Autowired
    private NotificationQueryService service;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID normalUserId;
    private UUID sysUserId;

    @BeforeEach
    void setUpUsers() {
        normalUserId = persistUser("alice-" + unique(), null);
        sysUserId = persistUser("weather-bot-" + unique(), "SYS-" + unique());
    }

    @Test
    void digest_countsOnlyInsideHalfOpenDayWindow() {
        UUID inWindowMarket = persistMarket("digest-in-" + unique(), normalUserId,
                LocalDateTime.now().plusDays(30), "ACTIVE",
                ANCIENT.atTime(10, 0));
        persistMarket("digest-in2-" + unique(), normalUserId,
                LocalDateTime.now().plusDays(30), "DRAFT",
                ANCIENT.atTime(23, 59));
        // 窗界外：隔天 00:00 整——驗證半開區間 [00:00, 隔日00:00)
        persistMarket("digest-out-" + unique(), normalUserId,
                LocalDateTime.now().plusDays(30), "ACTIVE",
                ANCIENT.plusDays(1).atStartOfDay());

        persistTrade(inWindowMarket, new BigDecimal("100.50"), ANCIENT.atTime(9, 0));
        persistTrade(inWindowMarket, new BigDecimal("200.00"), ANCIENT.atTime(12, 0));
        persistTrade(inWindowMarket, new BigDecimal("999.99"), ANCIENT.plusDays(1).atStartOfDay());

        DigestResponse digest = service.digest(ANCIENT);

        assertEquals(ANCIENT, digest.date());
        assertEquals(2, digest.newMarketCount());
        assertEquals(2, digest.tradeCount());
        assertEquals(0, new BigDecimal("300.50").compareTo(digest.tradeVolume()));
    }

    @Test
    void digest_pendingReviewCountIsCurrentSnapshot() {
        long before = service.digest(ANCIENT).pendingReviewCount();

        persistMarket("pending-" + unique(), normalUserId,
                LocalDateTime.now().plusDays(30), "PENDING",
                LocalDateTime.now());

        long after = service.digest(ANCIENT).pendingReviewCount();
        assertEquals(before + 1, after);
    }

    @Test
    void closingMarkets_windowAndExclusions() {
        String within = "closing-23h-" + unique();
        String beyond = "closing-31h-" + unique();
        String system = "closing-sys-" + unique();
        String closed = "closing-closed-" + unique();

        persistMarket(within, normalUserId, LocalDateTime.now().plusHours(23), "ACTIVE", LocalDateTime.now());
        persistMarket(beyond, normalUserId, LocalDateTime.now().plusHours(31), "ACTIVE", LocalDateTime.now());
        persistMarket(system, sysUserId, LocalDateTime.now().plusHours(2), "ACTIVE", LocalDateTime.now());
        persistMarket(closed, normalUserId, LocalDateTime.now().plusHours(2), "CLOSED", LocalDateTime.now());

        List<ClosingMarketResponse> result = service.closingMarkets(24);
        List<String> titles = result.stream().map(ClosingMarketResponse::title).toList();

        assertTrue(titles.contains(within), "23h 內的 ACTIVE 市場應出現");
        assertFalse(titles.contains(beyond), "31h 的市場不該出現在 24h 窗");
        assertFalse(titles.contains(system), "SYS- 建立者的市場應被排除");
        assertFalse(titles.contains(closed), "非 ACTIVE 市場不該出現");

        ClosingMarketResponse hit = result.stream()
                .filter(r -> r.title().equals(within)).findFirst().orElseThrow();
        assertTrue(hit.creatorName().startsWith("alice-"), "creatorName 應為建立者 username");
    }

    @Test
    void failedNotifications_countsAndListsOnlyFailed() {
        long before = service.failedNotifications(5).count();

        String failedMarker = "failed-" + unique() + "@test.local";
        persistJob(failedMarker, true);
        persistJob("sent-" + unique() + "@test.local", false);

        FailedNotificationsResponse result = service.failedNotifications(5);

        assertEquals(before + 1, result.count());
        assertTrue(result.recent().stream()
                        .anyMatch(item -> item.recipientEmail().equals(failedMarker)),
                "recent 應含剛失敗的那筆");
        assertTrue(result.recent().stream()
                        .noneMatch(item -> item.recipientEmail().startsWith("sent-")),
                "SENT 的不該出現");
    }

    // ---- 造數工具 ----

    private static String unique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private UUID persistUser(String username, String code) {
        User user = new User(username, username + "@test.local", "x");
        entityManager.persist(user);
        entityManager.flush();
        if (code != null) {
            jdbcTemplate.update("UPDATE users SET code = ? WHERE id = ?", code, user.getId());
        }
        return user.getId();
    }

    private UUID persistMarket(String title, UUID creatorId, LocalDateTime closeAt,
            String status, LocalDateTime createdAt) {
        Market market = new Market(title, "desc", "TEST", "https://example.com", "rule", closeAt);
        market.setCreatorId(creatorId);
        entityManager.persist(market);
        entityManager.flush();
        // status 無 setter、created_at 被 @PrePersist 蓋掉——一律 SQL 撥回目標值
        jdbcTemplate.update("UPDATE markets SET status = ?, created_at = ? WHERE id = ?",
                status, Timestamp.valueOf(createdAt), market.getId());
        return market.getId();
    }

    private void persistTrade(UUID marketId, BigDecimal amount, LocalDateTime createdAt) {
        Trade trade = new Trade(normalUserId, marketId, MarketSide.YES, TradeAction.BUY,
                amount, new BigDecimal("0.5000"), new BigDecimal("1.0000"), unique());
        entityManager.persist(trade);
        entityManager.flush();
        jdbcTemplate.update("UPDATE trades SET created_at = ? WHERE id = ?",
                Timestamp.valueOf(createdAt), trade.getId());
    }

    private void persistJob(String recipientEmail, boolean failed) {
        NotificationJob job = new NotificationJob(
                NotificationEventType.MARKET_SUBMITTED, normalUserId, recipientEmail,
                null, "{\"marketTitle\":\"t\"}", "idem-" + unique());
        if (failed) {
            job.markFailed("simulated failure");
        } else {
            job.markSent(LocalDateTime.now());
        }
        entityManager.persist(job);
        entityManager.flush();
    }
}
