package com.ucmarket.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                "{\"status\":\"ACTIVE\"}"));

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
                "{\"reason\":\"" + reason + "\"}"));

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
                "{\"comment\":\"" + comment + "\"}"));

        return market;
    }

    public Market resolveMarket(UUID marketId, UUID adminId, com.ucmarket.entity.MarketResult result) {
        Market market = resolutionService.resolveMarket(marketId, result);

        market.setResolvedBy(adminId);
        marketRepository.save(market);

        adminLogRepository.save(new AdminLog(adminId, "MARKET_RESOLVE", "MARKET", marketId,
                "{\"result\":\"" + result.name() + "\"}"));

        return market;
    }

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void autoCloseExpiredMarkets() {
        List<Market> expired = marketRepository
                .findByStatusAndCloseAtBefore(MarketStatus.ACTIVE, LocalDateTime.now());
        for (Market m : expired) {
            m.close();
        }
        if (!expired.isEmpty()) {
            marketRepository.saveAll(expired);
        }
    }

    private Market findMarket(UUID id) {
        return marketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Market not found: " + id));
    }
}
