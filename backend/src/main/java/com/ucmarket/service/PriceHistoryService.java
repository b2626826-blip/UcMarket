package com.ucmarket.service;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketPriceHistory;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketPriceHistoryRepository;
import com.ucmarket.repository.MarketRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PriceHistoryService {

    private final MarketPriceHistoryRepository priceHistoryRepository;
    private final MarketRepository marketRepository;

    public PriceHistoryService(MarketPriceHistoryRepository priceHistoryRepository,
                               MarketRepository marketRepository) {
        this.priceHistoryRepository = priceHistoryRepository;
        this.marketRepository = marketRepository;
    }

    public void record(UUID marketId, BigDecimal yesPrice, BigDecimal noPrice, BigDecimal tradeVolume) {
        priceHistoryRepository.save(new MarketPriceHistory(marketId, yesPrice, noPrice, tradeVolume));
    }

    public List<MarketPriceHistory> findHistory(UUID marketId, LocalDateTime from, LocalDateTime to) {
        return priceHistoryRepository.findByMarketIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            marketId, from, to
        );
    }

    public void recordInitialPrice(UUID marketId) {
        record(marketId, new BigDecimal("0.5000"), new BigDecimal("0.5000"), BigDecimal.ZERO);
    }

    @Scheduled(fixedDelay = 300_000) // 每 5 分鐘
    public void snapshotActiveMarkets() {
        List<Market> activeMarkets = marketRepository.findByStatus(MarketStatus.ACTIVE);
        for (Market market : activeMarkets) {
            BigDecimal yesPool = market.getYesPool();
            BigDecimal noPool = market.getNoPool();
            BigDecimal totalPool = yesPool.add(noPool);
            if (totalPool.compareTo(BigDecimal.ZERO) == 0) continue;

            BigDecimal yesPrice = yesPool.divide(totalPool, 4, RoundingMode.HALF_UP);
            BigDecimal noPrice = noPool.divide(totalPool, 4, RoundingMode.HALF_UP);
            record(market.getId(), yesPrice, noPrice, BigDecimal.ZERO);
        }
    }
}
