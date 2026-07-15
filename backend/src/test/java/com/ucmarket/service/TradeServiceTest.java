package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.TradeAction;
import com.ucmarket.exception.IdempotencyConflictException;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.TradeRepository;

@ExtendWith(MockitoExtension.class)
class TradeServiceTest {

	@Mock private MarketRepository marketRepository;
	@Mock private TradeRepository tradeRepository;
	@Mock private TradeQuoteService tradeQuoteService;
	@Mock private WalletService walletService;
	@Mock private PositionService positionService;
	@Mock private PriceHistoryService priceHistoryService;

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
		String idempotencyKey = "trade-yes-1";
		when(tradeRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("2.00"));
		when(tradeRepository.saveAndFlush(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", tradeId);
			return trade;
		});

		Trade result = tradeService.placeTrade(userId, request, idempotencyKey);

		assertThat(result.getId()).isEqualTo(tradeId);
		assertThat(result.getIdempotencyKey()).isEqualTo(idempotencyKey);
		assertThat(result.getUserId()).isEqualTo(userId);
		assertThat(result.getMarketId()).isEqualTo(marketId);
		assertThat(result.getSide()).isEqualTo(MarketSide.YES);
		assertThat(result.getAction()).isEqualTo(TradeAction.BUY);
		assertThat(result.getAmount()).isEqualByComparingTo("30.00");
		assertThat(result.getPrice()).isEqualByComparingTo("2.00");
		assertThat(result.getShares()).isEqualByComparingTo("15.00000000");
		verify(walletService).debit(userId, new BigDecimal("30.00"), "TRADE", tradeId, idempotencyKey);
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
		verify(priceHistoryService).record(marketId, new BigDecimal("0.5652"), new BigDecimal("0.4348"),
				new BigDecimal("30.00"));
	}

	@Test
	void placeTrade_shouldReturnExistingTrade_whenSameIdempotencyKeyAndPayloadRepeat() {
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, new BigDecimal("30.00"));
		String idempotencyKey = "trade-repeat-1";
		Trade existingTrade = new Trade(
				userId,
				marketId,
				MarketSide.YES,
				TradeAction.BUY,
				new BigDecimal("30.00"),
				new BigDecimal("2.00"),
				new BigDecimal("15.00000000"),
				idempotencyKey
		);

		when(tradeRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.of(existingTrade));

		Trade result = tradeService.placeTrade(userId, request, idempotencyKey);

		assertThat(result).isSameAs(existingTrade);
		verifyNoInteractions(marketRepository, tradeQuoteService, walletService, positionService, priceHistoryService);
	}

	@Test
	void placeTrade_shouldThrowConflict_whenSameIdempotencyKeyButDifferentPayload() {
		TradeRequest request = new TradeRequest(marketId, MarketSide.NO, new BigDecimal("20.00"));
		String idempotencyKey = "trade-conflict-1";
		Trade existingTrade = new Trade(
				userId,
				marketId,
				MarketSide.YES,
				TradeAction.BUY,
				new BigDecimal("20.00"),
				new BigDecimal("2.00"),
				new BigDecimal("10.00000000"),
				idempotencyKey
		);

		when(tradeRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.of(existingTrade));

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request, idempotencyKey))
				.isInstanceOf(IdempotencyConflictException.class);
	}

	@Test
	void placeTrade_shouldReturnExistingTrade_whenSaveConflictOccursAndPayloadMatches() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, new BigDecimal("30.00"));
		String idempotencyKey = "trade-race-1";
		Trade existingTrade = new Trade(
				userId,
				marketId,
				MarketSide.YES,
				TradeAction.BUY,
				new BigDecimal("30.00"),
				new BigDecimal("2.00"),
				new BigDecimal("15.00000000"),
				idempotencyKey
		);

		when(tradeRepository.findByIdempotencyKey(idempotencyKey))
				.thenReturn(Optional.empty())
				.thenReturn(Optional.of(existingTrade));
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("2.00"));
		when(tradeRepository.saveAndFlush(any(Trade.class))).thenThrow(new DataIntegrityViolationException("duplicate"));

		Trade result = tradeService.placeTrade(userId, request, idempotencyKey);

		assertThat(result).isSameAs(existingTrade);
		verifyNoInteractions(walletService, positionService, priceHistoryService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_no_shouldUseNoSideAndUpdateNoPool() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.NO, new BigDecimal("20.00"));
		UUID tradeId = UUID.randomUUID();
		String idempotencyKey = "trade-no-1";
		when(tradeRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.NO)).thenReturn(new BigDecimal("4.00"));
		when(tradeRepository.saveAndFlush(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", tradeId);
			return trade;
		});

		Trade result = tradeService.placeTrade(userId, request, idempotencyKey);

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
	void placeTrade_shouldThrowWhenIdempotencyKeyMissing() {
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request, " "))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Missing Idempotency-Key header");
		verifyNoInteractions(marketRepository, tradeRepository, tradeQuoteService, walletService, positionService);
	}

	@Test
	void placeTrade_shouldThrowWhenMarketDoesNotExist() {
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);
		when(tradeRepository.findByIdempotencyKey("trade-missing-market")).thenReturn(Optional.empty());
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request, "trade-missing-market"))
				.isInstanceOf(RuntimeException.class)
				.hasMessage("Market not found");
		verifyNoInteractions(tradeQuoteService, walletService, positionService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_shouldThrowWhenMarketIsNotActive() {
		Market market = activeMarket();
		market.changeStatus(MarketStatus.CLOSED);
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);
		when(tradeRepository.findByIdempotencyKey("trade-closed")).thenReturn(Optional.empty());
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request, "trade-closed"))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Market is not active");
		verifyNoInteractions(tradeQuoteService, walletService, positionService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_shouldRejectOddsOutsideAllowedRange() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, BigDecimal.TEN);
		when(tradeRepository.findByIdempotencyKey("trade-bad-odds")).thenReturn(Optional.empty());
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("1.49"));

		assertThatThrownBy(() -> tradeService.placeTrade(userId, request, "trade-bad-odds"))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Trade odds are outside the allowed range");
		verifyNoInteractions(walletService, positionService);
		verify(marketRepository, never()).save(any());
	}

	@Test
	void placeTrade_shouldPassCalculatedTradeToRepository() {
		Market market = activeMarket();
		TradeRequest request = new TradeRequest(marketId, MarketSide.YES, new BigDecimal("10.00"));
		String idempotencyKey = "trade-calc-1";
		when(tradeRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(tradeQuoteService.getMarketOdds(market, MarketSide.YES)).thenReturn(new BigDecimal("2.50"));
		when(tradeRepository.saveAndFlush(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", UUID.randomUUID());
			return trade;
		});

		tradeService.placeTrade(userId, request, idempotencyKey);

		ArgumentCaptor<Trade> tradeCaptor = ArgumentCaptor.forClass(Trade.class);
		verify(tradeRepository).saveAndFlush(tradeCaptor.capture());
		Trade saved = tradeCaptor.getValue();
		assertThat(saved.getAmount()).isEqualByComparingTo("10.00");
		assertThat(saved.getPrice()).isEqualByComparingTo("2.50");
		assertThat(saved.getShares()).isEqualByComparingTo("4.00000000");
		assertThat(saved.getIdempotencyKey()).isEqualTo(idempotencyKey);
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
