package com.ucmarket.service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketReview.ReviewStatus;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class MarketService {

    private final MarketRepository marketRepository;
    private final MarketReviewRepository marketReviewRepository;
    private final AdminLogRepository adminLogRepository;
    private final ResolutionService resolutionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MarketService(MarketRepository marketRepository, MarketReviewRepository marketReviewRepository,
            AdminLogRepository adminLogRepository, ResolutionService resolutionService) {
        this.marketRepository = marketRepository;
        this.marketReviewRepository = marketReviewRepository;
        this.adminLogRepository = adminLogRepository;
        this.resolutionService = resolutionService;
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
