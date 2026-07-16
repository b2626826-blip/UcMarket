package com.ucmarket.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.ucmarket.dto.admin.DashboardStatsResponse;
import com.ucmarket.dto.admin.MarketSummaryItem;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;

@Service
public class AdminDashboardService {

    private final MarketRepository marketRepository;
    private final UserRepository userRepository;

    public AdminDashboardService(MarketRepository marketRepository, UserRepository userRepository) {
        this.marketRepository = marketRepository;
        this.userRepository = userRepository;
    }

    public List<MarketSummaryItem> getMarketSummary() {
        long total = marketRepository.count();
        long pending = marketRepository.countByStatus(MarketStatus.PENDING);
        long active = marketRepository.countByStatus(MarketStatus.ACTIVE);
        long resolved = marketRepository.countByStatus(MarketStatus.RESOLVED);

        return List.of(
                new MarketSummaryItem("全部事件", total, "primary"),
                new MarketSummaryItem("待審核", pending, "warning"),
                new MarketSummaryItem("進行中", active, "success"),
                new MarketSummaryItem("已結算", resolved, "secondary")
        );
    }

    public DashboardStatsResponse getDashboardStats() {
        return new DashboardStatsResponse(
                userRepository.count(),
                marketRepository.count(),
                marketRepository.countByStatus(MarketStatus.PENDING),
                marketRepository.countByStatus(MarketStatus.ACTIVE),
                marketRepository.countByStatus(MarketStatus.RESOLVED),
                marketRepository.countByStatus(MarketStatus.REJECTED),
                marketRepository.countByStatus(MarketStatus.DRAFT)
        );
    }

    public List<Market> getAdminMarkets() {
        List<Market> markets = marketRepository.findAll();
        fillCreatorCodes(markets);
        return markets;
    }

    public List<Market> getPendingReviews() {
        List<Market> markets = marketRepository.findByStatus(MarketStatus.PENDING);
        fillCreatorCodes(markets);
        return markets;
    }

    private void fillCreatorCodes(List<Market> markets) {
        List<UUID> ids = markets.stream()
                .map(Market::getCreatorId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        if (ids.isEmpty()) return;
        Map<UUID, String> codeMap = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getCode() != null ? u.getCode() : ""));
        markets.forEach(m -> {
            if (m.getCreatorId() != null) m.setCreatorCode(codeMap.get(m.getCreatorId()));
        });
    }
}
