package com.ucmarket.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

	private final MarketRepository marketRepository;

	public MarketController(MarketRepository marketRepository) {
		this.marketRepository = marketRepository;
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
	public Market createMarket(@Valid @RequestBody CreateMarketRequest request) {
		Market market = new Market(request.title(), request.description(), request.category(), request.sourceUrl(),
				request.resolutionRule(), request.closeAt());

		return marketRepository.save(market);
	}

	@PostMapping("/{id}/trades/quote")
	public TradeQuoteResponse quoteTrade(@PathVariable UUID id, @Valid @RequestBody TradeQuoteRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
		
		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}

		BigDecimal totalPool = market.getYesPool().add(market.getNoPool());
		BigDecimal sidePool = request.side() == MarketSide.YES
				? market.getNoPool()
				: market.getYesPool();

		BigDecimal price = sidePool.divide(totalPool, 4, RoundingMode.HALF_UP);
		BigDecimal estimatedCost = request.amount().multiply(price);

		return new TradeQuoteResponse(
				request.side(),
				request.amount(),
				price,
				estimatedCost
		);
	}
}
