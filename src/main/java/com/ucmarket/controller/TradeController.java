package com.ucmarket.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.service.TradeQuoteService;
import com.ucmarket.service.TradeService;

import jakarta.validation.Valid;

//@RestController
//@RequestMapping("/api/markets")

@RestController
@RequestMapping("/api/trades")
public class TradeController {
	private final TradeService tradeService;
	private final TradeQuoteService tradeQuoteService;

	public TradeController(TradeService tradeService, TradeQuoteService tradeQuoteService) {
		this.tradeService = tradeService;
		this.tradeQuoteService = tradeQuoteService;
	}

	@PostMapping("/bet")
	public ResponseEntity<Trade> placeTrade(@AuthenticationPrincipal User user,
			@Valid @RequestBody TradeRequest request) {

		Trade trade = tradeService.placeTrade(user.getId(), request);
		return ResponseEntity.ok(trade);
	}
	@PostMapping("/quote")
	public ResponseEntity<TradeQuoteResponse> getQuote(
	        @Valid @RequestBody TradeRequest request) {

	    return ResponseEntity.ok(tradeService.getQuote(request));
	}
}
