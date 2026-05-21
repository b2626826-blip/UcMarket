package com.ucmarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@WebMvcTest(MarketController.class)
class MarketControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MarketRepository marketRepository;

	@Test
	void createMarketReturnsCreatedMarket() throws Exception {
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/markets")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "title": "Will UC beat UCLA this year?",
					  "description": "A test prediction market",
					  "category": "sports",
					  "sourceUrl": "https://example.com/result",
					  "resolutionRule": "Resolve YES if UC wins the game.",
					  "closeAt": "2026-12-31T23:59:59"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.title").value("Will UC beat UCLA this year?"))
			.andExpect(jsonPath("$.description").value("A test prediction market"))
			.andExpect(jsonPath("$.category").value("sports"))
			.andExpect(jsonPath("$.sourceUrl").value("https://example.com/result"))
			.andExpect(jsonPath("$.resolutionRule").value("Resolve YES if UC wins the game."))
			.andExpect(jsonPath("$.closeAt").value("2026-12-31T23:59:59"))
			.andExpect(jsonPath("$.status").value(MarketStatus.PENDING.name()))
			.andExpect(jsonPath("$.yesPool").value(100))
			.andExpect(jsonPath("$.noPool").value(100));

		ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
		verify(marketRepository).save(captor.capture());
		Market savedMarket = captor.getValue();
		org.assertj.core.api.Assertions.assertThat(savedMarket.getTitle()).isEqualTo("Will UC beat UCLA this year?");
		org.assertj.core.api.Assertions.assertThat(savedMarket.getCloseAt().toString()).isEqualTo("2026-12-31T23:59:59");
	}

	@Test
	void createMarketRejectsBlankTitle() throws Exception {
		mockMvc.perform(post("/api/markets")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "title": "",
					  "description": "A test prediction market",
					  "category": "sports",
					  "sourceUrl": "https://example.com/result",
					  "resolutionRule": "Resolve YES if UC wins the game.",
					  "closeAt": "2026-12-31T23:59:59"
					}
					"""))
			.andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any());
	}
}
