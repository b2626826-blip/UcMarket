package com.ucmarket.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.controller.MarketController;
import com.ucmarket.controller.TradeController;
import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketReview;
import com.ucmarket.entity.MarketReview.ReviewStatus;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.entity.Trade;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.Wallet;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.MarketPriceHistoryRepository;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.repository.WalletRepository;
import com.ucmarket.repository.WalletTransactionRepository;
import com.ucmarket.service.MarketService;
import com.ucmarket.service.MarketPreReviewResult;
import com.ucmarket.service.MarketPreReviewService;
import com.ucmarket.service.PriceHistoryService;
import com.ucmarket.service.PositionService;
import com.ucmarket.service.ResolutionService;
import com.ucmarket.service.TradeQuoteService;
import com.ucmarket.service.TradeService;
import com.ucmarket.service.WalletService;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.UserRepository;

/**
 * Core workflow test using real controllers, services and entities.
 * Repositories are stateful doubles so the default suite does not depend on
 * PostgreSQL-only partial ON CONFLICT syntax used by PositionRepository.
 */
class CoreMarketLifecycleTest {

	private final MarketRepository marketRepository = mock(MarketRepository.class);
	private final MarketReviewRepository marketReviewRepository = mock(MarketReviewRepository.class);
	private final AdminLogRepository adminLogRepository = mock(AdminLogRepository.class);
	private final PositionRepository positionRepository = mock(PositionRepository.class);
	private final TradeRepository tradeRepository = mock(TradeRepository.class);
	private final WalletRepository walletRepository = mock(WalletRepository.class);
	private final WalletTransactionRepository walletTransactionRepository =
			mock(WalletTransactionRepository.class);
	private final UserRepository userRepository = mock(UserRepository.class);
	private final NotificationService notificationService = mock(NotificationService.class);
	private final MarketPreReviewService preReviewService = mock(MarketPreReviewService.class);

	private final Map<UUID, Market> markets = new HashMap<>();
	private final Map<PositionKey, Position> positions = new HashMap<>();
	private final Map<UUID, Wallet> wallets = new HashMap<>();
	private final Map<String, WalletTransaction> walletTransactions = new LinkedHashMap<>();
	private final List<Trade> trades = new ArrayList<>();
	private final List<MarketReview> marketReviews = new ArrayList<>();
	private final List<AdminLog> adminLogs = new ArrayList<>();

	private MarketController marketController;
	private TradeController tradeController;
	private MarketService marketService;
	private WalletService walletService;

	@BeforeEach
	void setUp() {
		stubMarketRepository();
		stubPositionRepository();
		stubWalletRepositories();
		stubTradeAndAuditRepositories();
		when(preReviewService.reviewForSubmission(any()))
				.thenReturn(new MarketPreReviewResult(List.of(), List.of()));

		walletService = new WalletService(walletRepository, walletTransactionRepository);
		PositionService positionService = new PositionService(positionRepository);
		PriceHistoryService priceHistoryService = new PriceHistoryService(
				mock(MarketPriceHistoryRepository.class), marketRepository);
		TradeQuoteService tradeQuoteService = new TradeQuoteService();
		ResolutionService resolutionService =
				new ResolutionService(marketRepository, positionRepository, walletService);
		marketService = new MarketService(
				marketRepository,
				marketReviewRepository,
				adminLogRepository,
				resolutionService,
				positionRepository,
				walletService,
				userRepository,
				notificationService,
				preReviewService
		);
		TradeService tradeService = new TradeService(
				marketRepository,
				tradeRepository,
				tradeQuoteService,
				walletService,
				positionService,
				priceHistoryService
		);
		marketController = new MarketController(
				marketRepository,
				tradeRepository,
				marketService,
				tradeQuoteService,
				priceHistoryService,
				Jackson2ObjectMapperBuilder.json().build()
		);
		tradeController = new TradeController(tradeService);
	}

