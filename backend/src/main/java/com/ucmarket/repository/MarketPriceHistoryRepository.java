package com.ucmarket.repository;

import com.ucmarket.entity.MarketPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MarketPriceHistoryRepository extends JpaRepository<MarketPriceHistory, UUID> {
    List<MarketPriceHistory> findByMarketIdAndRecordedAtBetweenOrderByRecordedAtAsc(
        UUID marketId, LocalDateTime from, LocalDateTime to
    );
}
