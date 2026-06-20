package com.ucmarket.service;

import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketReview.ReviewStatus;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.service.ResolutionService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketServiceTest {

    @Mock private MarketRepository marketRepository;
    @Mock private MarketReviewRepository marketReviewRepository;
    @Mock private AdminLogRepository adminLogRepository;
    @Mock private ResolutionService resolutionService;

    @Captor private ArgumentCaptor<Market> marketCaptor;
    @Captor private ArgumentCaptor<MarketReview> reviewCaptor;
    @Captor private ArgumentCaptor<AdminLog> logCaptor;

    private MarketService marketService;
    private UUID adminId;
    private UUID marketId;

    @BeforeEach
    void setUp() {
        marketService = new MarketService(marketRepository, marketReviewRepository, adminLogRepository,
                resolutionService);
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
        when(resolutionService.resolveMarket(marketId, MarketResult.YES)).thenAnswer(inv -> {
            market.resolve(MarketResult.YES);
            return market;
        });
        when(marketRepository.save(any())).thenReturn(market);

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
        when(resolutionService.resolveMarket(marketId, MarketResult.NO)).thenAnswer(inv -> {
            market.resolve(MarketResult.NO);
            return market;
        });
        when(marketRepository.save(any())).thenReturn(market);

        Market result = marketService.resolveMarket(marketId, adminId, MarketResult.NO);

        assertEquals(MarketStatus.RESOLVED, result.getStatus());
        assertEquals(MarketResult.NO, result.getResult());
    }

    @Test
    void resolveMarket_shouldThrow_whenResolutionServiceFails() {
        when(resolutionService.resolveMarket(marketId, MarketResult.YES))
                .thenThrow(new RuntimeException("Market is not ready to resolve"));

        assertThrows(RuntimeException.class,
                () -> marketService.resolveMarket(marketId, adminId, MarketResult.YES));
        verify(marketRepository, never()).save(any());
    }

    @Test
    void resolveMarket_shouldThrow_whenMarketAlreadyResolved() {
        when(resolutionService.resolveMarket(marketId, MarketResult.YES))
                .thenThrow(new RuntimeException("Market is already resolved"));

        assertThrows(RuntimeException.class,
                () -> marketService.resolveMarket(marketId, adminId, MarketResult.YES));
    }

    @Test
    void autoCloseExpiredMarkets_shouldCloseExpiredActiveMarkets() {
        Market expired1 = createMarket(MarketStatus.ACTIVE);
        ReflectionTestUtils.setField(expired1, "closeAt", LocalDateTime.now().minusDays(1));
        Market expired2 = createMarket(MarketStatus.ACTIVE);
        ReflectionTestUtils.setField(expired2, "closeAt", LocalDateTime.now().minusHours(2));

        when(marketRepository.findByStatusAndCloseAtBefore(eq(MarketStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(List.of(expired1, expired2));

        marketService.autoCloseExpiredMarkets();

        assertEquals(MarketStatus.CLOSED, expired1.getStatus());
        assertEquals(MarketStatus.CLOSED, expired2.getStatus());
        verify(marketRepository).saveAll(List.of(expired1, expired2));
    }

    @Test
    void anyOperation_shouldThrow_whenMarketNotFound() {
        when(marketRepository.findById(marketId)).thenReturn(Optional.empty());
        when(resolutionService.resolveMarket(any(), any()))
                .thenThrow(new EntityNotFoundException("Market not found"));

        assertThrows(EntityNotFoundException.class,
                () -> marketService.approveMarket(marketId, adminId));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.rejectMarket(marketId, adminId, "reason"));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.requestChanges(marketId, adminId, "comment"));
        assertThrows(EntityNotFoundException.class,
                () -> marketService.resolveMarket(marketId, adminId, MarketResult.YES));
    }
}