	@Test
	void createApproveTradeCloseAndResolve_shouldCompleteCoreMarketLifecycle() {
		User creator = user(UserRole.USER);
		User trader = user(UserRole.USER);
		User admin = user(UserRole.ADMIN);
		when(userRepository.findById(creator.getId())).thenReturn(Optional.of(creator));

		walletService.createWalletForUser(trader.getId());
		walletService.credit(
				trader.getId(),
				new BigDecimal("1000.00"),
				"BONUS",
				null,
				"signup:seed-" + trader.getId()
		);

		Market market = marketController.createMarket(
				creator,
				new CreateMarketRequest(
						"Will the core flow complete?",
						"Core lifecycle scenario",
						"TEST",
						"BINARY",
						"https://example.com/result",
						null,
						null,
						"Resolve YES when the scenario completes.",
						LocalDateTime.now().plusDays(1)
				)
		);
		assertThat(market.getStatus()).isEqualTo(MarketStatus.DRAFT);
		assertThat(market.getCreatorId()).isEqualTo(creator.getId());

		marketController.submitMarket(market.getId(), creator);
		assertThat(market.getStatus()).isEqualTo(MarketStatus.PENDING);

		marketService.approveMarket(market.getId(), admin.getId());
		assertThat(market.getStatus()).isEqualTo(MarketStatus.ACTIVE);
		assertThat(marketReviews)
				.singleElement()
				.satisfies(review -> {
					assertThat(review.getStatus()).isEqualTo(ReviewStatus.APPROVED);
					assertThat(review.getReviewerId()).isEqualTo(admin.getId());
				});

		ResponseEntity<Trade> response = tradeController.placeTrade(
				trader,
				"trade-core-1",
				new TradeRequest(market.getId(), MarketSide.YES, new BigDecimal("20.00"))
		);
		Trade trade = response.getBody();
		assertThat(trade).isNotNull();
		assertThat(trade.getPrice()).isEqualByComparingTo("2.0000");
		assertThat(trade.getShares()).isEqualByComparingTo("10.00000000");
		assertThat(trades).containsExactly(trade);
		assertThat(wallets.get(trader.getId()).getBalance()).isEqualByComparingTo("980.00");
		assertThat(market.getYesPool()).isEqualByComparingTo("120.00");
		assertThat(market.getNoPool()).isEqualByComparingTo("100.00");
		// ponytail: 確認 TradeService 走鎖定路徑，非 findById
		verify(marketRepository).findByIdForUpdate(market.getId());

		Position position = positions.get(new PositionKey(trader.getId(), market.getId()));
		assertThat(position).isNotNull();
		assertThat(position.getStatus()).isEqualTo(PositionStatus.OPEN);
		assertThat(position.getYesShares()).isEqualByComparingTo("10.00000000");
		assertThat(position.getYesCost()).isEqualByComparingTo("20.00");

		ReflectionTestUtils.setField(market, "closeAt", LocalDateTime.now().minusSeconds(1));
		marketService.autoCloseExpiredMarkets();
		assertThat(market.getStatus()).isEqualTo(MarketStatus.CLOSED);

		Market resolved = marketService.resolveMarket(market.getId(), admin.getId(), MarketResult.YES);
		assertThat(resolved.getStatus()).isEqualTo(MarketStatus.RESOLVED);
		assertThat(resolved.getResult()).isEqualTo(MarketResult.YES);
		assertThat(resolved.getResolvedBy()).isEqualTo(admin.getId());
		assertThat(position.getStatus()).isEqualTo(PositionStatus.SETTLED);
		assertThat(wallets.get(trader.getId()).getBalance()).isEqualByComparingTo("1016.66");

		assertThat(walletTransactions.values())
				.extracting(WalletTransaction::getType)
				.containsExactly(
						WalletTransactionType.SIGNUP_BONUS,
						WalletTransactionType.TRADE_BUY,
						WalletTransactionType.RESOLUTION_PAYOUT
				);
		assertThat(walletTransactions.get("trade-core-1").getAmount())
				.isEqualByComparingTo("-20.00");
		assertThat(walletTransactions.get("resolution:" + position.getId()).getAmount())
				.isEqualByComparingTo("36.66");
		assertThat(adminLogs)
				.extracting(AdminLog::getAction)
				.containsExactly("MARKET_APPROVE", "MARKET_RESOLVE");
	}

