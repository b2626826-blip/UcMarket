package com.ucmarket.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.admin.DashboardStatsResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final MarketRepository marketRepository;
    private final UserRepository userRepository;

    public AdminDashboardController(MarketRepository marketRepository, UserRepository userRepository) {
        this.marketRepository = marketRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse stats() {
        long totalUsers = userRepository.count();
        long totalMarkets = marketRepository.count();
        long pendingCount = marketRepository.countByStatus(MarketStatus.PENDING);
        long activeCount = marketRepository.countByStatus(MarketStatus.ACTIVE);
        long resolvedCount = marketRepository.countByStatus(MarketStatus.RESOLVED);
        long rejectedCount = marketRepository.countByStatus(MarketStatus.REJECTED);
        long draftCount = marketRepository.countByStatus(MarketStatus.DRAFT);

        return new DashboardStatsResponse(
                totalUsers, totalMarkets, pendingCount, activeCount, resolvedCount, rejectedCount, draftCount);
    }

    @GetMapping("/reviews")
    public List<Market> reviews() {
        List<Market> markets = marketRepository.findByStatus(MarketStatus.PENDING);
        fillCreatorCodes(markets);
        return markets;
    }

    private void fillCreatorCodes(List<Market> markets) {
        Map<UUID, String> cache = new HashMap<>();
        for (Market m : markets) {
            if (m.getCreatorId() != null) {
                String code = cache.computeIfAbsent(m.getCreatorId(),
                        id -> userRepository.findById(id).map(User::getCode).orElse(null));
                m.setCreatorCode(code);
            }
        }
    }
}
