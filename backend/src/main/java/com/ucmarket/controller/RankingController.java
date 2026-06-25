package com.ucmarket.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ucmarket.dto.RankingWinRateResponse;

import com.ucmarket.dto.RankingProfitResponse;
import com.ucmarket.service.RankingService;
import com.ucmarket.dto.RankingAssetsResponse;

@RestController
@RequestMapping("/api/rankings")
public class RankingController {

	private final RankingService rankingService;

	public RankingController(RankingService rankingService) {
		this.rankingService = rankingService;
	}

	@GetMapping("/profit")
	public List<RankingProfitResponse> getProfitRankings() {
		return rankingService.getProfitRankings();
	}
	
	@GetMapping("/win-rate")
	public List<RankingWinRateResponse> getWinRateRankings() {
		return rankingService.getWinRateRankings();
	}
	
	@GetMapping("/assets")
	public List<RankingAssetsResponse> getAssetRankings() {
	    return rankingService.getAssetRankings();
	}
}