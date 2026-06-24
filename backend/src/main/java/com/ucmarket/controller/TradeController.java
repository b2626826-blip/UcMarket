package com.ucmarket.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/markets")
@Profile("legacy-trade-controller")
public class TradeController {

	private final MarketRepository marketRepository;
	private final TradeRepository tradeRepository;

	public TradeController(MarketRepository marketRepository, TradeRepository tradeRepository) {
		this.marketRepository = marketRepository;
		this.tradeRepository = tradeRepository;
	}

	@PostMapping("/{id}/trades/quote")
	public TradeQuoteResponse quoteTrade(@PathVariable UUID id, @Valid @RequestBody TradeQuoteRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}

		return buildQuote(market, request);
	}

	@PostMapping("/{id}/trades")
	@ResponseStatus(HttpStatus.CREATED)
	public TradeQuoteResponse executeTrade(@PathVariable UUID id, @AuthenticationPrincipal User user,
			@Valid @RequestBody TradeQuoteRequest request) {
		Market market = marketRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

		if (market.getStatus() != MarketStatus.ACTIVE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
		}

		TradeQuoteResponse quote = buildQuote(market, request);
		BigDecimal shares = request.amount().divide(quote.price(), 4, RoundingMode.HALF_UP);

		market.buy(request.side(), request.amount());
		marketRepository.save(market);

		Trade trade = new Trade(
				user.getId(),
				id,
				request.side(),
				TradeAction.BUY,
				request.amount(),
				quote.price(),
				shares
		);
		tradeRepository.save(trade);

		return quote;
	}

	private TradeQuoteResponse buildQuote(Market market, TradeQuoteRequest request) {
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
