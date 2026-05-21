package com.ucmarket.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

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
}