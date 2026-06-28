package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.dto.PositionResponse;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.PositionRepository;

@ExtendWith(MockitoExtension.class)
class PositionServiceTest {

	@Mock
	private PositionRepository positionRepository;

	private PositionService positionService;
	private UUID userId;
	private UUID marketId;

	@BeforeEach
	void setUp() {
		positionService = new PositionService(positionRepository);
		userId = UUID.randomUUID();
		marketId = UUID.randomUUID();
	}

	@Test
	void getOpenPositionsByUserId_shouldReturnMappedResponses() {
		Position position = position(
				new BigDecimal("3.5"),
				BigDecimal.ZERO,
				new BigDecimal("7.00"),
				BigDecimal.ZERO,
				PositionStatus.OPEN
		);
		when(positionRepository.findByUserIdAndStatus(userId, PositionStatus.OPEN))
				.thenReturn(List.of(position));

		List<PositionResponse> result = positionService.getOpenPositionsByUserId(userId);

		assertThat(result).hasSize(1);
		assertThat(result.get(0).id()).isEqualTo(position.getId());
		assertThat(result.get(0).userId()).isEqualTo(userId);
		assertThat(result.get(0).marketId()).isEqualTo(marketId);
		assertThat(result.get(0).yesShares()).isEqualByComparingTo("3.5");
		assertThat(result.get(0).yesCost()).isEqualByComparingTo("7.00");
		assertThat(result.get(0).status()).isEqualTo(PositionStatus.OPEN);
	}

	@Test
	void addBuyPosition_yes_shouldUpsertAndReturnSavedPosition() {
		BigDecimal shares = new BigDecimal("5.25");
		BigDecimal cost = new BigDecimal("10.50");
		Position saved = position(shares, BigDecimal.ZERO, cost, BigDecimal.ZERO, PositionStatus.OPEN);
		when(positionRepository.upsertYesBuy(any(UUID.class), eq(userId), eq(marketId), eq(shares), eq(cost)))
				.thenReturn(1);
		when(positionRepository.findByUserIdAndMarketId(userId, marketId)).thenReturn(Optional.of(saved));

		Position result = positionService.addBuyPosition(userId, marketId, MarketSide.YES, shares, cost);

		assertThat(result).isSameAs(saved);
		verify(positionRepository, never()).upsertNoBuy(any(), any(), any(), any(), any());
	}

	@Test
	void addBuyPosition_no_shouldUpsertAndReturnSavedPosition() {
		BigDecimal shares = new BigDecimal("4.00");
		BigDecimal cost = new BigDecimal("12.00");
		Position saved = position(BigDecimal.ZERO, shares, BigDecimal.ZERO, cost, PositionStatus.OPEN);
		when(positionRepository.upsertNoBuy(any(UUID.class), eq(userId), eq(marketId), eq(shares), eq(cost)))
				.thenReturn(1);
		when(positionRepository.findByUserIdAndMarketId(userId, marketId)).thenReturn(Optional.of(saved));

		Position result = positionService.addBuyPosition(userId, marketId, MarketSide.NO, shares, cost);

		assertThat(result).isSameAs(saved);
		verify(positionRepository, never()).upsertYesBuy(any(), any(), any(), any(), any());
	}

	@Test
	void addBuyPosition_shouldThrowWhenPositionIsNotOpen() {
		BigDecimal shares = new BigDecimal("2.00");
		BigDecimal cost = new BigDecimal("4.00");
		when(positionRepository.upsertYesBuy(any(UUID.class), eq(userId), eq(marketId), eq(shares), eq(cost)))
				.thenReturn(0);

		assertThatThrownBy(() ->
				positionService.addBuyPosition(userId, marketId, MarketSide.YES, shares, cost))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Position is not open");
		verify(positionRepository, never()).findByUserIdAndMarketId(any(), any());
	}

	@Test
	void addBuyPosition_shouldThrowWhenPositionCannotBeReadAfterUpsert() {
		BigDecimal shares = new BigDecimal("2.00");
		BigDecimal cost = new BigDecimal("4.00");
		when(positionRepository.upsertYesBuy(any(UUID.class), eq(userId), eq(marketId), eq(shares), eq(cost)))
				.thenReturn(1);
		when(positionRepository.findByUserIdAndMarketId(userId, marketId)).thenReturn(Optional.empty());

		assertThatThrownBy(() ->
				positionService.addBuyPosition(userId, marketId, MarketSide.YES, shares, cost))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Position was not saved");
	}

