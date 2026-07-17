package com.ucmarket.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketReview.ReviewStatus;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.entity.User;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.MarketApprovedPayload;
import com.ucmarket.notification.MarketChangesRequestedPayload;
import com.ucmarket.notification.MarketRejectedPayload;
import com.ucmarket.notification.MarketResolvedPayload;
import com.ucmarket.notification.MarketSubmittedPayload;
import com.ucmarket.notification.MarketSubmittedPayload.RecipientType;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class MarketService {

    private final MarketRepository marketRepository;
    private final MarketReviewRepository marketReviewRepository;
    private final AdminLogRepository adminLogRepository;
    private final ResolutionService resolutionService;
    private final PositionRepository positionRepository;
    private final WalletService walletService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MarketService(MarketRepository marketRepository, MarketReviewRepository marketReviewRepository,
            AdminLogRepository adminLogRepository, ResolutionService resolutionService,
            PositionRepository positionRepository, WalletService walletService, UserRepository userRepository,
            NotificationService notificationService) {
        this.marketRepository = marketRepository;
        this.marketReviewRepository = marketReviewRepository;
        this.adminLogRepository = adminLogRepository;
        this.resolutionService = resolutionService;
        this.positionRepository = positionRepository;
        this.walletService = walletService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public Market submitMarket(UUID marketId, UUID userId) {
        Market market = findMarket(marketId);

        if (!market.getCreatorId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (market.getStatus() != MarketStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT markets can be submitted");
        }

        market.changeStatus(MarketStatus.PENDING);
        market.incrementSubmissionVersion();
        Market saved = marketRepository.save(market);

        User creator = userRepository.findById(market.getCreatorId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Market creator not found: " + market.getCreatorId()));
        NotificationEventType eventType = NotificationEventType.MARKET_SUBMITTED;
        List<User> activeAdmins = userRepository.findByRoleAndStatus(
                UserRole.ADMIN, UserStatus.ACTIVE);
        boolean creatorIsActiveAdmin = activeAdmins.stream()
                .anyMatch(admin -> admin.getId().equals(creator.getId()));

        notificationService.enqueue(
                eventType,
                creator.getId(),
                creator.getEmail(),
                saved.getId(),
                toJson(new MarketSubmittedPayload(
                        saved.getTitle(),
                        creatorIsActiveAdmin
                                ? RecipientType.CREATOR_ADMIN
                                : RecipientType.CREATOR)),
                "market:%s:submission:%s:%s:user:%s".formatted(
                        saved.getId(), saved.getSubmissionVersion(), eventType, creator.getId()));

        for (User admin : activeAdmins) {
            if (admin.getId().equals(creator.getId())) {
                continue;
            }
            notificationService.enqueue(
                    eventType,
                    admin.getId(),
                    admin.getEmail(),
                    saved.getId(),
                    toJson(new MarketSubmittedPayload(
                            saved.getTitle(),
                            RecipientType.ADMIN)),
                    "market:%s:submission:%s:%s:user:%s".formatted(
                            saved.getId(), saved.getSubmissionVersion(),
                            eventType, admin.getId()));
        }

        return saved;
    }

    public Market approveMarket(UUID marketId, UUID adminId) {
        Market market = findMarket(marketId);

        if (market.getStatus() != MarketStatus.PENDING) {
            throw new IllegalStateException("Only PENDING markets can be approved");
        }

        market.approve(adminId);
        marketRepository.save(market);

        marketReviewRepository.save(new MarketReview(marketId, adminId, ReviewStatus.APPROVED, null));
        adminLogRepository.save(new AdminLog(adminId, "MARKET_APPROVE", "MARKET", marketId,
                toJson(Map.of("status", "ACTIVE"))));

        User creator = userRepository.findById(market.getCreatorId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Market creator not found: " + market.getCreatorId()));
        NotificationEventType eventType = NotificationEventType.MARKET_APPROVED;
        notificationService.enqueue(
                eventType,
                creator.getId(),
                creator.getEmail(),
                market.getId(),
                toJson(new MarketApprovedPayload(market.getTitle())),
                "market:%s:submission:%s:%s:user:%s".formatted(
                        market.getId(), market.getSubmissionVersion(), eventType, creator.getId()));

        return market;
    }

    public Market rejectMarket(UUID marketId, UUID adminId, String reason) {
        Market market = findMarket(marketId);

        if (market.getStatus() != MarketStatus.PENDING) {
            throw new IllegalStateException("Only PENDING markets can be rejected");
        }

        market.reject();
        marketRepository.save(market);

        marketReviewRepository.save(new MarketReview(marketId, adminId, ReviewStatus.REJECTED, reason));
        adminLogRepository.save(new AdminLog(adminId, "MARKET_REJECT", "MARKET", marketId,
                toJson(Collections.singletonMap("reason", reason))));

        User creator = userRepository.findById(market.getCreatorId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Market creator not found: " + market.getCreatorId()));
        NotificationEventType eventType = NotificationEventType.MARKET_REJECTED;
        notificationService.enqueue(
                eventType,
                creator.getId(),
                creator.getEmail(),
                market.getId(),
                toJson(new MarketRejectedPayload(market.getTitle(), reason)),
                "market:%s:submission:%s:%s:user:%s".formatted(
                        market.getId(), market.getSubmissionVersion(), eventType, creator.getId()));

        return market;
    }

    public Market requestChanges(UUID marketId, UUID adminId, String comment) {
        Market market = findMarket(marketId);

        if (market.getStatus() != MarketStatus.PENDING) {
            throw new IllegalStateException("Only PENDING markets can be sent back for changes");
        }

        market.changeStatus(MarketStatus.DRAFT);
        marketRepository.save(market);

        marketReviewRepository.save(new MarketReview(marketId, adminId, ReviewStatus.CHANGES_REQUESTED, comment));
        adminLogRepository.save(new AdminLog(adminId, "MARKET_REQUEST_CHANGES", "MARKET", marketId,
                toJson(Collections.singletonMap("comment", comment))));

        User creator = userRepository.findById(market.getCreatorId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Market creator not found: " + market.getCreatorId()));
        NotificationEventType eventType = NotificationEventType.MARKET_CHANGES_REQUESTED;
        notificationService.enqueue(
                eventType,
                creator.getId(),
                creator.getEmail(),
                market.getId(),
                toJson(new MarketChangesRequestedPayload(market.getTitle(), comment)),
                "market:%s:submission:%s:%s:user:%s".formatted(
                        market.getId(), market.getSubmissionVersion(), eventType, creator.getId()));

        return market;
    }

    public Market resolveMarket(UUID marketId, UUID adminId, com.ucmarket.entity.MarketResult result) {
        List<UUID> holderIds = positionRepository.findByMarketIdAndStatus(
                        marketId, PositionStatus.OPEN)
                .stream()
                .map(Position::getUserId)
                .distinct()
                .toList();

        Market market = resolutionService.resolveMarket(marketId, result, adminId);

        adminLogRepository.save(new AdminLog(adminId, "MARKET_RESOLVE", "MARKET", marketId,
                toJson(Map.of("result", result.name()))));

        NotificationEventType eventType = NotificationEventType.MARKET_RESOLVED;
        String payload = toJson(new MarketResolvedPayload(
                market.getTitle(), result.name()));
        Stream.concat(holderIds.stream(), Stream.of(market.getCreatorId()))
                .distinct()
                .map(userRepository::findById)
                .flatMap(Optional::stream)
                .filter(user -> user.getId().equals(market.getCreatorId())
                        || user.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> notificationService.enqueue(
                        eventType,
                        user.getId(),
                        user.getEmail(),
                        marketId,
                        payload,
                        "market:%s:%s:user:%s".formatted(
                                marketId, eventType, user.getId())));

        return market;
    }

    public Market cancelMarket(UUID marketId, UUID userId, boolean isAdmin) {
        Market market = findMarket(marketId);

        if (!market.getCreatorId().equals(userId) && !isAdmin) {
            throw new IllegalArgumentException("Only creator or admin can cancel this market");
        }
        if (market.getStatus() == MarketStatus.RESOLVED
                || market.getStatus() == MarketStatus.REJECTED
                || market.getStatus() == MarketStatus.CANCELED) {
            throw new IllegalStateException(
                    "Market in " + market.getStatus() + " status cannot be canceled");
        }
        if (!isAdmin && (market.getStatus() == MarketStatus.ACTIVE
                || market.getStatus() == MarketStatus.CLOSED)) {
            throw new IllegalStateException(
                    "Only admin can cancel an ACTIVE or CLOSED market");
        }

        market.cancel();
        Market saved = marketRepository.save(market);
        refundPositions(saved);
        return saved;
    }

    private void refundPositions(Market market) {
        List<Position> positions = positionRepository.findByMarketIdAndStatus(market.getId(), PositionStatus.OPEN);
        for (Position position : positions) {
            BigDecimal refundAmount = position.getYesCost().add(position.getNoCost());
            if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
                walletService.credit(position.getUserId(), refundAmount, "MARKET", market.getId(),
                        "cancel:" + market.getId() + ":" + position.getId());
            }
            position.cancel();
        }
        positionRepository.saveAll(positions);
    }

    @Scheduled(fixedDelay = 60_000)
    public void autoCloseExpiredMarkets() {
        List<Market> expiredMarkets = marketRepository.findByStatusAndCloseAtBefore(
                MarketStatus.ACTIVE, LocalDateTime.now());
        for (Market market : expiredMarkets) {
            market.close();
        }
        if (!expiredMarkets.isEmpty()) {
            marketRepository.saveAll(expiredMarkets);
        }
    }

    private Market findMarket(UUID id) {
        Market market = marketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Market not found: " + id));
        if (market.getStatus() == MarketStatus.ACTIVE
                && market.getCloseAt() != null
                && market.getCloseAt().isBefore(LocalDateTime.now())) {
            market.close();
            marketRepository.save(market);
        }
        return market;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize admin log metadata", e);
        }
    }
}
