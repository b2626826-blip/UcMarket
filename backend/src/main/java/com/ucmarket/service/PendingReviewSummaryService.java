package com.ucmarket.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.DailyPendingReviewSummaryPayload;
import com.ucmarket.notification.DailyPendingReviewSummaryPayload.PendingMarketSnapshot;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;

@Service
@Transactional
public class PendingReviewSummaryService {

    private static final ZoneId TAIPEI = ZoneId.of("Asia/Taipei");

    private final MarketRepository marketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public PendingReviewSummaryService(
            MarketRepository marketRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.marketRepository = marketRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Scheduled(cron = "0 0 9 * * ?", zone = "Asia/Taipei")
    public void enqueueDailyPendingReviewSummary() {
        enqueueDailyPendingReviewSummary(LocalDate.now(TAIPEI));
    }

    public void enqueueDailyPendingReviewSummary(LocalDate summaryDate) {
        List<Market> pendingMarkets = marketRepository.findByStatus(MarketStatus.PENDING);
        if (pendingMarkets.isEmpty()) {
            return;
        }

        List<PendingMarketSnapshot> marketSnapshots = pendingMarkets.stream()
                .map(market -> new PendingMarketSnapshot(market.getId(), market.getTitle()))
                .toList();
        String payload = toJson(new DailyPendingReviewSummaryPayload(
                summaryDate.toString(),
                marketSnapshots.size(),
                marketSnapshots));
        NotificationEventType eventType =
                NotificationEventType.DAILY_PENDING_REVIEW_SUMMARY;

        List<User> activeAdmins = userRepository.findByRoleAndStatus(
                UserRole.ADMIN, UserStatus.ACTIVE);
        for (User admin : activeAdmins) {
            notificationService.enqueue(
                    eventType,
                    admin.getId(),
                    admin.getEmail(),
                    null,
                    payload,
                    "pending-review-summary:%s:admin:%s".formatted(
                            summaryDate, admin.getId()));
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
