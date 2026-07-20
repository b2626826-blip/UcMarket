package com.ucmarket.service;

import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketReview.ReviewStatus;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.entity.User;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InOrder;
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
import static org.mockito.ArgumentMatchers.anyString;
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
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private MarketPreReviewService preReviewService;

    @Captor private ArgumentCaptor<Market> marketCaptor;
    @Captor private ArgumentCaptor<MarketReview> reviewCaptor;
    @Captor private ArgumentCaptor<AdminLog> logCaptor;

    private MarketService marketService;
    private UUID adminId;
    private UUID marketId;

    @BeforeEach
    void setUp() {
        marketService = new MarketService(marketRepository, marketReviewRepository, adminLogRepository,
                resolutionService, positionRepository, walletService, userRepository, notificationService,
                preReviewService);
        lenient().when(preReviewService.reviewForSubmission(any()))
                .thenReturn(new MarketPreReviewResult(List.of(), List.of()));
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
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

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
        UUID creatorId = market.getCreatorId();
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

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
    void approveMarket_shouldEnqueueCreatorNotification() {
        NotificationEventType eventType = NotificationEventType.MARKET_APPROVED;
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.PENDING, creatorId);
        ReflectionTestUtils.setField(market, "submissionVersion", 7);
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.approveMarket(marketId, adminId);

        verify(notificationService, times(1)).enqueue(
                eq(eventType),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                eq("{\"marketTitle\":\"Title\"}"),
                eq("market:%s:submission:7:%s:user:%s".formatted(
                        marketId, eventType, creatorId)));
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
        UUID creatorId = market.getCreatorId();
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        Market result = marketService.rejectMarket(marketId, adminId, "Invalid source");

        assertEquals(MarketStatus.REJECTED, result.getStatus());
        verify(marketReviewRepository).save(reviewCaptor.capture());
        assertEquals(ReviewStatus.REJECTED, reviewCaptor.getValue().getStatus());
        assertEquals("Invalid source", reviewCaptor.getValue().getComment());
    }

    @Test
    void rejectMarket_shouldEnqueueCreatorNotification() {
        NotificationEventType eventType = NotificationEventType.MARKET_REJECTED;
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.PENDING, creatorId);
        ReflectionTestUtils.setField(market, "submissionVersion", 8);
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.rejectMarket(marketId, adminId, "Invalid source");

        verify(notificationService, times(1)).enqueue(
                eq(eventType),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                eq("{\"marketTitle\":\"Title\",\"reason\":\"Invalid source\"}"),
                eq("market:%s:submission:8:%s:user:%s".formatted(
                        marketId, eventType, creatorId)));
    }

    @Test
    void requestChanges_shouldRevertToDraft() {
        Market market = createMarket(MarketStatus.PENDING);
        UUID creatorId = market.getCreatorId();
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);
        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(any())).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        Market result = marketService.requestChanges(marketId, adminId, "Need more sources");

        assertEquals(MarketStatus.DRAFT, result.getStatus());
        verify(marketReviewRepository).save(reviewCaptor.capture());
        assertEquals(ReviewStatus.CHANGES_REQUESTED, reviewCaptor.getValue().getStatus());
    }

    @Test
    void requestChanges_shouldEnqueueCreatorNotification() {
        NotificationEventType eventType =
                NotificationEventType.MARKET_CHANGES_REQUESTED;
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.PENDING, creatorId);
        ReflectionTestUtils.setField(market, "submissionVersion", 9);
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.requestChanges(marketId, adminId, "Need more sources");

        verify(notificationService, times(1)).enqueue(
                eq(eventType),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                eq("{\"marketTitle\":\"Title\",\"comment\":\"Need more sources\"}"),
                eq("market:%s:submission:9:%s:user:%s".formatted(
                        marketId, eventType, creatorId)));
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
    void resolveMarket_shouldEnqueueUniqueActiveHoldersAndCreator() {
        UUID creatorId = UUID.randomUUID();
        UUID holderId = UUID.randomUUID();
        UUID bannedHolderId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.CLOSED, creatorId);
        User creator = user(creatorId, "creator@example.com", UserStatus.ACTIVE);
        User holder = user(holderId, "holder@example.com", UserStatus.ACTIVE);
        User bannedHolder = user(
                bannedHolderId, "banned@example.com", UserStatus.BANNED);

        when(positionRepository.findByMarketIdAndStatus(
                marketId, PositionStatus.OPEN))
                .thenReturn(List.of(
                        position(holderId),
                        position(holderId),
                        position(bannedHolderId)));
        when(resolutionService.resolveMarket(marketId, MarketResult.YES, adminId))
                .thenAnswer(invocation -> {
                    market.resolve(MarketResult.YES, adminId);
                    return market;
                });
        when(userRepository.findById(holderId)).thenReturn(Optional.of(holder));
        when(userRepository.findById(bannedHolderId))
                .thenReturn(Optional.of(bannedHolder));
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.resolveMarket(marketId, adminId, MarketResult.YES);

        InOrder order = inOrder(positionRepository, resolutionService);
        order.verify(positionRepository).findByMarketIdAndStatus(
                marketId, PositionStatus.OPEN);
        order.verify(resolutionService).resolveMarket(
                marketId, MarketResult.YES, adminId);
        verify(notificationService).enqueue(
                eq(NotificationEventType.MARKET_RESOLVED),
                eq(holderId),
                eq("holder@example.com"),
                eq(marketId),
                eq("{\"marketTitle\":\"Title\",\"result\":\"YES\"}"),
                eq("market:%s:%s:user:%s".formatted(
                        marketId, NotificationEventType.MARKET_RESOLVED, holderId)));
        verify(notificationService).enqueue(
                eq(NotificationEventType.MARKET_RESOLVED),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                eq("{\"marketTitle\":\"Title\",\"result\":\"YES\"}"),
                eq("market:%s:%s:user:%s".formatted(
                        marketId, NotificationEventType.MARKET_RESOLVED, creatorId)));
        verify(notificationService, never()).enqueue(
                eq(NotificationEventType.MARKET_RESOLVED),
                eq(bannedHolderId),
                anyString(),
                eq(marketId),
                anyString(),
                anyString());
    }

    @Test
    void resolveMarket_shouldEnqueueCreator_whenCreatorIsNotActive() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.CLOSED, creatorId);
        User creator = user(creatorId, "creator@example.com", UserStatus.BANNED);

        when(positionRepository.findByMarketIdAndStatus(
                marketId, PositionStatus.OPEN))
                .thenReturn(List.of());
        when(resolutionService.resolveMarket(marketId, MarketResult.YES, adminId))
                .thenAnswer(invocation -> {
                    market.resolve(MarketResult.YES, adminId);
                    return market;
                });
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.resolveMarket(marketId, adminId, MarketResult.YES);

        verify(notificationService).enqueue(
                eq(NotificationEventType.MARKET_RESOLVED),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                eq("{\"marketTitle\":\"Title\",\"result\":\"YES\"}"),
                eq("market:%s:%s:user:%s".formatted(
                        marketId, NotificationEventType.MARKET_RESOLVED, creatorId)));
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

    private Position position(UUID userId) {
        Position position = new Position();
        position.setMarketId(marketId);
        position.setUserId(userId);
        position.setStatus(PositionStatus.OPEN);
        return position;
    }

    private User user(UUID id, String email, UserStatus status) {
        User user = new User("user_" + id, email, "hashed");
        ReflectionTestUtils.setField(user, "id", id);
        user.changeStatus(status);
        return user;
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

    @Test
    void submitMarket_shouldEnqueueCreatorConfirmation() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.submitMarket(marketId, creatorId);

        verify(notificationService).enqueue(
                eq(NotificationEventType.MARKET_SUBMITTED),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                argThat(payload -> payload.contains("\"marketTitle\":\"Title\"")
                        && payload.contains("\"recipientType\":\"CREATOR\"")),
                eq("market:%s:submission:1:%s:user:%s".formatted(
                        marketId, NotificationEventType.MARKET_SUBMITTED, creatorId)));
    }

    @Test
    void submitMarket_shouldEnqueuePendingReviewForActiveAdmin() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);

        User admin = new User("reviewer", "reviewer@example.com", "hashed");
        admin.changeRole(UserRole.ADMIN);
        ReflectionTestUtils.setField(admin, "id", UUID.randomUUID());

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(userRepository.findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE))
                .thenReturn(List.of(admin));

        marketService.submitMarket(marketId, creatorId);

        verify(notificationService).enqueue(
                eq(NotificationEventType.MARKET_SUBMITTED),
                eq(admin.getId()), eq(admin.getEmail()), eq(marketId),
                contains("\"recipientType\":\"ADMIN\""),
                eq("market:%s:submission:1:%s:user:%s".formatted(
                        marketId, NotificationEventType.MARKET_SUBMITTED, admin.getId())));
    }

    @Test
    void submitMarket_creatorIsActiveAdmin_shouldEnqueueOneCombinedNotification() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        User creatorAdmin = new User("creator_admin", "creator_admin@example.com", "hashed");
        creatorAdmin.changeRole(UserRole.ADMIN);
        ReflectionTestUtils.setField(creatorAdmin, "id", creatorId);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creatorAdmin));
        when(userRepository.findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE))
                .thenReturn(List.of(creatorAdmin));

        marketService.submitMarket(marketId, creatorId);

        verify(notificationService, times(1)).enqueue(
                eq(NotificationEventType.MARKET_SUBMITTED),
                eq(creatorId),
                eq("creator_admin@example.com"),
                eq(marketId),
                contains("\"recipientType\":\"CREATOR_ADMIN\""),
                eq("market:%s:submission:1:%s:user:%s".formatted(
                        marketId, NotificationEventType.MARKET_SUBMITTED, creatorId)));
    }

    @Test
    void submitMarket_sameRequestTwice_shouldEnqueueCreatorOnce() {
        UUID creatorId = UUID.randomUUID();
        Market market = createMarket(MarketStatus.DRAFT, creatorId);
        User creator = new User("creator", "creator@example.com", "hashed");
        ReflectionTestUtils.setField(creator, "id", creatorId);

        when(marketRepository.findById(marketId)).thenReturn(Optional.of(market));
        when(marketRepository.save(market)).thenReturn(market);
        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        marketService.submitMarket(marketId, creatorId);

        assertThrows(ResponseStatusException.class,
                () -> marketService.submitMarket(marketId, creatorId));

        verify(notificationService, times(1)).enqueue(
                eq(NotificationEventType.MARKET_SUBMITTED),
                eq(creatorId),
                eq("creator@example.com"),
                eq(marketId),
                anyString(),
                anyString());
    }
}
