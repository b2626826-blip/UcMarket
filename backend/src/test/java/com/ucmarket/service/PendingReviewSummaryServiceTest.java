package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;

class PendingReviewSummaryServiceTest {

    private MarketRepository marketRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private PendingReviewSummaryService service;

    @BeforeEach
    void setUp() {
        marketRepository = mock(MarketRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = mock(NotificationService.class);
        service = new PendingReviewSummaryService(
                marketRepository,
                userRepository,
                notificationService,
                new ObjectMapper());
    }

    @Test
    void enqueueDailyPendingReviewSummary_createsOneJobPerActiveAdmin() {
        LocalDate summaryDate = LocalDate.of(2026, 7, 17);
        Market first = market(
                "00000000-0000-4003-8000-000000000002",
                "Will it rain tomorrow?");
        Market second = market(
                "00000000-0000-4003-8000-000000000003",
                "Will the index rise?");
        User firstAdmin = admin(
                "00000000-0000-4000-8000-000000000001",
                "first.admin@ucmarket.test");
        User secondAdmin = admin(
                "00000000-0000-4000-8000-000000000002",
                "second.admin@ucmarket.test");

        when(marketRepository.findByStatus(MarketStatus.PENDING))
                .thenReturn(List.of(first, second));
        when(userRepository.findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE))
                .thenReturn(List.of(firstAdmin, secondAdmin));

        service.enqueueDailyPendingReviewSummary(summaryDate);

        NotificationEventType eventType =
                NotificationEventType.DAILY_PENDING_REVIEW_SUMMARY;
        verify(notificationService).enqueue(
                eq(eventType),
                eq(firstAdmin.getId()),
                eq(firstAdmin.getEmail()),
                eq(null),
                argThat(this::containsExpectedSnapshot),
                eq("pending-review-summary:2026-07-17:admin:%s".formatted(firstAdmin.getId())));
        verify(notificationService).enqueue(
                eq(eventType),
                eq(secondAdmin.getId()),
                eq(secondAdmin.getEmail()),
                eq(null),
                argThat(this::containsExpectedSnapshot),
                eq("pending-review-summary:2026-07-17:admin:%s".formatted(secondAdmin.getId())));
        verify(notificationService, times(2)).enqueue(
                eq(eventType),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                eq(null),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void enqueueDailyPendingReviewSummary_withNoPendingMarkets_createsNoJob() {
        when(marketRepository.findByStatus(MarketStatus.PENDING)).thenReturn(List.of());

        service.enqueueDailyPendingReviewSummary(LocalDate.of(2026, 7, 17));

        verify(userRepository, never()).findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE);
        verify(notificationService, never()).enqueue(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void scheduledEntry_runsAtNineInTaipei() throws NoSuchMethodException {
        Scheduled scheduled = PendingReviewSummaryService.class
                .getMethod("enqueueDailyPendingReviewSummary")
                .getAnnotation(Scheduled.class);

        assertNotNull(scheduled);
        assertEquals("0 0 9 * * ?", scheduled.cron());
        assertEquals("Asia/Taipei", scheduled.zone());
    }

    private boolean containsExpectedSnapshot(String payload) {
        return payload.contains("\"summaryDate\":\"2026-07-17\"")
                && payload.contains("\"pendingCount\":2")
                && payload.contains(
                        "\"marketId\":\"00000000-0000-4003-8000-000000000002\"")
                && payload.contains("\"marketTitle\":\"Will it rain tomorrow?\"")
                && payload.contains(
                        "\"marketId\":\"00000000-0000-4003-8000-000000000003\"")
                && payload.contains("\"marketTitle\":\"Will the index rise?\"");
    }

    private Market market(String id, String title) {
        Market market = new Market(
                title,
                "Description",
                "TEST",
                null,
                null,
                null,
                java.time.LocalDateTime.now().plusDays(1));
        ReflectionTestUtils.setField(market, "id", UUID.fromString(id));
        ReflectionTestUtils.setField(market, "status", MarketStatus.PENDING);
        ReflectionTestUtils.setField(market, "creatorId", UUID.randomUUID());
        return market;
    }

    private User admin(String id, String email) {
        User admin = new User("admin_" + id.substring(id.length() - 1), email, "hashed");
        admin.changeRole(UserRole.ADMIN);
        ReflectionTestUtils.setField(admin, "id", UUID.fromString(id));
        return admin;
    }
}
