package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

@ExtendWith(MockitoExtension.class)
class TradeServiceTest {

	@Mock
	private MarketRepository marketRepository;
	@Mock
	private TradeRepository tradeRepository;
	@Mock
	private TradeQuoteService tradeQuoteService;
	@Mock
	private WalletService walletService;
	@Mock
	private PositionService positionService;
	@Mock
	private PriceHistoryService priceHistoryService;

	private TradeService tradeService;
	private UUID userId;
	private UUID marketId;

	@BeforeEach
	void setUp() {
		tradeService = new TradeService(
				marketRepository,
				tradeRepository,
				tradeQuoteService,
				walletService,
				positionService,
				priceHistoryService
		);
		userId = UUID.randomUUID();
		marketId = UUID.randomUUID();
	}

	@Test
	void placeTrade_yes_shouldSaveTradeDebitWalletAddPositionAndUpdateMarket() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, new BigDecimal("30.00"));
		UUID tradeId = UUID.randomUUID();
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("2.00"));
		when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", tradeId);
			return trade;
		});

		Trade result = tradeService.placeTrade(userId, request);

		assertThat(result.getId()).isEqualTo(tradeId);
		assertThat(result.getUserId()).isEqualTo(userId);
		assertThat(result.getMarketId()).isEqualTo(marketId);
		assertThat(result.getSide()).isEqualTo(MarketSide.YES);
		assertThat(result.getAction()).isEqualTo(TradeAction.BUY);
		assertThat(result.getAmount()).isEqualByComparingTo("30.00");
		assertThat(result.getPrice()).isEqualByComparingTo("2.00");
		assertThat(result.getShares()).isEqualByComparingTo("15.00000000");
		verify(walletService).debit(userId, new BigDecimal("30.00"), "TRADE", tradeId, "TRADE_BUY_" + tradeId);
		verify(positionService).addBuyPosition(
				userId,
				marketId,
				MarketSide.YES,
				new BigDecimal("15.00000000"),
				new BigDecimal("30.00")
		);
		assertThat(market.getYesPool()).isEqualByComparingTo("130.00");
		assertThat(market.getNoPool()).isEqualByComparingTo("100");
		verify(marketRepository).save(market);
	}

	@Test
	void placeTrade_no_shouldUseNoSideAndUpdateNoPool() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.NO, new BigDecimal("20.00"));
		UUID tradeId = UUID.randomUUID();
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.NO)).thenReturn(new BigDecimal("4.00"));
		when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", tradeId);
			return trade;
		});

		Trade result = tradeService.placeTrade(userId, request);

		assertThat(result.getSide()).isEqualTo(MarketSide.NO);
		assertThat(result.getShares()).isEqualByComparingTo("5.00000000");
		verify(positionService).addBuyPosition(
				userId,
				marketId,
				MarketSide.NO,
				new BigDecimal("5.00000000"),
				new BigDecimal("20.00")
		);
		assertThat(market.getYesPool()).isEqualByComparingTo("100");
		assertThat(market.getNoPool()).isEqualByComparingTo("120.00");
		verify(marketRepository).save(market);
	}

	@Test
	void placeTrade_shouldThrowWhenMarketDoesNotExist() {
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request))
				.isInstanceOf(RuntimeException.class)
				.hasMessage("市場不存在");
		verifyNoInteractions(tradeQuoteService, tradeRepository, walletService, positionService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_shouldThrowWhenMarketIsNotActive() {
		Market market = activeMarket();
		market.changeStatus(MarketStatus.CLOSED);
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("該市場目前無法下單");
		verifyNoInteractions(tradeQuoteService, tradeRepository, walletService, positionService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_shouldRejectOddsOutsideAllowedRange() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("1.49"));

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("目前賠率超出允許範圍 (1.5 - 5.0)，無法下單");
		verifyNoInteractions(tradeRepository, walletService, positionService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_shouldPassCalculatedTradeToRepository() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, new BigDecimal("10.00"));
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("2.50"));
		when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", UUID.randomUUID());
			return trade;
		});

		tradeService.placeTrade(userId, request);

		ArgumentCaptor<Trade> tradeCaptor = ArgumentCaptor.forClass(Trade.class);
		verify(tradeRepository).save(tradeCaptor.capture());
		Trade saved = tradeCaptor.getValue();
		assertThat(saved.getAmount()).isEqualByComparingTo("10.00");
		assertThat(saved.getPrice()).isEqualByComparingTo("2.50");
		assertThat(saved.getShares()).isEqualByComparingTo("4.00000000");
		verify(walletService).debit(eq(userId), eq(new BigDecimal("10.00")), eq("TRADE"), eq(saved.getId()), any());
	}

	private Market activeMarket() {
		Market market = new Market(
				"Test market",
				"Description",
				"Category",
				null,
				null,
				LocalDateTime.now().plusDays(1)
		);
		ReflectionTestUtils.setField(market, "id", marketId);
		market.changeStatus(MarketStatus.ACTIVE);
		return market;
	}
}
