package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.admin.AdminMarketListResponse;
import com.ucmarket.dto.admin.MarketSummaryItem;
import com.ucmarket.dto.admin.ReviewMarketRequest;
import com.ucmarket.dto.ResolveMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.service.AdminDashboardService;
import com.ucmarket.service.MarketService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/markets")
public class AdminMarketController {

    private final MarketService marketService;
    private final AdminDashboardService adminDashboardService;
    private final MarketRepository marketRepository;

    public AdminMarketController(MarketService marketService, AdminDashboardService adminDashboardService,
            MarketRepository marketRepository) {
        this.marketService = marketService;
        this.adminDashboardService = adminDashboardService;
        this.marketRepository = marketRepository;
    }

    @GetMapping
    public AdminMarketListResponse listMarkets(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {

        List<MarketSummaryItem> summary = adminDashboardService.getMarketSummary();

        List<Market> markets;
        if (status != null || category != null || keyword != null) {
            markets = marketRepository.findAll(); // simplified; enhancement: use JPA Specification
        } else {
            markets = marketRepository.findAll();
        }

        return new AdminMarketListResponse(summary, markets);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Market> approveMarket(@PathVariable UUID id, @AuthenticationPrincipal User admin) {
        Market market = marketService.approveMarket(id, admin.getId());
        return ResponseEntity.ok(market);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Market> rejectMarket(@PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ReviewMarketRequest request) {
        Market market = marketService.rejectMarket(id, admin.getId(), request.comment());
        return ResponseEntity.ok(market);
    }

    @PostMapping("/{id}/request-changes")
    public ResponseEntity<Market> requestChanges(@PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ReviewMarketRequest request) {
        Market market = marketService.requestChanges(id, admin.getId(), request.comment());
        return ResponseEntity.ok(market);
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<Market> resolveMarket(@PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ResolveMarketRequest request) {
        Market market = marketService.resolveMarket(id, admin.getId(), request.result());
        return ResponseEntity.ok(market);
    }
}
