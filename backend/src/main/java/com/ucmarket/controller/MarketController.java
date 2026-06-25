package com.ucmarket.controller;

import java.math.BigDecimal;
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
import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.UpdateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.service.TradeQuoteService;
import com.ucmarket.service.WalletService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

	private final MarketRepository marketRepository;
	private final PositionRepository positionRepository;
	private final WalletService walletService;
	private final TradeQuoteService tradeQuoteService;

	public MarketController(MarketRepository marketRepository, PositionRepository positionRepository,
			WalletService walletService, TradeQuoteService tradeQuoteService) {
		this.marketRepository = marketRepository;
		this.positionRepository = positionRepository;
		this.walletService = walletService;
		this.tradeQuoteService = tradeQuoteService;
	}

	@GetMapping
	public List<Market> listMarkets(@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		var pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("createdAt").descending());
		return marketRepository.findAll(pageable).getContent();
	}

	@GetMapping("/{id}")
	public Market getMarket(@PathVariable UUID id) {
		return marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	@GetMapping("/code/{code}")
	public Market getMarketByCode(@PathVariable String code) {
		return marketRepository.findByCode(code)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Market createMarket(@AuthenticationPrincipal User user, @Valid @RequestBody CreateMarketRequest request) {
		Market market = new Market(request.title(), request.description(), request.category(), request.marketType(),
				request.sourceUrl(), request.resolutionRule(), request.closeAt());
		market.setCreatorId(user.getId());

		return marketRepository.save(market);
	}

	@PostMapping("/{id}/submit")
	public Market submitMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (!market.getCreatorId().equals(user.getId())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		}
		if (market.getStatus() != MarketStatus.DRAFT) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT markets can be submitted");
		}

		market.changeStatus(MarketStatus.PENDING);
		return marketRepository.save(market);
	}

	@PutMapping("/{id}")
	public Market updateMarket(@PathVariable UUID id, @AuthenticationPrincipal User user,
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

		return marketRepository.save(market);
	}

	@PostMapping("/{id}/cancel")
	public Market cancelMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (!market.getCreatorId().equals(user.getId())
				&& user.getRole() != UserRole.ADMIN) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		}

		market.cancel();
		Market saved = marketRepository.save(market);
		refundPositions(saved);
		return saved;
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

	private void refundPositions(Market market) {
		List<Position> positions = positionRepository.findByMarketIdAndStatus(market.getId(), PositionStatus.OPEN);
		for (Position position : positions) {
			BigDecimal refundAmount = position.getYesCost().add(position.getNoCost());
			if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
				walletService.credit(position.getUserId(), refundAmount, "MARKET", market.getId(),
						"cancel:" + market.getId() + ":" + position.getId());
			}
			position.cancel();
		}
		positionRepository.saveAll(positions);
	}
}
