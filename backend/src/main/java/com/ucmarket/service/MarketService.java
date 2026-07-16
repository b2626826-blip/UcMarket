package com.ucmarket.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MarketService(MarketRepository marketRepository, MarketReviewRepository marketReviewRepository,
            AdminLogRepository adminLogRepository, ResolutionService resolutionService,
            PositionRepository positionRepository, WalletService walletService) {
        this.marketRepository = marketRepository;
        this.marketReviewRepository = marketReviewRepository;
        this.adminLogRepository = adminLogRepository;
        this.resolutionService = resolutionService;
        this.positionRepository = positionRepository;
        this.walletService = walletService;
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
        return marketRepository.save(market);
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

        return market;
    }

    public Market resolveMarket(UUID marketId, UUID adminId, com.ucmarket.entity.MarketResult result) {
        Market market = resolutionService.resolveMarket(marketId, result, adminId);

        adminLogRepository.save(new AdminLog(adminId, "MARKET_RESOLVE", "MARKET", marketId,
                toJson(Map.of("result", result.name()))));

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
