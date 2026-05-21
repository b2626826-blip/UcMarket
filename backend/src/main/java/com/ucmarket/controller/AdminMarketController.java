package com.ucmarket.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}