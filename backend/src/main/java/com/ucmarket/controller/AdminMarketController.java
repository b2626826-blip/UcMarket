package com.ucmarket.controller;

import java.util.HashMap;
import com.ucmarket.service.ResolutionService;
import org.springframework.web.bind.annotation.RequestBody;

import com.ucmarket.dto.ResolveMarketRequest;

import java.util.List;
import java.util.Map;
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
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.service.AdminDashboardService;
import com.ucmarket.service.MarketService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/markets")
public class AdminMarketController {
	
	private final ResolutionService resolutionService;

    private final MarketService marketService;
    private final AdminDashboardService adminDashboardService;
    private final MarketRepository marketRepository;
    private final MarketReviewRepository marketReviewRepository;
    private final UserRepository userRepository;

    public AdminMarketController(MarketService marketService, AdminDashboardService adminDashboardService,
            MarketRepository marketRepository, MarketReviewRepository marketReviewRepository,
            UserRepository userRepository) {
        this.marketService = marketService;
        this.adminDashboardService = adminDashboardService;
        this.marketRepository = marketRepository;
        this.marketReviewRepository = marketReviewRepository;
        this.userRepository = userRepository;
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

        fillCreatorCodes(markets);
        return new AdminMarketListResponse(summary, markets);
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

    @GetMapping("/{id}/reviews")
    public List<MarketReview> listReviews(@PathVariable UUID id) {
        return marketReviewRepository.findByMarketIdOrderByCreatedAtDesc(id);
    }
	private final MarketRepository marketRepository;

	public AdminMarketController(MarketRepository marketRepository, ResolutionService resolutionService) {
		this.marketRepository = marketRepository;
		this.resolutionService = resolutionService;
	}

	@GetMapping("/pending")
	public List<Market> listPendingMarkets() {
		return marketRepository.findByStatus(MarketStatus.PENDING);
	}
	
	@PostMapping("/{id}/approve")
	public Market approveMarket(@PathVariable UUID id) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		market.approve();

		return marketRepository.save(market);
	}
	
	@PostMapping("/{id}/reject")
	public Market rejectMarket(@PathVariable UUID id) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		market.reject();

		return marketRepository.save(market);
	}
	
	@PostMapping("/{id}/resolve")
	public Market resolveMarket(@PathVariable UUID id, @Valid @RequestBody ResolveMarketRequest request) {
		return resolutionService.resolveMarket(id, request.result());
	}
}
