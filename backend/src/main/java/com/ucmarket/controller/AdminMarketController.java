package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@RestController
@RequestMapping("/api/admin/markets")
public class AdminMarketController {

	private final MarketRepository marketRepository;

	public AdminMarketController(MarketRepository marketRepository) {
		this.marketRepository = marketRepository;
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
}