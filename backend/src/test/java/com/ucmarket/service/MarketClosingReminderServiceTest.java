package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.UserRepository;

class MarketClosingReminderServiceTest {

    private MarketRepository marketRepository;
    private PositionRepository positionRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private MarketClosingReminderService service;

    @BeforeEach
    void setUp() {
        marketRepository = mock(MarketRepository.class);
        positionRepository = mock(PositionRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = mock(NotificationService.class);
        service = new MarketClosingReminderService(
                marketRepository,
                positionRepository,
                userRepository,
                notificationService,
                new ObjectMapper());
    }

    @Test
    void enqueueMarketClosingReminders_notifiesEachUniqueActiveHolder() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 17, 10, 0);
        LocalDateTime closeAt = LocalDateTime.of(2026, 7, 18, 10, 0);
        Market market = market(
                "00000000-0000-4003-8000-000000000008",
                "Will the index rise?",
                closeAt);
        User active = user(
                "00000000-0000-4000-8000-000000000003",
                "active@ucmarket.test",
                UserStatus.ACTIVE);
        User banned = user(
                "00000000-0000-4000-8000-000000000008",
                "banned@ucmarket.test",
                UserStatus.BANNED);

        when(marketRepository.findByStatusAndCloseAtAfterAndCloseAtLessThanEqual(
                MarketStatus.ACTIVE, now, now.plusHours(24)))
                .thenReturn(List.of(market));
        when(positionRepository.findByMarketIdAndStatus(
                market.getId(), PositionStatus.OPEN))
                .thenReturn(List.of(
                        position(market.getId(), active.getId()),
                        position(market.getId(), active.getId()),
                        position(market.getId(), banned.getId())));
        when(userRepository.findById(active.getId())).thenReturn(Optional.of(active));
        when(userRepository.findById(banned.getId())).thenReturn(Optional.of(banned));

        service.enqueueMarketClosingReminders(now);

        NotificationEventType eventType =
                NotificationEventType.MARKET_CLOSING_REMINDER;
        verify(notificationService).enqueue(
                eq(eventType),
                eq(active.getId()),
                eq(active.getEmail()),
                eq(market.getId()),
                argThat(payload -> payload.contains("\"marketTitle\":\"Will the index rise?\"")
                        && payload.contains("\"closeAt\":\"2026-07-18T10:00\"")),
                eq("market:%s:closing-reminder:%s:user:%s".formatted(
                        market.getId(), closeAt, active.getId())));
        verify(notificationService, never()).enqueue(
                eq(eventType),
                eq(banned.getId()),
                eq(banned.getEmail()),
                eq(market.getId()),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void enqueueMarketClosingReminders_withNoClosingMarkets_createsNoJob() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 17, 10, 0);
        when(marketRepository.findByStatusAndCloseAtAfterAndCloseAtLessThanEqual(
                MarketStatus.ACTIVE, now, now.plusHours(24)))
                .thenReturn(List.of());

        service.enqueueMarketClosingReminders(now);

        verify(positionRepository, never()).findByMarketIdAndStatus(
                org.mockito.ArgumentMatchers.any(), eq(PositionStatus.OPEN));
        verify(notificationService, never()).enqueue(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void scheduledEntry_runsHourlyInTaipei() throws NoSuchMethodException {
        Scheduled scheduled = MarketClosingReminderService.class
                .getMethod("enqueueMarketClosingReminders")
                .getAnnotation(Scheduled.class);

        assertNotNull(scheduled);
        assertEquals("0 0 * * * ?", scheduled.cron());
        assertEquals("Asia/Taipei", scheduled.zone());
    }

    private Market market(String id, String title, LocalDateTime closeAt) {
        Market market = new Market(
                title,
                "Description",
                "TEST",
                null,
                null,
                null,
                closeAt);
        ReflectionTestUtils.setField(market, "id", UUID.fromString(id));
        ReflectionTestUtils.setField(market, "status", MarketStatus.ACTIVE);
        ReflectionTestUtils.setField(market, "creatorId", UUID.randomUUID());
        return market;
    }

    private Position position(UUID marketId, UUID userId) {
        Position position = new Position();
        position.setMarketId(marketId);
        position.setUserId(userId);
        position.setStatus(PositionStatus.OPEN);
        return position;
    }

    private User user(String id, String email, UserStatus status) {
        User user = new User("user_" + id.substring(id.length() - 1), email, "hashed");
        ReflectionTestUtils.setField(user, "id", UUID.fromString(id));
        user.changeStatus(status);
        return user;
    }
}
