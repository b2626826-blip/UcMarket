package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ucmarket.dto.RankingProfitResponse;
import com.ucmarket.repository.RankingProfitRow;
import com.ucmarket.repository.RankingRepository;
import com.ucmarket.dto.RankingWinRateResponse;
import com.ucmarket.repository.RankingWinRateRow;
import com.ucmarket.dto.RankingAssetsResponse;
import com.ucmarket.repository.RankingAssetsRow;

@ExtendWith(MockitoExtension.class)
class RankingServiceTest {

	@Mock
	private RankingRepository rankingRepository;

	@Mock
	private RankingProfitRow rankingProfitRow;
	
	@Mock
	private RankingWinRateRow rankingWinRateRow;
	
	@Mock
	private RankingAssetsRow rankingAssetsRow;

	@InjectMocks
	private RankingService rankingService;

	@Test
	void getProfitRankingsConvertsRowsToResponses() {
		UUID userId = UUID.randomUUID();

		when(rankingProfitRow.getUserId()).thenReturn(userId);
		when(rankingProfitRow.getUsername()).thenReturn("eagleaby");
		when(rankingProfitRow.getAccount()).thenReturn("USR-0001");
		when(rankingProfitRow.getPrimaryMarket()).thenReturn("Test market");
		when(rankingProfitRow.getAvatarUrl()).thenReturn("https://example.com/avatar.png");
		when(rankingProfitRow.getTotalPayout()).thenReturn(new BigDecimal("20.00"));
		when(rankingProfitRow.getSettledCost()).thenReturn(new BigDecimal("12.00"));
		when(rankingProfitRow.getRealizedProfit()).thenReturn(new BigDecimal("8.00"));
		when(rankingRepository.findProfitRankings()).thenReturn(List.of(rankingProfitRow));

		List<RankingProfitResponse> rankings = rankingService.getProfitRankings();

		assertThat(rankings).hasSize(1);

		RankingProfitResponse ranking = rankings.get(0);
		assertThat(ranking.userId()).isEqualTo(userId);
		assertThat(ranking.username()).isEqualTo("eagleaby");
		assertThat(ranking.account()).isEqualTo("USR-0001");
		assertThat(ranking.primaryMarket()).isEqualTo("Test market");
		assertThat(ranking.avatarUrl()).isEqualTo("https://example.com/avatar.png");
		assertThat(ranking.totalPayout()).isEqualByComparingTo("20.00");
		assertThat(ranking.settledCost()).isEqualByComparingTo("12.00");
		assertThat(ranking.realizedProfit()).isEqualByComparingTo("8.00");

		verify(rankingRepository).findProfitRankings();
	}
	
	@Test
	void getWinRateRankingsConvertsRowsToResponses() {
		UUID userId = UUID.randomUUID();

		when(rankingWinRateRow.getUserId()).thenReturn(userId);
		when(rankingWinRateRow.getUsername()).thenReturn("eagleaby");
		when(rankingWinRateRow.getAccount()).thenReturn("USR-0001");
		when(rankingWinRateRow.getPrimaryMarket()).thenReturn("Test market");
		when(rankingWinRateRow.getAvatarUrl()).thenReturn("https://example.com/avatar.png");
		when(rankingWinRateRow.getResolvedMarketCount()).thenReturn(4L);
		when(rankingWinRateRow.getCorrectCount()).thenReturn(3L);
		when(rankingWinRateRow.getWinRate()).thenReturn(new BigDecimal("0.7500"));
		when(rankingRepository.findWinRateRankings()).thenReturn(List.of(rankingWinRateRow));

		List<RankingWinRateResponse> rankings = rankingService.getWinRateRankings();

		assertThat(rankings).hasSize(1);

		RankingWinRateResponse ranking = rankings.get(0);
		assertThat(ranking.userId()).isEqualTo(userId);
		assertThat(ranking.username()).isEqualTo("eagleaby");
		assertThat(ranking.account()).isEqualTo("USR-0001");
		assertThat(ranking.primaryMarket()).isEqualTo("Test market");
		assertThat(ranking.resolvedMarketCount()).isEqualTo(4L);
		assertThat(ranking.correctCount()).isEqualTo(3L);
		assertThat(ranking.winRate()).isEqualByComparingTo("0.7500");

		verify(rankingRepository).findWinRateRankings();
	}
	
	@Test
	void getAssetRankingsConvertsRowsToResponses() {
		UUID userId = UUID.randomUUID();

		when(rankingAssetsRow.getUserId()).thenReturn(userId);
		when(rankingAssetsRow.getUsername()).thenReturn("eagleaby");
		when(rankingAssetsRow.getAccount()).thenReturn("USR-0001");
		when(rankingAssetsRow.getPrimaryMarket()).thenReturn("Test market");
		when(rankingAssetsRow.getAvatarUrl()).thenReturn("https://example.com/avatar.png");
		when(rankingAssetsRow.getWalletBalance()).thenReturn(new BigDecimal("100.00"));
		when(rankingAssetsRow.getOpenPositionValue()).thenReturn(new BigDecimal("12.50"));
		when(rankingAssetsRow.getTotalAssetValue()).thenReturn(new BigDecimal("112.50"));
		when(rankingRepository.findAssetRankings()).thenReturn(List.of(rankingAssetsRow));

		List<RankingAssetsResponse> rankings = rankingService.getAssetRankings();

		assertThat(rankings).hasSize(1);

		RankingAssetsResponse ranking = rankings.get(0);
		assertThat(ranking.userId()).isEqualTo(userId);
		assertThat(ranking.username()).isEqualTo("eagleaby");
		assertThat(ranking.account()).isEqualTo("USR-0001");
		assertThat(ranking.primaryMarket()).isEqualTo("Test market");
		assertThat(ranking.avatarUrl()).isEqualTo("https://example.com/avatar.png");
		assertThat(ranking.walletBalance()).isEqualByComparingTo("100.00");
		assertThat(ranking.openPositionValue()).isEqualByComparingTo("12.50");
		assertThat(ranking.totalAssetValue()).isEqualByComparingTo("112.50");

		verify(rankingRepository).findAssetRankings();
	}
}
