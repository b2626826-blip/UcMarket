package com.ucmarket.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.MarketClosingReminderPayload;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.UserRepository;

@Service
@Transactional
public class MarketClosingReminderService {

    private static final ZoneId TAIPEI = ZoneId.of("Asia/Taipei");

    private final MarketRepository marketRepository;
    private final PositionRepository positionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public MarketClosingReminderService(
            MarketRepository marketRepository,
            PositionRepository positionRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.marketRepository = marketRepository;
        this.positionRepository = positionRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Scheduled(cron = "0 0 * * * ?", zone = "Asia/Taipei")
    public void enqueueMarketClosingReminders() {
        enqueueMarketClosingReminders(LocalDateTime.now(TAIPEI));
    }

    public void enqueueMarketClosingReminders(LocalDateTime now) {
        List<Market> closingMarkets =
                marketRepository.findByStatusAndCloseAtAfterAndCloseAtLessThanEqual(
                        MarketStatus.ACTIVE, now, now.plusHours(24));

        for (Market market : closingMarkets) {
            String closeAt = market.getCloseAt().toString();
            String payload = toJson(new MarketClosingReminderPayload(
                    market.getTitle(), closeAt));

            positionRepository.findByMarketIdAndStatus(
                            market.getId(), PositionStatus.OPEN)
                    .stream()
                    .map(Position::getUserId)
                    .distinct()
                    .map(userRepository::findById)
                    .flatMap(java.util.Optional::stream)
                    .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                    .forEach(user -> notificationService.enqueue(
                            NotificationEventType.MARKET_CLOSING_REMINDER,
                            user.getId(),
                            user.getEmail(),
                            market.getId(),
                            payload,
                            "market:%s:closing-reminder:%s:user:%s".formatted(
                                    market.getId(), closeAt, user.getId())));
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize notification payload", e);
        }
    }
}
