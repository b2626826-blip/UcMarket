package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.dto.MarketOddsResponse;
import com.ucmarket.dto.MarketResponse;
import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.UpdateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.service.MarketService;
import com.ucmarket.service.TradeQuoteService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

	private final MarketRepository marketRepository;
	private final MarketService marketService;
	private final TradeQuoteService tradeQuoteService;

	public MarketController(MarketRepository marketRepository,
			MarketService marketService,
			TradeQuoteService tradeQuoteService) {
		this.marketRepository = marketRepository;
		this.marketService = marketService;
		this.tradeQuoteService = tradeQuoteService;
	}

	@GetMapping
	public List<MarketResponse> listMarkets(@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		var pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("createdAt").descending());
		return marketRepository.findAll(pageable).getContent().stream()
				.map(MarketResponse::from)
				.toList();
	}

	@GetMapping("/{id}")
	public MarketResponse getMarket(@PathVariable UUID id) {
		return marketRepository.findById(id)
				.map(MarketResponse::from)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	@GetMapping("/code/{code}")
	public MarketResponse getMarketByCode(@PathVariable String code) {
		return marketRepository.findByCode(code)
				.map(MarketResponse::from)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public MarketResponse createMarket(@AuthenticationPrincipal User user, @Valid @RequestBody CreateMarketRequest request) {
		Market market = new Market(request.title(), request.description(), request.category(), request.marketType(),
				request.sourceUrl(), request.resolutionRule(), request.closeAt());
		market.setCreatorId(user.getId());

		return MarketResponse.from(marketRepository.save(market));
	}

	@PostMapping("/{id}/submit")
	public MarketResponse submitMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (!market.getCreatorId().equals(user.getId())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		}
		if (market.getStatus() != MarketStatus.DRAFT) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT markets can be submitted");
		}

		market.changeStatus(MarketStatus.PENDING);
		return MarketResponse.from(marketRepository.save(market));
	}

	@PutMapping("/{id}")
	public MarketResponse updateMarket(@PathVariable UUID id, @AuthenticationPrincipal User user,
			@RequestBody UpdateMarketRequest request) {
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
		if (request.resolutionRule() != null) market.setResolutionRule(request.resolutionRule());
		if (request.closeAt() != null) market.setCloseAt(request.closeAt());

		return MarketResponse.from(marketRepository.save(market));
	}

	@PostMapping("/{id}/cancel")
	public MarketResponse cancelMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		if (!marketRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}
		boolean isAdmin = user.getRole() == UserRole.ADMIN;
		Market market = marketService.cancelMarket(id, user.getId(), isAdmin);
		return MarketResponse.from(market);
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

	@GetMapping("/{id}/odds")
	public MarketOddsResponse getOdds(@PathVariable UUID id) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		return new MarketOddsResponse(
				tradeQuoteService.getMarketOdds(market, MarketSide.YES),
				tradeQuoteService.getMarketOdds(market, MarketSide.NO),
				market.getYesPool(),
				market.getNoPool()
		);
	}
}
