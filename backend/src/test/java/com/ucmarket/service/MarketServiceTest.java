package com.ucmarket.service;

import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketReview.ReviewStatus;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.repository.PositionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketServiceTest {

    @Mock private MarketRepository marketRepository;
    @Mock private MarketReviewRepository marketReviewRepository;
    @Mock private AdminLogRepository adminLogRepository;
    @Mock private ResolutionService resolutionService;
    @Mock private PositionRepository positionRepository;
    @Mock private WalletService walletService;

    @Captor private ArgumentCaptor<Market> marketCaptor;
    @Captor private ArgumentCaptor<MarketReview> reviewCaptor;
    @Captor private ArgumentCaptor<AdminLog> logCaptor;

    private MarketService marketService;
    private UUID adminId;
    private UUID marketId;

    @BeforeEach
    void setUp() {
        marketService = new MarketService(marketRepository, marketReviewRepository, adminLogRepository,
                resolutionService, positionRepository, walletService);
        adminId = UUID.randomUUID();
        marketId = UUID.randomUUID();
    }

    private Market createMarket(MarketStatus status) {
        Market m = new Market("Title", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));
        ReflectionTestUtils.setField(m, "id", marketId);
        ReflectionTestUtils.setField(m, "status", status);
        ReflectionTestUtils.setField(m, "creatorId", UUID.randomUUID());
        return m;
    }

    @Test
    void submitMarket_draftByCreator_shouldChangeStatusIncrementVersionAndPersist() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);

        Market result = marketService.submitMarket(marketId, creatorId);

        assertEquals(MarketStatus.PENDING, result.getStatus());
        assertEquals(1, result.getSubmissionVersion());
        verify(marketRepository).save(market);
    }

    @Test
    void submitMarket_shouldThrowForbidden_whenUserIsNotCreator() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> marketService.submitMarket(marketId, UUID.randomUUID()));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals(MarketStatus.DRAFT, market.getStatus());
        assertEquals(0, market.getSubmissionVersion());
        verify(marketRepository, never()).save(any());
    }

    @Test
    void submitMarket_shouldThrowBadRequest_whenMarketIsNotDraft() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.PENDING, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> marketService.submitMarket(marketId, creatorId));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals(0, market.getSubmissionVersion());
        verify(marketRepository, never()).save(any());
    }

    @Test
    void approveMarket_shouldChangeStatusToActive() {
        Market market = createMarket(MarketStatus.PENDING);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);

        Market result = marketService.approveMarket(marketId, adminId);

        assertEquals(MarketStatus.ACTIVE, result.getStatus());
        assertNotNull(result.getApprovedAt());
        assertEquals(adminId, result.getApprovedBy());

        verify(marketReviewRepository).save(reviewCaptor.capture());
        assertEquals(ReviewStatus.APPROVED, reviewCaptor.getValue().getStatus());

        verify(adminLogRepository).save(logCaptor.capture());
        assertEquals("MARKET_APPROVE", logCaptor.getValue().getAction());
    }

    @Test
    void approveMarket_shouldThrow_whenNotPending() {
        Market market = createMarket(MarketStatus.DRAFT);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class, () -> marketService.approveMarket(marketId, adminId));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void approveMarket_shouldAutoCloseExpiredActiveMarket_onAccess() {
        Market market = createMarket(MarketStatus.ACTIVE);
        ReflectionTestUtils.setField(market, "closeAt", LocalDateTime.now().minusMinutes(1));
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class, () -> marketService.approveMarket(marketId, adminId));

        assertEquals(MarketStatus.CLOSED, market.getStatus());
        verify(marketRepository).save(market);
    }

    @Test
    void rejectMarket_shouldChangeStatusToRejected() {
        Market market = createMarket(MarketStatus.PENDING);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);

        Market result = marketService.rejectMarket(marketId, adminId, "Invalid source");

        assertEquals(MarketStatus.REJECTED, result.getStatus());
        verify(marketReviewRepository).save(reviewCaptor.capture());
        assertEquals(ReviewStatus.REJECTED, reviewCaptor.getValue().getStatus());
        assertEquals("Invalid source", reviewCaptor.getValue().getComment());
    }

    @Test
    void requestChanges_shouldRevertToDraft() {
        Market market = createMarket(MarketStatus.PENDING);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);

        Market result = marketService.requestChanges(marketId, adminId, "Need more sources");

        assertEquals(MarketStatus.DRAFT, result.getStatus());
        verify(marketReviewRepository).save(reviewCaptor.capture());
        assertEquals(ReviewStatus.CHANGES_REQUESTED, reviewCaptor.getValue().getStatus());
    }

    @Test
    void resolveMarket_shouldResolveActiveMarket() {
        Market market = createMarket(MarketStatus.ACTIVE);
        when(resolutionService.resolveMarket(marketId, MarketResult.YES, adminId)).thenAnswer(invocation -> {
            market.resolve(MarketResult.YES, adminId);
            return market;
        });

        Market result = marketService.resolveMarket(marketId, adminId, MarketResult.YES);

        assertEquals(MarketStatus.RESOLVED, result.getStatus());
        assertEquals(MarketResult.YES, result.getResult());
        assertNotNull(result.getResolvedAt());
        assertEquals(adminId, result.getResolvedBy());
        verify(adminLogRepository).save(logCaptor.capture());
        assertEquals("MARKET_RESOLVE", logCaptor.getValue().getAction());
    }

    @Test
    void resolveMarket_shouldResolveClosedMarket() {
        Market market = createMarket(MarketStatus.CLOSED);
        when(resolutionService.resolveMarket(marketId, MarketResult.NO, adminId)).thenAnswer(invocation -> {
            market.resolve(MarketResult.NO, adminId);
            return market;
        });

        Market result = marketService.resolveMarket(marketId, adminId, MarketResult.NO);

        assertEquals(MarketStatus.RESOLVED, result.getStatus());
        assertEquals(MarketResult.NO, result.getResult());
    }

    @Test
    void resolveMarket_shouldThrow_whenMarketIsDraft() {
        when(resolutionService.resolveMarket(marketId, MarketResult.YES, adminId))
                .thenThrow(new IllegalStateException("Only CLOSED or ACTIVE markets can be resolved"));

        assertThrows(IllegalStateException.class,
                () -> marketService.resolveMarket(marketId, adminId, MarketResult.YES));
    }

    @Test
    void resolveMarket_shouldThrow_whenMarketAlreadyResolved() {
        when(resolutionService.resolveMarket(marketId, MarketResult.YES, adminId))
                .thenThrow(new IllegalStateException("Market is already resolved"));

        assertThrows(IllegalStateException.class,
                () -> marketService.resolveMarket(marketId, adminId, MarketResult.YES));
    }

    @Test
    void anyOperation_shouldThrow_whenMarketNotFound() {
        when(marketRepository.findById(marketId)).thenReturn(Optional.empty());
        when(resolutionService.resolveMarket(marketId, MarketResult.YES, adminId))
                .thenThrow(new EntityNotFoundException());

        assertThrows(EntityNotFoundException.class,
                () -> marketService.approveMarket(marketId, adminId));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.rejectMarket(marketId, adminId, "reason"));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.requestChanges(marketId, adminId, "comment"));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.resolveMarket(marketId, adminId, MarketResult.YES));
    }

    private Market createMarket(MarketStatus status, UUID creatorId) {
        Market m = new Market("Title", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));
        ReflectionTestUtils.setField(m, "id", marketId);
        ReflectionTestUtils.setField(m, "status", status);
        ReflectionTestUtils.setField(m, "creatorId", creatorId);
        return m;
    }

    @Test
    void cancelMarket_draftByCreator_shouldSucceed() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
                .thenReturn(List.of());

        Market result = marketService.cancelMarket(marketId, creatorId, false);

        assertEquals(MarketStatus.CANCELED, result.getStatus());
        verify(marketRepository).save(market);
        verify(positionRepository).findByMarketIdAndStatus(marketId, PositionStatus.OPEN);
    }

    @Test
    void cancelMarket_pendingByCreator_shouldSucceed() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.PENDING, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
                .thenReturn(List.of());

        Market result = marketService.cancelMarket(marketId, creatorId, false);

        assertEquals(MarketStatus.CANCELED, result.getStatus());
    }

    @Test
    void cancelMarket_activeByAdmin_shouldSucceed() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.ACTIVE, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
                .thenReturn(List.of());

        Market result = marketService.cancelMarket(marketId, adminId, true);

        assertEquals(MarketStatus.CANCELED, result.getStatus());
        verify(marketRepository).save(market);
    }

    @Test
    void cancelMarket_closedByAdmin_shouldSucceed() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.CLOSED, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
                .thenReturn(List.of());

        Market result = marketService.cancelMarket(marketId, adminId, true);

        assertEquals(MarketStatus.CANCELED, result.getStatus());
    }

    @Test
    void cancelMarket_shouldThrow_whenNonOwnerNonAdmin() {
        UUID creatorId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalArgumentException.class,
                () -> marketService.cancelMarket(marketId, otherUserId, false));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void cancelMarket_activeByCreator_shouldThrow() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.ACTIVE, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class,
                () -> marketService.cancelMarket(marketId, creatorId, false));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void cancelMarket_closedByCreator_shouldThrow() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.CLOSED, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class,
                () -> marketService.cancelMarket(marketId, creatorId, false));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void cancelMarket_resolved_shouldThrow() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.RESOLVED, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class,
                () -> marketService.cancelMarket(marketId, creatorId, false));
        assertThrows(IllegalStateException.class,
                () -> marketService.cancelMarket(marketId, adminId, true));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void cancelMarket_rejected_shouldThrow() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.REJECTED, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class,
                () -> marketService.cancelMarket(marketId, creatorId, false));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void cancelMarket_canceled_shouldThrow() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.CANCELED, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));

        assertThrows(IllegalStateException.class,
                () -> marketService.cancelMarket(marketId, creatorId, false));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void cancelMarket_shouldRefundOpenPositions() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.ACTIVE, creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);

        Position position = new Position();
        ReflectionTestUtils.setField(position, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(position, "marketId", marketId);
        ReflectionTestUtils.setField(position, "userId", UUID.randomUUID());
        ReflectionTestUtils.setField(position, "yesCost", new BigDecimal("100.00"));
        ReflectionTestUtils.setField(position, "noCost", BigDecimal.ZERO);
        ReflectionTestUtils.setField(position, "status", PositionStatus.OPEN);

        when(positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN))
                .thenReturn(List.of(position));

        Market result = marketService.cancelMarket(marketId, adminId, true);

        assertEquals(MarketStatus.CANCELED, result.getStatus());
        verify(walletService).credit(eq(position.getUserId()), eq(new BigDecimal("100.00")),
                eq("MARKET"), eq(marketId), contains("cancel:" + marketId));
        verify(positionRepository).saveAll(argThat(saved -> {
            int count = 0;
            Position first = null;
            for (Position p : saved) {
                count++;
                if (first == null) first = p;
            }
            return count == 1 && first != null && first.getStatus() == PositionStatus.CANCELED;
        }));
    }

    @Test
    void cancelMarket_shouldThrow_whenMarketNotFound() {
        UUID userId = UUID.randomUUID();
        when(marketRepository.findById(marketId)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> marketService.cancelMarket(marketId, userId, false));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.cancelMarket(marketId, adminId, true));
    }

    @Test
    void autoCloseExpiredMarkets_shouldCloseExpiredActiveMarkets() {
        Market market = createMarket(MarketStatus.ACTIVE);
        when(marketRepository.findByStatusAndCloseAtBefore(eq(MarketStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(List.of(market));

        marketService.autoCloseExpiredMarkets();

        assertEquals(MarketStatus.CLOSED, market.getStatus());
        verify(marketRepository).saveAll(List.of(market));
    }
}
