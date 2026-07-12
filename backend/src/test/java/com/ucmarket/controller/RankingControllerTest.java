package com.ucmarket.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.dto.RankingWinRateResponse;
import com.ucmarket.dto.RankingProfitResponse;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.RankingService;
import com.ucmarket.dto.RankingAssetsResponse;
import com.ucmarket.dto.RankingSnapshotItemResponse;
import com.ucmarket.dto.RankingSnapshotResponse;

@WebMvcTest(RankingController.class)
@AutoConfigureMockMvc(addFilters = false)
class RankingControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private RankingService rankingService;

	@MockitoBean
	private JwtTokenProvider jwtTokenProvider;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void getProfitRankingsReturnsRankedUsers() throws Exception {
		UUID userId = UUID.randomUUID();

		RankingProfitResponse ranking = new RankingProfitResponse(
				userId,
				"eagleaby",
				"USR-0001",
				"Test market",
				"https://example.com/avatar.png",
				new BigDecimal("20.00"),
				new BigDecimal("12.00"),
				new BigDecimal("8.00")
		);

		when(rankingService.getProfitRankings()).thenReturn(List.of(ranking));

		mockMvc.perform(get("/api/rankings/profit"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].userId").value(userId.toString()))
				.andExpect(jsonPath("$[0].username").value("eagleaby"))
				.andExpect(jsonPath("$[0].account").value("USR-0001"))
				.andExpect(jsonPath("$[0].primaryMarket").value("Test market"))
				.andExpect(jsonPath("$[0].avatarUrl").value("https://example.com/avatar.png"))
				.andExpect(jsonPath("$[0].totalPayout").value(20.00))
				.andExpect(jsonPath("$[0].settledCost").value(12.00))
				.andExpect(jsonPath("$[0].realizedProfit").value(8.00));

		verify(rankingService).getProfitRankings();
	}
	
	@Test
	void getWinRateRankingsReturnsRankedUsers() throws Exception {
		UUID userId = UUID.randomUUID();

		RankingWinRateResponse ranking = new RankingWinRateResponse(
				userId,
				"eagleaby",
				"USR-0001",
				"Test market",
				"https://example.com/avatar.png",
				4L,
				3L,
				new BigDecimal("0.7500")
		);

		when(rankingService.getWinRateRankings()).thenReturn(List.of(ranking));

		mockMvc.perform(get("/api/rankings/win-rate"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].userId").value(userId.toString()))
				.andExpect(jsonPath("$[0].username").value("eagleaby"))
				.andExpect(jsonPath("$[0].account").value("USR-0001"))
				.andExpect(jsonPath("$[0].primaryMarket").value("Test market"))
				.andExpect(jsonPath("$[0].resolvedMarketCount").value(4))
				.andExpect(jsonPath("$[0].correctCount").value(3))
				.andExpect(jsonPath("$[0].winRate").value(0.7500));

		verify(rankingService).getWinRateRankings();
	}
	
	@Test
	void getAssetRankingsReturnsRankedUsers() throws Exception {
		UUID userId = UUID.randomUUID();

		RankingAssetsResponse ranking = new RankingAssetsResponse(
				userId,
				"eagleaby",
				"USR-0001",
				"Test market",
				"https://example.com/avatar.png",
				new BigDecimal("100.00"),
				new BigDecimal("12.50"),
				new BigDecimal("112.50")
		);

		when(rankingService.getAssetRankings()).thenReturn(List.of(ranking));

		mockMvc.perform(get("/api/rankings/assets"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].userId").value(userId.toString()))
				.andExpect(jsonPath("$[0].username").value("eagleaby"))
				.andExpect(jsonPath("$[0].account").value("USR-0001"))
				.andExpect(jsonPath("$[0].primaryMarket").value("Test market"))
				.andExpect(jsonPath("$[0].walletBalance").value(100.00))
				.andExpect(jsonPath("$[0].openPositionValue").value(12.50))
				.andExpect(jsonPath("$[0].totalAssetValue").value(112.50));

		verify(rankingService).getAssetRankings();
	}

	@Test
	void getRankingSnapshotReturnsSelectedMetricAndAsOf() throws Exception {
		UUID userId = UUID.randomUUID();
		RankingSnapshotResponse snapshot = new RankingSnapshotResponse(
				"assets",
				Instant.parse("2026-07-10T08:23:41Z"),
				List.of(new RankingSnapshotItemResponse(
						1L, userId, "eagleaby", "USR-0001", "Test market",
						"https://example.com/avatar.png", new BigDecimal("8.00"),
						new BigDecimal("0.7500"), 4L, new BigDecimal("112.50")
				))
		);

		when(rankingService.getRankingSnapshot("assets")).thenReturn(snapshot);

		mockMvc.perform(get("/api/rankings").param("metric", "assets"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.metric").value("assets"))
				.andExpect(jsonPath("$.asOf").value("2026-07-10T08:23:41Z"))
				.andExpect(jsonPath("$.items[0].rank").value(1))
				.andExpect(jsonPath("$.items[0].userId").value(userId.toString()))
				.andExpect(jsonPath("$.items[0].totalAssetValue").value(112.50));

		verify(rankingService).getRankingSnapshot("assets");
	}
}
