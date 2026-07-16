package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.PageResponse;
import com.ucmarket.dto.ResolveMarketRequest;
import com.ucmarket.dto.admin.AdminMarketListResponse;
import com.ucmarket.dto.admin.ReviewMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.service.AdminDashboardService;
import com.ucmarket.service.MarketService;
import com.ucmarket.util.PageParams;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/markets")
public class AdminMarketController {

    private final MarketService marketService;
    private final AdminDashboardService adminDashboardService;
    private final MarketReviewRepository marketReviewRepository;

    public AdminMarketController(MarketService marketService, AdminDashboardService adminDashboardService,
            MarketReviewRepository marketReviewRepository) {
        this.marketService = marketService;
        this.adminDashboardService = adminDashboardService;
        this.marketReviewRepository = marketReviewRepository;
    }

    @GetMapping
    public AdminMarketListResponse listMarkets(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        MarketStatus statusEnum = parseStatus(status);
        Page<Market> markets = adminDashboardService.getAdminMarkets(
                statusEnum, category, keyword, PageParams.of(page, size, "createdAt"));
        return new AdminMarketListResponse(
                adminDashboardService.getMarketSummary(),
                PageResponse.of(markets));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Market> approveMarket(@PathVariable UUID id, @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(marketService.approveMarket(id, admin.getId()));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Market> rejectMarket(@PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ReviewMarketRequest request) {
        return ResponseEntity.ok(marketService.rejectMarket(id, admin.getId(), request.comment()));
    }

    @PostMapping("/{id}/request-changes")
    public ResponseEntity<Market> requestChanges(@PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ReviewMarketRequest request) {
        return ResponseEntity.ok(marketService.requestChanges(id, admin.getId(), request.comment()));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<Market> resolveMarket(@PathVariable UUID id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ResolveMarketRequest request) {
        return ResponseEntity.ok(marketService.resolveMarket(id, admin.getId(), request.result()));
    }

    @GetMapping("/{id}/reviews")
    public List<MarketReview> listReviews(@PathVariable UUID id) {
        return marketReviewRepository.findByMarketIdOrderByCreatedAtDesc(id);
    }

    private static MarketStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        return MarketStatus.valueOf(status.toUpperCase());
    }
}
