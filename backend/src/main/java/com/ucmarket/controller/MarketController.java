package com.ucmarket.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.dto.MarketOddsResponse;
import com.ucmarket.dto.MarketResponse;
import com.ucmarket.dto.PageResponse;
import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.UpdateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.service.MarketService;
import com.ucmarket.service.PriceHistoryService;
import com.ucmarket.service.TradeQuoteService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

	private final MarketRepository marketRepository;
	private final TradeRepository tradeRepository;
	private final MarketService marketService;
	private final TradeQuoteService tradeQuoteService;
	private final PriceHistoryService priceHistoryService;
	private final ObjectMapper objectMapper;
	private static final String FINANCE_CATEGORY = "金融";
	private static final TypeReference<Map<String, Object>> METADATA_TYPE = new TypeReference<>() {};

	public MarketController(MarketRepository marketRepository, TradeRepository tradeRepository, MarketService marketService,
			TradeQuoteService tradeQuoteService, PriceHistoryService priceHistoryService, ObjectMapper objectMapper) {
		this.marketRepository = marketRepository;
		this.tradeRepository = tradeRepository;
		this.marketService = marketService;
		this.tradeQuoteService = tradeQuoteService;
		this.priceHistoryService = priceHistoryService;
		this.objectMapper = objectMapper;
	}

	@GetMapping
	public List<MarketResponse> listMarkets(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(required = false) String category) {
		var pageable = PageRequest.of(
				Math.max(page, 0),
				Math.max(size, 1),
				Sort.by("createdAt").descending());

		List<Market> markets;
		if (category != null && !category.isBlank()) {
			markets = marketRepository
					.findByCategoryAndStatus(category, MarketStatus.ACTIVE, pageable)
					.getContent();
			return toResponses(markets);
		}

		markets = marketRepository.findByStatus(MarketStatus.ACTIVE, pageable).getContent();
		return toResponses(markets);
	}

	private static final List<MarketStatus> MY_REVIEW_STATUSES = List.of(
			MarketStatus.PENDING,
			MarketStatus.ACTIVE,
			MarketStatus.CLOSED,
			MarketStatus.RESOLVED,
			MarketStatus.REJECTED);

	@GetMapping("/me")
	public PageResponse<MarketResponse> listMyMarkets(
			@AuthenticationPrincipal User user,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size) {
		var pageable = PageRequest.of(
				Math.max(page, 0),
				Math.max(size, 1),
				Sort.by("createdAt").descending());
		Page<Market> markets = marketRepository.findByCreatorIdAndStatusIn(
				user.getId(), MY_REVIEW_STATUSES, pageable);
		return PageResponse.of(new PageImpl<>(
				toResponses(markets.getContent()),
				pageable,
				markets.getTotalElements()));
	}

	@GetMapping("/{id}")
	public MarketResponse getMarket(@PathVariable UUID id) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
		return toResponses(List.of(market)).getFirst();
	}

	@GetMapping("/code/{code}")
	public MarketResponse getMarketByCode(@PathVariable String code) {
		Market market = marketRepository.findByCode(code)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
		return toResponses(List.of(market)).getFirst();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Market createMarket(@AuthenticationPrincipal User user, @Valid @RequestBody CreateMarketRequest request) {
		Market market = new Market(request.title(), request.description(), request.category(), request.marketType(),
				request.sourceUrl(), request.resolutionRule(), request.closeAt());
		market.setCreatorId(user.getId());
		market.setImageUrl(request.imageUrl());
		mergeFinanceMetadata(market, request.category(), request.tradingViewSymbol());

		return marketRepository.save(market);
	}

	@PostMapping("/{id}/submit")
	public Market submitMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		return marketService.submitMarket(id, user.getId(), user.getRole() == UserRole.ADMIN);
	}

	@PutMapping("/{id}")
	public Market updateMarket(@PathVariable UUID id, @AuthenticationPrincipal User user,
			@Valid @RequestBody UpdateMarketRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (!market.getCreatorId().equals(user.getId())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		}
		if (market.getStatus() != MarketStatus.DRAFT) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT markets can be edited");
		}

		if (request.title() != null) market.setTitle(request.title());
		if (request.description() != null) market.setDescription(request.description());
		if (request.category() != null) market.setCategory(request.category());
		if (request.marketType() != null) market.setMarketType(request.marketType());
		if (request.sourceUrl() != null) market.setSourceUrl(request.sourceUrl());
		if (request.imageUrl() != null) market.setImageUrl(request.imageUrl());
		String category = request.category() != null ? request.category() : market.getCategory();
		if (isFinanceCategory(category)) {
			String tradingViewSymbol = request.tradingViewSymbol() != null
					? request.tradingViewSymbol()
					: readTradingViewSymbol(market.getMetadata());
			mergeFinanceMetadata(market, category, tradingViewSymbol);
		}
		if (request.resolutionRule() != null) market.setResolutionRule(request.resolutionRule());
		if (request.closeAt() != null) market.setCloseAt(request.closeAt());

		return marketRepository.save(market);
	}

	private void mergeFinanceMetadata(Market market, String category, String tradingViewSymbol) {
		if (!isFinanceCategory(category)) {
			return;
		}

		Map<String, Object> metadata = parseMetadata(market.getMetadata());
		metadata.put("type", "FINANCE");

		String normalizedSymbol = normalizeTradingViewSymbol(tradingViewSymbol);
		if (normalizedSymbol == null) {
			metadata.remove("tradingViewSymbol");
		} else {
			metadata.put("tradingViewSymbol", normalizedSymbol);
		}

		market.setMetadata(writeMetadata(metadata));
	}

	private boolean isFinanceCategory(String category) {
		return FINANCE_CATEGORY.equals(category);
	}

	private String normalizeTradingViewSymbol(String tradingViewSymbol) {
		if (tradingViewSymbol == null) {
			return null;
		}
		String normalized = tradingViewSymbol.trim();
		return normalized.isEmpty() ? null : normalized;
	}

	private String readTradingViewSymbol(String rawMetadata) {
		Object tradingViewSymbol = parseMetadata(rawMetadata).get("tradingViewSymbol");
		return tradingViewSymbol instanceof String value ? value : null;
	}

	private Map<String, Object> parseMetadata(String rawMetadata) {
		if (rawMetadata == null || rawMetadata.isBlank()) {
			return new LinkedHashMap<>();
		}
		try {
			return new LinkedHashMap<>(objectMapper.readValue(rawMetadata, METADATA_TYPE));
		} catch (JsonProcessingException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Market metadata is invalid JSON", e);
		}
	}

	private String writeMetadata(Map<String, Object> metadata) {
		try {
			return objectMapper.writeValueAsString(metadata);
		} catch (JsonProcessingException e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize market metadata", e);
		}
	}

	private List<MarketResponse> toResponses(List<Market> markets) {
		if (markets.isEmpty()) {
			return List.of();
		}

		List<UUID> marketIds = markets.stream().map(Market::getId).toList();
		Map<UUID, BigDecimal> volumes = tradeRepository
				.findVolumesByMarketIds(marketIds)
				.stream()
				.collect(Collectors.toMap(
						volume -> volume.getMarketId(),
						volume -> volume.getVolume()));

		return markets.stream()
				.map(market -> MarketResponse.from(market, volumes.getOrDefault(market.getId(), BigDecimal.ZERO)))
				.toList();
	}

	@PostMapping("/{id}/cancel")
	public Market cancelMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		try {
			return marketService.cancelMarket(id, user.getId(), user.getRole() == UserRole.ADMIN);
		} catch (EntityNotFoundException e) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage(), e);
		} catch (IllegalArgumentException e) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage(), e);
		} catch (IllegalStateException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
		}
	}

	@PostMapping("/{id}/trades/getquote")
	public TradeQuoteResponse quoteTrade(@PathVariable UUID id, @Valid @RequestBody TradeQuoteRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "市場未啟用");
		}

		return tradeQuoteService.getQuote(market, request.side(), request.amount());
	}

	@PostMapping("/{id}/trades/quote")
	public TradeQuoteResponse quoteTradeAlias(@PathVariable UUID id, @Valid @RequestBody TradeQuoteRequest request) {
		return quoteTrade(id, request);
	}

	public record MarketPriceHistoryResponse(
		LocalDateTime recordedAt,
		BigDecimal yesPrice,
		BigDecimal noPrice,
		BigDecimal tradeVolume
	) {}

	@GetMapping("/{id}/price-history")
	public List<MarketPriceHistoryResponse> getPriceHistory(
			@PathVariable UUID id,
			@RequestParam(required = false)
			@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
			@RequestParam(required = false)
			@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

		marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		LocalDateTime now = LocalDateTime.now();
		if (from == null) from = now.minusDays(1);
		if (to == null) to = now;

		return priceHistoryService.findHistory(id, from, to).stream()
				.map(h -> new MarketPriceHistoryResponse(
						h.getRecordedAt(),
						h.getYesPrice(),
						h.getNoPrice(),
						h.getTradeVolume()
				))
				.toList();
	}

	@GetMapping("/{id}/odds")
	public MarketOddsResponse getOdds(@PathVariable UUID id) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		BigDecimal totalVolume = tradeRepository.sumAmountByMarketId(id);
		if (totalVolume == null) {
			totalVolume = BigDecimal.ZERO;
		}

		return new MarketOddsResponse(
				tradeQuoteService.getMarketOdds(market, MarketSide.YES),
				tradeQuoteService.getMarketOdds(market, MarketSide.NO),
				market.getYesPool(),
				market.getNoPool(),
				totalVolume
		);
	}
}
