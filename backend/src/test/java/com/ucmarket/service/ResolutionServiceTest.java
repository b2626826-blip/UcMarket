package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.mockito.Mockito.never;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;

@ExtendWith(MockitoExtension.class)
class ResolutionServiceTest {
	private static final UUID ADMIN_ID = UUID.randomUUID();

	@Mock
	private MarketRepository marketRepository;

	@Mock
	private PositionRepository positionRepository;

	@Mock
	private WalletService walletService;

	@InjectMocks
	private ResolutionService resolutionService;

	@Test
	void resolveYesMarketPaysYesPositionAndSettlesPosition() {
		UUID marketId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		UUID positionId = UUID.randomUUID();

		Market market = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		market.approve();

		Position position = new Position();
		ReflectionTestUtils.setField(position, "id", positionId);
		ReflectionTestUtils.setField(position, "userId", userId);
		ReflectionTestUtils.setField(position, "marketId", marketId);
		ReflectionTestUtils.setField(position, "yesShares", new BigDecimal("10.0000"));
		ReflectionTestUtils.setField(position, "noShares", BigDecimal.ZERO);
		ReflectionTestUtils.setField(position, "yesCost", new BigDecimal("6.00"));
		ReflectionTestUtils.setField(position, "noCost", BigDecimal.ZERO);
		ReflectionTestUtils.setField(position, "status", PositionStatus.OPEN);

		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
				.thenReturn(List.of(position));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Market resolvedMarket = resolutionService.resolveMarket(marketId, MarketResult.YES, ADMIN_ID);

		assertThat(resolvedMarket.getStatus()).isEqualTo(MarketStatus.RESOLVED);
		assertThat(resolvedMarket.getResult()).isEqualTo(MarketResult.YES);
		assertThat(position.getStatus()).isEqualTo(PositionStatus.SETTLED);
		verify(walletService).credit(
				userId,
				new BigDecimal("12.00000000"),
				"MARKET",
				marketId,
				"resolution:" + positionId);

		verify(marketRepository).save(market);
	}
	
	@Test
	void resolveNoMarketPaysNoPositionAndSettlesPosition() {
		UUID marketId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		UUID positionId = UUID.randomUUID();

		Market market = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		market.approve();

		Position position = new Position();
		ReflectionTestUtils.setField(position, "id", positionId);
		ReflectionTestUtils.setField(position, "userId", userId);
		ReflectionTestUtils.setField(position, "marketId", marketId);
		ReflectionTestUtils.setField(position, "yesShares", BigDecimal.ZERO);
		ReflectionTestUtils.setField(position, "noShares", new BigDecimal("7.0000"));
		ReflectionTestUtils.setField(position, "yesCost", BigDecimal.ZERO);
		ReflectionTestUtils.setField(position, "noCost", new BigDecimal("4.00"));
		ReflectionTestUtils.setField(position, "status", PositionStatus.OPEN);

		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
				.thenReturn(List.of(position));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Market resolvedMarket = resolutionService.resolveMarket(marketId, MarketResult.NO, ADMIN_ID);

		assertThat(resolvedMarket.getStatus()).isEqualTo(MarketStatus.RESOLVED);
		assertThat(resolvedMarket.getResult()).isEqualTo(MarketResult.NO);
		assertThat(position.getStatus()).isEqualTo(PositionStatus.SETTLED);
		verify(walletService).credit(
				userId,
				new BigDecimal("8.00000000"),
				"MARKET",
				marketId,
				"resolution:" + positionId);

		verify(marketRepository).save(market);
	}
	
	@Test
	void resolveYesMarketDoesNotPayNoOnlyPositionButStillSettlesPosition() {
		UUID marketId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();

		Market market = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		market.approve();

		Position position = new Position();
		ReflectionTestUtils.setField(position, "userId", userId);
		ReflectionTestUtils.setField(position, "marketId", marketId);
		ReflectionTestUtils.setField(position, "yesShares", BigDecimal.ZERO);
		ReflectionTestUtils.setField(position, "noShares", new BigDecimal("7.0000"));
		ReflectionTestUtils.setField(position, "yesCost", BigDecimal.ZERO);
		ReflectionTestUtils.setField(position, "noCost", new BigDecimal("4.00"));
		ReflectionTestUtils.setField(position, "status", PositionStatus.OPEN);

		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));
		when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
				.thenReturn(List.of(position));
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Market resolvedMarket = resolutionService.resolveMarket(marketId, MarketResult.YES, ADMIN_ID);

		assertThat(resolvedMarket.getStatus()).isEqualTo(MarketStatus.RESOLVED);
		assertThat(resolvedMarket.getResult()).isEqualTo(MarketResult.YES);
		assertThat(position.getStatus()).isEqualTo(PositionStatus.SETTLED);

		verify(walletService, never()).credit(any(UUID.class), any(BigDecimal.class), any(), any(UUID.class), any());
		verify(marketRepository).save(market);
	}
	
	@Test
	void resolveAlreadyResolvedMarketThrowsBadRequest() {
		UUID marketId = UUID.randomUUID();

		Market market = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);
		market.approve();
		market.resolve(MarketResult.YES);

		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));

		assertThatThrownBy(() -> resolutionService.resolveMarket(marketId, MarketResult.YES, ADMIN_ID))
				.isInstanceOf(ResponseStatusException.class)
				.hasMessageContaining("Market is already resolved");

		verify(positionRepository, never()).findByMarketIdAndStatus(any(UUID.class), any(PositionStatus.class));
		verify(walletService, never()).credit(any(UUID.class), any(BigDecimal.class), any(), any(UUID.class), any());
		verify(marketRepository, never()).save(any(Market.class));
	}
	
	@Test
	void resolvePendingMarketThrowsBadRequest() {
		UUID marketId = UUID.randomUUID();

		Market market = new Market(
				"Will UC beat UCLA this year?",
				"A test prediction market",
				"sports",
				"https://example.com/result",
				"Resolve YES if UC wins the game.",
				null
		);

		when(marketRepository.findByIdForUpdate(marketId)).thenReturn(Optional.of(market));

		assertThatThrownBy(() -> resolutionService.resolveMarket(marketId, MarketResult.YES, ADMIN_ID))
				.isInstanceOf(ResponseStatusException.class)
				.hasMessageContaining("Market is not ready to resolve");

		verify(positionRepository, never()).findByMarketIdAndStatus(any(UUID.class), any(PositionStatus.class));
		verify(walletService, never()).credit(any(UUID.class), any(BigDecimal.class), any(), any(UUID.class), any());
		verify(marketRepository, never()).save(any(Market.class));
	}
}
