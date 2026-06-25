package com.ucmarket.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.ucmarket.dto.admin.MarketSummaryItem;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@Service
public class AdminDashboardService {

    private final MarketRepository marketRepository;

    public AdminDashboardService(MarketRepository marketRepository) {
        this.marketRepository = marketRepository;
    }

    public List<MarketSummaryItem> getMarketSummary() {
        long total = marketRepository.count();
        long pending = marketRepository.countByStatus(MarketStatus.PENDING);
        long active = marketRepository.countByStatus(MarketStatus.ACTIVE);
        long resolved = marketRepository.countByStatus(MarketStatus.RESOLVED);

        return List.of(
                new MarketSummaryItem("\u5168\u90E8\u4E8B\u4EF6", total, "primary"),
                new MarketSummaryItem("\u5F85\u5BE9\u6838", pending, "warning"),
                new MarketSummaryItem("\u9032\u884C\u4E2D", active, "success"),
                new MarketSummaryItem("\u5DF2\u7D50\u7B97", resolved, "secondary")
        );
    }
}
