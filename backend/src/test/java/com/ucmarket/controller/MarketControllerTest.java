package com.ucmarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.repository.TradeRepository;

@WebMvcTest(MarketController.class)
class MarketControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MarketRepository marketRepository;
	
	@MockitoBean
	private TradeRepository tradeRepository;

	@Test
	void createMarketReturnsCreatedMarket() throws Exception {
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/markets").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "title": "Will UC beat UCLA this year?",
				  "description": "A test prediction market",
				  "category": "sports",
				  "sourceUrl": "https://example.com/result",
				  "resolutionRule": "Resolve YES if UC wins the game.",
				  "closeAt": "2026-12-31T23:59:59"
				}
				""")).andExpect(status().isCreated())
				.andExpect(jsonPath("$.title").value("Will UC beat UCLA this year?"))
				.andExpect(jsonPath("$.description").value("A test prediction market"))
				.andExpect(jsonPath("$.category").value("sports"))
				.andExpect(jsonPath("$.sourceUrl").value("https://example.com/result"))
				.andExpect(jsonPath("$.resolutionRule").value("Resolve YES if UC wins the game."))
				.andExpect(jsonPath("$.closeAt").value("2026-12-31T23:59:59"))
				.andExpect(jsonPath("$.status").value(MarketStatus.PENDING.name()))
				.andExpect(jsonPath("$.yesPool").value(100)).andExpect(jsonPath("$.noPool").value(100));

		ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
		verify(marketRepository).save(captor.capture());
		Market savedMarket = captor.getValue();
		org.assertj.core.api.Assertions.assertThat(savedMarket.getTitle()).isEqualTo("Will UC beat UCLA this year?");
		org.assertj.core.api.Assertions.assertThat(savedMarket.getCloseAt().toString())
				.isEqualTo("2026-12-31T23:59:59");
	}

	@Test
	void createMarketRejectsBlankTitle() throws Exception {
		mockMvc.perform(post("/api/markets").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "title": "",
				  "description": "A test prediction market",
				  "category": "sports",
				  "sourceUrl": "https://example.com/result",
				  "resolutionRule": "Resolve YES if UC wins the game.",
				  "closeAt": "2026-12-31T23:59:59"
				}
				""")).andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any());
	}

	@Test
	void quoteTradeReturnsQuoteDetails() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(post("/api/markets/{id}/trades/quote", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 10
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.side").value("YES"))
			.andExpect(jsonPath("$.amount").value(10))
			.andExpect(jsonPath("$.price").value(0.5))
			.andExpect(jsonPath("$.estimatedCost").value(5.0));
		
		verify(marketRepository, never()).save(any(Market.class));
	}

	@Test
	void quoteTradeMissingMarketReturnsNotFound() throws Exception {
		UUID marketId = UUID.randomUUID();

		when(marketRepository.findById(marketId)).thenReturn(Optional.empty());

		mockMvc.perform(
				post("/api/markets/{id}/trades/quote", marketId).contentType(MediaType.APPLICATION_JSON).content("""
						{
						  "side": "YES",
						  "amount": 10
						}
						""")).andExpect(status().isNotFound());

		verify(marketRepository, never()).save(any(Market.class));
	}

	@Test
	void quoteTradeRejectsMissingSide() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market("Will UC beat UCLA this year?", "A test prediction market", "sports",
				"https://example.com/result", "Resolve YES if UC wins the game.", null);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(
				post("/api/markets/{id}/trades/quote", marketId).contentType(MediaType.APPLICATION_JSON).content("""
						{
						  "amount": 10
						}
						""")).andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any(Market.class));
	}

	@Test
	void quoteTradeRejectsMissingAmount() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market("Will UC beat UCLA this year?", "A test prediction market", "sports",
				"https://example.com/result", "Resolve YES if UC wins the game.", null);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(
				post("/api/markets/{id}/trades/quote", marketId).contentType(MediaType.APPLICATION_JSON).content("""
						{
						  "side": "YES"
						}
						""")).andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any(Market.class));
	}

	@Test
	void quoteTradeRejectsZeroAmount() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market("Will UC beat UCLA this year?", "A test prediction market", "sports",
				"https://example.com/result", "Resolve YES if UC wins the game.", null);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(
				post("/api/markets/{id}/trades/quote", marketId).contentType(MediaType.APPLICATION_JSON).content("""
						{
						  "side": "YES",
						  "amount": 0
						}
						""")).andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any(Market.class));
	}
	
	@Test
	void quoteTradeCanQuoteNoSide() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(post("/api/markets/{id}/trades/quote", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "NO",
					  "amount": 10
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.side").value("NO"))
			.andExpect(jsonPath("$.amount").value(10))
			.andExpect(jsonPath("$.price").value(0.5))
			.andExpect(jsonPath("$.estimatedCost").value(5.0));

		verify(marketRepository, never()).save(any(Market.class));
	}
	
	@Test
	void quoteTradeUsesOppositePoolForYesPrice() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		activeMarket.approve();

		ReflectionTestUtils.setField(activeMarket, "yesPool", BigDecimal.valueOf(150));
		ReflectionTestUtils.setField(activeMarket, "noPool", BigDecimal.valueOf(50));

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(post("/api/markets/{id}/trades/quote", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 10
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.side").value("YES"))
			.andExpect(jsonPath("$.price").value(0.25))
			.andExpect(jsonPath("$.estimatedCost").value(2.5));

		verify(marketRepository, never()).save(any(Market.class));
	}
	
	@Test
	void quoteTradeRejectsNonActiveMarket() throws Exception {
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

		mockMvc.perform(post("/api/markets/{id}/trades/quote", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 10
					}
					"""))
			.andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any(Market.class));
	}
	
	@Test
	void createTradeBuysYesAndUpdatesMarketPool() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/markets/{id}/trades", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 10
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.side").value("YES"))
			.andExpect(jsonPath("$.amount").value(10))
			.andExpect(jsonPath("$.price").value(0.5))
			.andExpect(jsonPath("$.estimatedCost").value(5.0));

		ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
		verify(marketRepository).save(captor.capture());

		Market savedMarket = captor.getValue();
		org.assertj.core.api.Assertions.assertThat(savedMarket.getYesPool())
				.isEqualByComparingTo(BigDecimal.valueOf(110));
		
		ArgumentCaptor<Trade> tradeCaptor = ArgumentCaptor.forClass(Trade.class);
		verify(tradeRepository).save(tradeCaptor.capture());

		Trade savedTrade = tradeCaptor.getValue();
		org.assertj.core.api.Assertions.assertThat(savedTrade.getMarketId()).isEqualTo(marketId);
		org.assertj.core.api.Assertions.assertThat(savedTrade.getSide()).isEqualTo(com.ucmarket.entity.MarketSide.YES);
		org.assertj.core.api.Assertions.assertThat(savedTrade.getAction()).isEqualTo(TradeAction.BUY);
		org.assertj.core.api.Assertions.assertThat(savedTrade.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(10));
		org.assertj.core.api.Assertions.assertThat(savedTrade.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(0.5));
	}
	
	@Test
	void createTradeBuysNoAndUpdatesMarketPool() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		mockMvc.perform(post("/api/markets/{id}/trades", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "NO",
					  "amount": 10
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.side").value("NO"))
			.andExpect(jsonPath("$.amount").value(10))
			.andExpect(jsonPath("$.price").value(0.5))
			.andExpect(jsonPath("$.estimatedCost").value(5.0));

		ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
		verify(marketRepository).save(captor.capture());

		Market savedMarket = captor.getValue();
		org.assertj.core.api.Assertions.assertThat(savedMarket.getNoPool())
				.isEqualByComparingTo(BigDecimal.valueOf(110));
	}
	
	@Test
	void createTradeMissingMarketReturnsNotFound() throws Exception {
		UUID marketId = UUID.randomUUID();

		when(marketRepository.findById(marketId)).thenReturn(Optional.empty());

		mockMvc.perform(post("/api/markets/{id}/trades", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 10
					}
					"""))
			.andExpect(status().isNotFound());

		verify(marketRepository, never()).save(any(Market.class));
		verify(tradeRepository, never()).save(any(Trade.class));
	}
	
	@Test
	void createTradeRejectsNonActiveMarket() throws Exception {
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

		mockMvc.perform(post("/api/markets/{id}/trades", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 10
					}
					"""))
			.andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any(Market.class));
		verify(tradeRepository, never()).save(any(Trade.class));
	}
	
	@Test
	void createTradeRejectsZeroAmount() throws Exception {
		UUID marketId = UUID.randomUUID();

		Market activeMarket = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		activeMarket.approve();

		when(marketRepository.findById(marketId)).thenReturn(Optional.of(activeMarket));

		mockMvc.perform(post("/api/markets/{id}/trades", marketId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "side": "YES",
					  "amount": 0
					}
					"""))
			.andExpect(status().isBadRequest());

		verify(marketRepository, never()).save(any(Market.class));
		verify(tradeRepository, never()).save(any(Trade.class));
	}
}
