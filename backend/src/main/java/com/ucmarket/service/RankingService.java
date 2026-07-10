package com.ucmarket.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.RankingProfitResponse;
import com.ucmarket.repository.RankingProfitRow;
import com.ucmarket.repository.RankingRepository;
import com.ucmarket.dto.RankingWinRateResponse;
import com.ucmarket.repository.RankingWinRateRow;
import com.ucmarket.dto.RankingAssetsResponse;
import com.ucmarket.repository.RankingAssetsRow;

@Service
public class RankingService {

	private final RankingRepository rankingRepository;

	public RankingService(RankingRepository rankingRepository) {
		this.rankingRepository = rankingRepository;
	}

	@Transactional(readOnly = true)
	public List<RankingProfitResponse> getProfitRankings() {
		return rankingRepository.findProfitRankings()
				.stream()
				.map(this::toProfitResponse)
				.toList();
	}
	
	@Transactional(readOnly = true)
	public List<RankingWinRateResponse> getWinRateRankings() {
		return rankingRepository.findWinRateRankings()
				.stream()
				.map(this::toWinRateResponse)
				.toList();
		
	}
	
	@Transactional(readOnly = true)
	public List<RankingAssetsResponse> getAssetRankings() {
		return rankingRepository.findAssetRankings()
				.stream()
				.map(this::toAssetsResponse)
				.toList();
	}

	private RankingProfitResponse toProfitResponse(RankingProfitRow row) {
		return new RankingProfitResponse(
				row.getUserId(),
				row.getUsername(),
				row.getAvatarUrl(),
				row.getTotalPayout(),
				row.getSettledCost(),
				row.getRealizedProfit()
		);
	}
	private RankingWinRateResponse toWinRateResponse(RankingWinRateRow row) {
		return new RankingWinRateResponse(
				row.getUserId(),
				row.getUsername(),
				row.getAvatarUrl(),
				row.getResolvedMarketCount(),
				row.getCorrectCount(),
				row.getWinRate()
		);
	}
	
	private RankingAssetsResponse toAssetsResponse(RankingAssetsRow row) {
		return new RankingAssetsResponse(
				row.getUserId(),
				row.getUsername(),
				row.getAvatarUrl(),
				row.getWalletBalance(),
				row.getOpenPositionValue(),
				row.getTotalAssetValue()
		);
	}
}