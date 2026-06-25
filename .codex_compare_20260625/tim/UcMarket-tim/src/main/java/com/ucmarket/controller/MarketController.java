package com.ucmarket.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.dto.MarketOddsResponse;
import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.UpdateMarketRequest;
import com.ucmarket.entity.User;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.service.TradeQuoteService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

	private final MarketRepository marketRepository;
	private final TradeQuoteService tradeQuoteService;

	public MarketController(MarketRepository marketRepository, TradeQuoteService tradeQuoteService) {
		this.marketRepository = marketRepository;
		this.tradeQuoteService = tradeQuoteService;
	}

	@GetMapping
	public List<Market> listMarkets() {
		return marketRepository.findAll();
	}

	@GetMapping("/{id}")
	public Market getMarket(@PathVariable UUID id) {
		return marketRepository.findById(id).orElseThrow();
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

		if (request.title() != null)
			market.setTitle(request.title());
		if (request.description() != null)
			market.setDescription(request.description());
		if (request.category() != null)
			market.setCategory(request.category());
		if (request.marketType() != null)
			market.setMarketType(request.marketType());
		if (request.sourceUrl() != null)
			market.setSourceUrl(request.sourceUrl());
		if (request.resolutionRule() != null)
			market.setResolutionRule(request.resolutionRule());
		if (request.closeAt() != null)
			market.setCloseAt(request.closeAt());

		return marketRepository.save(market);
	}

	@PostMapping("/{id}/cancel")
	public Market cancelMarket(@PathVariable UUID id, @AuthenticationPrincipal User user) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (!market.getCreatorId().equals(user.getId()) && !user.getRole().name().equals("ADMIN")) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN);
		}

		market.cancel();
		return marketRepository.save(market);
	}

	// ------------------

	@PostMapping("/{id}/trades/getquote")
	public TradeQuoteResponse quoteTrade(@PathVariable UUID id, @RequestBody TradeQuoteRequest request) { 

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

	    BigDecimal yesOdds = tradeQuoteService.getMarketOdds(market, MarketSide.YES);
	    BigDecimal noOdds = tradeQuoteService.getMarketOdds(market, MarketSide.NO);

	    return new MarketOddsResponse(
	            yesOdds,
	            noOdds,
	            market.getYesPool(),
	            market.getNoPool()
	        );
	}
}