	@Test
	void addBuyPosition_shouldRejectInvalidInputBeforeRepositoryAccess() {
		assertThatThrownBy(() -> positionService.addBuyPosition(
				null, marketId, MarketSide.YES, BigDecimal.ONE, BigDecimal.ONE))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("User id is required");
		assertThatThrownBy(() -> positionService.addBuyPosition(
				userId, null, MarketSide.YES, BigDecimal.ONE, BigDecimal.ONE))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Market id is required");
		assertThatThrownBy(() -> positionService.addBuyPosition(
				userId, marketId, null, BigDecimal.ONE, BigDecimal.ONE))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Side is required");
		assertThatThrownBy(() -> positionService.addBuyPosition(
				userId, marketId, MarketSide.YES, BigDecimal.ZERO, BigDecimal.ONE))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Shares must be positive");
		assertThatThrownBy(() -> positionService.addBuyPosition(
				userId, marketId, MarketSide.YES, BigDecimal.ONE, BigDecimal.ZERO))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Cost must be positive");
		verify(positionRepository, never()).upsertYesBuy(any(), any(), any(), any(), any());
		verify(positionRepository, never()).upsertNoBuy(any(), any(), any(), any(), any());
	}

	@Test
	void sellPosition_yes_shouldSubtractSharesAndSave() {
		Position position = position(
				new BigDecimal("8.00"),
				new BigDecimal("3.00"),
				new BigDecimal("16.00"),
				new BigDecimal("9.00"),
				PositionStatus.OPEN
		);
		when(positionRepository.findWithLockByUserIdAndMarketId(userId, marketId))
				.thenReturn(Optional.of(position));
		when(positionRepository.save(position)).thenReturn(position);

		Position result = positionService.sellPosition(
				userId, marketId, MarketSide.YES, new BigDecimal("2.50"));

		assertThat(result).isSameAs(position);
		assertThat(position.getYesShares()).isEqualByComparingTo("5.50");
		assertThat(position.getNoShares()).isEqualByComparingTo("3.00");
		verify(positionRepository).save(position);
	}

	@Test
	void sellPosition_no_shouldSubtractSharesAndSave() {
		Position position = position(
				new BigDecimal("8.00"),
				new BigDecimal("3.00"),
				new BigDecimal("16.00"),
				new BigDecimal("9.00"),
				PositionStatus.OPEN
		);
		when(positionRepository.findWithLockByUserIdAndMarketId(userId, marketId))
				.thenReturn(Optional.of(position));
		when(positionRepository.save(position)).thenReturn(position);

		Position result = positionService.sellPosition(
				userId, marketId, MarketSide.NO, new BigDecimal("1.25"));

		assertThat(result).isSameAs(position);
		assertThat(position.getYesShares()).isEqualByComparingTo("8.00");
		assertThat(position.getNoShares()).isEqualByComparingTo("1.75");
		verify(positionRepository).save(position);
	}

	@Test
	void sellPosition_shouldRejectInsufficientSharesWithoutSaving() {
		Position position = position(
				BigDecimal.ONE,
				BigDecimal.ZERO,
				BigDecimal.ONE,
				BigDecimal.ZERO,
				PositionStatus.OPEN
		);
		when(positionRepository.findWithLockByUserIdAndMarketId(userId, marketId))
				.thenReturn(Optional.of(position));

		assertThatThrownBy(() ->
				positionService.sellPosition(userId, marketId, MarketSide.YES, new BigDecimal("1.01")))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Not enough YES shares");
		assertThat(position.getYesShares()).isEqualByComparingTo("1");
		verify(positionRepository, never()).save(any());
	}

	@Test
	void sellPosition_shouldRejectMissingOrClosedPosition() {
		when(positionRepository.findWithLockByUserIdAndMarketId(userId, marketId))
				.thenReturn(Optional.empty());

		assertThatThrownBy(() ->
				positionService.sellPosition(userId, marketId, MarketSide.YES, BigDecimal.ONE))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Position not found");

		Position closed = position(
				BigDecimal.ONE,
				BigDecimal.ZERO,
				BigDecimal.ONE,
				BigDecimal.ZERO,
				PositionStatus.SETTLED
		);
		when(positionRepository.findWithLockByUserIdAndMarketId(userId, marketId))
				.thenReturn(Optional.of(closed));

		assertThatThrownBy(() ->
				positionService.sellPosition(userId, marketId, MarketSide.YES, BigDecimal.ONE))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Position is not open");
		verify(positionRepository, never()).save(any());
	}

	private Position position(
			BigDecimal yesShares,
			BigDecimal noShares,
			BigDecimal yesCost,
			BigDecimal noCost,
			PositionStatus status
	) {
		Position position = new Position();
		ReflectionTestUtils.setField(position, "id", UUID.randomUUID());
		position.setUserId(userId);
		position.setMarketId(marketId);
		position.setYesShares(yesShares);
		position.setNoShares(noShares);
		position.setYesCost(yesCost);
		position.setNoCost(noCost);
		position.setStatus(status);
		return position;
	}
}
