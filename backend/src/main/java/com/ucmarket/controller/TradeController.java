package com.ucmarket.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.User;
import com.ucmarket.service.TradeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trades")
public class TradeController {

	private final TradeService tradeService;

	public TradeController(TradeService tradeService) {
		this.tradeService = tradeService;
	}

	@PostMapping
	public ResponseEntity<Trade> placeTrade(
			@AuthenticationPrincipal User user,
			@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
			@Valid @RequestBody TradeRequest request) {
		Trade trade = tradeService.placeTrade(user.getId(), request, idempotencyKey);
		return ResponseEntity.ok(trade);
	}
}
