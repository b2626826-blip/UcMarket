package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;

class TradeQuoteServiceTest {

	private final TradeQuoteService tradeQuoteService = new TradeQuoteService();

	@Test
	void getMarketOdds_shouldCalculateOddsFromCurrentPools() {
		Market market = marketWithPools("100", "200");

		assertThat(tradeQuoteService.getMarketOdds(market, MarketSide.YES))
				.isEqualByComparingTo("3.0000");
		assertThat(tradeQuoteService.getMarketOdds(market, MarketSide.NO))
				.isEqualByComparingTo("1.5000");
	}

	@Test
	void getMarketOdds_shouldClampOddsToAllowedRange() {
		Market highYesOdds = marketWithPools("10", "90");
		Market lowYesOdds = marketWithPools("90", "10");

		assertThat(tradeQuoteService.getMarketOdds(highYesOdds, MarketSide.YES))
				.isEqualByComparingTo("5.0");
		assertThat(tradeQuoteService.getMarketOdds(lowYesOdds, MarketSide.YES))
				.isEqualByComparingTo("1.5");
	}

	@Test
	void getQuote_yes_shouldMatchExecutableTradeCalculation() {
		Market market = marketWithPools("100", "200");

		TradeQuoteResponse result = tradeQuoteService.getQuote(
				market, MarketSide.YES, new BigDecimal("50"));

		assertThat(result.odds()).isEqualByComparingTo("3.0000");
		assertThat(result.amount()).isEqualByComparingTo("50");
		assertThat(result.shares()).isEqualByComparingTo("16.66666667");
	}

	@Test
	void getQuote_no_shouldMatchExecutableTradeCalculation() {
		Market market = marketWithPools("100", "200");

		TradeQuoteResponse result = tradeQuoteService.getQuote(
				market, MarketSide.NO, new BigDecimal("50"));

		assertThat(result.odds()).isEqualByComparingTo("1.5000");
		assertThat(result.amount()).isEqualByComparingTo("50");
		assertThat(result.shares()).isEqualByComparingTo("33.33333333");
	}

	private Market marketWithPools(String yesPool, String noPool) {
		Market market = new Market(
				"Test market",
				"Description",
				"Category",
				null,
				null,
				LocalDateTime.now().plusDays(1)
		);
		ReflectionTestUtils.setField(market, "yesPool", new BigDecimal(yesPool));
		ReflectionTestUtils.setField(market, "noPool", new BigDecimal(noPool));
		return market;
	}
}
