package com.ucmarket.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;


@WebMvcTest(AdminMarketController.class)
class AdminMarketControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MarketRepository marketRepository;

	@Test
	void listPendingMarketsReturnsOnlyPendingMarkets() throws Exception {
		Market pendingMarket = new Market("Will UC beat UCLA this year?", "A test prediction market", "sports",
				"https://example.com/result", "Resolve YES if UC wins the game.", null);

		when(marketRepository.findByStatus(MarketStatus.PENDING)).thenReturn(List.of(pendingMarket));

		mockMvc.perform(get("/api/admin/markets/pending")).andExpect(status().isOk())
				.andExpect(jsonPath("$[0].title").value("Will UC beat UCLA this year?"))
				.andExpect(jsonPath("$[0].status").value("PENDING"));
	}
	
	@Test
	void approvePendingMarketChangesStatusToActive() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market pendingMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(pendingMarket));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/admin/markets/{id}/approve", marketId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ACTIVE"));

		verify(marketRepository).save(pendingMarket);
	}
	
	@Test
	void approveMissingMarketReturnsNotFound() throws Exception {
		UUID marketId = UUID.randomUUID();

		when(marketRepository.findById(marketId)).thenReturn(Optional.empty());

		mockMvc.perform(post("/api/admin/markets/{id}/approve", marketId))
				.andExpect(status().isNotFound());
	}
	
	@Test
	void rejectMissingMarketReturnsNotFound() throws Exception {
		UUID marketId = UUID.randomUUID();

		when(marketRepository.findById(marketId)).thenReturn(Optional.empty());

		mockMvc.perform(post("/api/admin/markets/{id}/reject", marketId))
				.andExpect(status().isNotFound());
	}
	
	@Test
	void rejectPendingMarketChangesStatusToRejected() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market pendingMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(pendingMarket));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/admin/markets/{id}/reject", marketId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("REJECTED"));

		verify(marketRepository).save(pendingMarket);
	}
}