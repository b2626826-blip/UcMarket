package com.ucmarket.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.RankingProfitResponse;
import com.ucmarket.repository.RankingProfitRow;
import com.ucmarket.repository.RankingRepository;
import com.ucmarket.dto.RankingWinRateResponse;
import com.ucmarket.repository.RankingWinRateRow;
import com.ucmarket.dto.RankingAssetsResponse;
import com.ucmarket.repository.RankingAssetsRow;
import com.ucmarket.dto.RankingSnapshotItemResponse;
import com.ucmarket.dto.RankingSnapshotResponse;
import com.ucmarket.repository.RankingSnapshotRow;

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

	@Transactional(readOnly = true)
	public RankingSnapshotResponse getRankingSnapshot(String metric) {
		if (!List.of("profit", "win-rate", "assets").contains(metric)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported ranking metric: " + metric);
		}

		List<RankingSnapshotRow> rows = rankingRepository.findRankingSnapshot(metric);
		var asOf = toInstant(rows.getFirst().getAsOf());
		return new RankingSnapshotResponse(
				metric,
				asOf,
				rows.stream()
						.filter(row -> row.getUserId() != null)
						.map(this::toSnapshotItemResponse)
						.toList()
		);
	}

	private Instant toInstant(Object value) {
		if (value instanceof Instant instant) {
			return instant;
		}
		if (value instanceof OffsetDateTime offsetDateTime) {
			return offsetDateTime.toInstant();
		}
		throw new IllegalStateException("Unsupported ranking timestamp type: " + value.getClass().getName());
	}

	private RankingProfitResponse toProfitResponse(RankingProfitRow row) {
		return new RankingProfitResponse(
				row.getUserId(),
				row.getUsername(),
				row.getAccount(),
				row.getPrimaryMarket(),
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
				row.getAccount(),
				row.getPrimaryMarket(),
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
				row.getAccount(),
				row.getPrimaryMarket(),
				row.getAvatarUrl(),
				row.getWalletBalance(),
				row.getOpenPositionValue(),
				row.getTotalAssetValue()
		);
	}

	private RankingSnapshotItemResponse toSnapshotItemResponse(RankingSnapshotRow row) {
		return new RankingSnapshotItemResponse(
				row.getRank(),
				row.getUserId(),
				row.getUsername(),
				row.getAccount(),
				row.getPrimaryMarket(),
				row.getAvatarUrl(),
				row.getRealizedProfit(),
				row.getWinRate(),
				row.getResolvedMarketCount(),
				row.getTotalAssetValue()
		);
	}
}