	private void stubMarketRepository() {
		when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> {
			Market market = invocation.getArgument(0);
			if (market.getId() == null) {
				ReflectionTestUtils.setField(market, "id", UUID.randomUUID());
			}
			markets.put(market.getId(), market);
			return market;
		});
		when(marketRepository.findById(any(UUID.class))).thenAnswer(invocation ->
				Optional.ofNullable(markets.get(invocation.getArgument(0))));
		when(marketRepository.findByIdForUpdate(any(UUID.class))).thenAnswer(invocation ->
				Optional.ofNullable(markets.get(invocation.getArgument(0))));
		when(marketRepository.findByStatusAndCloseAtBefore(any(MarketStatus.class), any(LocalDateTime.class)))
				.thenAnswer(invocation -> {
					MarketStatus status = invocation.getArgument(0);
					LocalDateTime cutoff = invocation.getArgument(1);
					return markets.values().stream()
							.filter(market -> market.getStatus() == status)
							.filter(market -> market.getCloseAt().isBefore(cutoff))
							.toList();
				});
	}

	private void stubPositionRepository() {
		when(positionRepository.upsertYesBuy(
				any(UUID.class), any(UUID.class), any(UUID.class), any(BigDecimal.class), any(BigDecimal.class)))
				.thenAnswer(invocation -> {
					UUID id = invocation.getArgument(0);
					UUID userId = invocation.getArgument(1);
					UUID marketId = invocation.getArgument(2);
					BigDecimal shares = invocation.getArgument(3);
					BigDecimal cost = invocation.getArgument(4);
					PositionKey key = new PositionKey(userId, marketId);
					Position position = positions.computeIfAbsent(key, ignored -> position(id, userId, marketId));
					if (position.getStatus() != PositionStatus.OPEN) {
						return 0;
					}
					position.setYesShares(position.getYesShares().add(shares));
					position.setYesCost(position.getYesCost().add(cost));
					return 1;
				});
		when(positionRepository.findByUserIdAndMarketId(any(UUID.class), any(UUID.class)))
				.thenAnswer(invocation -> Optional.ofNullable(positions.get(new PositionKey(
						invocation.getArgument(0), invocation.getArgument(1)))));
		when(positionRepository.findByMarketIdAndStatus(any(UUID.class), any(PositionStatus.class)))
				.thenAnswer(invocation -> {
					UUID marketId = invocation.getArgument(0);
					PositionStatus status = invocation.getArgument(1);
					return positions.values().stream()
							.filter(position -> position.getMarketId().equals(marketId))
							.filter(position -> position.getStatus() == status)
							.toList();
				});
	}

	private void stubWalletRepositories() {
		doAnswer(invocation -> {
			UUID walletId = invocation.getArgument(0);
			UUID userId = invocation.getArgument(1);
			wallets.computeIfAbsent(userId, ignored -> {
				Wallet wallet = new Wallet(userId);
				ReflectionTestUtils.setField(wallet, "id", walletId);
				return wallet;
			});
			return null;
		}).when(walletRepository).insertIfAbsent(any(UUID.class), any(UUID.class));
		when(walletRepository.findByUserId(any(UUID.class))).thenAnswer(invocation ->
				Optional.ofNullable(wallets.get(invocation.getArgument(0))));
		when(walletRepository.findByUserIdForUpdate(any(UUID.class))).thenAnswer(invocation ->
				Optional.ofNullable(wallets.get(invocation.getArgument(0))));
		when(walletTransactionRepository.findByIdempotencyKey(any(String.class))).thenAnswer(invocation ->
				Optional.ofNullable(walletTransactions.get(invocation.getArgument(0))));
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class))).thenAnswer(invocation -> {
			WalletTransaction transaction = invocation.getArgument(0);
			ReflectionTestUtils.setField(transaction, "id", UUID.randomUUID());
			walletTransactions.put(transaction.getIdempotencyKey(), transaction);
			return transaction;
		});
	}

	private void stubTradeAndAuditRepositories() {
		when(tradeRepository.findByIdempotencyKey(any(String.class))).thenReturn(Optional.empty());
		when(tradeRepository.saveAndFlush(any(Trade.class))).thenAnswer(invocation -> {
			Trade trade = invocation.getArgument(0);
			ReflectionTestUtils.setField(trade, "id", UUID.randomUUID());
			trades.add(trade);
			return trade;
		});
		when(marketReviewRepository.save(any(MarketReview.class))).thenAnswer(invocation -> {
			MarketReview review = invocation.getArgument(0);
			marketReviews.add(review);
			return review;
		});
		when(adminLogRepository.save(any(AdminLog.class))).thenAnswer(invocation -> {
			AdminLog log = invocation.getArgument(0);
			adminLogs.add(log);
			return log;
		});
	}

	private Position position(UUID id, UUID userId, UUID marketId) {
		Position position = new Position();
		ReflectionTestUtils.setField(position, "id", id);
		position.setUserId(userId);
		position.setMarketId(marketId);
		return position;
	}

	private User user(UserRole role) {
		User user = new User(UUID.randomUUID().toString(), UUID.randomUUID() + "@example.com", "hash");
		ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
		user.changeRole(role);
		return user;
	}

	private record PositionKey(UUID userId, UUID marketId) {
	}
}
