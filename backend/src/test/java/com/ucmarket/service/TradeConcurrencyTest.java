package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.IntConsumer;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ucmarket.dto.TradeRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.repository.MarketRepository;

// 對應 C-NEW-15（TradeService 市場池 lost-update）：驗證同一市場並發下單時
// yesPool 不會發生 lost update。沿用 WalletConcurrencyTest 的真 PostgreSQL + opt-in 作法，
// 因為 H2 對悲觀鎖的序列化行為與真 DB 不一致，測不出這類競態。
//
// 【怎麼跑】cd 到 backend，設環境變數 WALLET_PG_TEST=true 後：
//   .\mvnw.cmd "-Dtest=TradeConcurrencyTest" test
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("walletpg-test")
@EnabledIfEnvironmentVariable(named = "WALLET_PG_TEST", matches = "true")
class TradeConcurrencyTest {

	@Autowired
	private TradeService tradeService;
	@Autowired
	private MarketRepository marketRepository;
	@Autowired
	private WalletService walletService;
	@Autowired
	private JdbcTemplate jdbc;

	private UUID userId;
	private UUID marketId;

	@BeforeEach
	void seed() {
		userId = UUID.randomUUID();
		jdbc.update(
				"INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
				userId, "tc-" + userId.toString().substring(0, 8), userId + "@test.com", "x");
		walletService.createWalletForUser(userId);
		walletService.credit(userId, new BigDecimal("100000"), "BONUS", null, "seed-" + userId);

		Market market = new Market("Concurrency market", "desc", "test",
				"https://example.com/source", "resolves by admin",
				LocalDateTime.now().plusDays(1));
		market.setCreatorId(userId);
		market.approve(userId);
		market = marketRepository.save(market);
		marketId = market.getId();
	}

	@AfterEach
	void cleanup() {
		jdbc.update("DELETE FROM trades WHERE market_id = ?", marketId);
		jdbc.update("DELETE FROM positions WHERE market_id = ?", marketId);
		jdbc.update("DELETE FROM markets WHERE id = ?", marketId);
		jdbc.update("DELETE FROM wallet_transactions WHERE wallet_id IN "
				+ "(SELECT id FROM wallets WHERE user_id = ?)", userId);
		jdbc.update("DELETE FROM wallets WHERE user_id = ?", userId);
		jdbc.update("DELETE FROM users WHERE id = ?", userId);
	}

	// 50 條併發對同一市場買 YES，各 10 元。悲觀鎖若失效，並發寫回會互相覆蓋，
	// yesPool 最終會小於「期初值 + 50*10」。
	@Test
	@DisplayName("並發下單 50 筆買 YES → yesPool 精確等於期初值加總金額（無 lost update）")
	void concurrentPlaceTrade_yesPool_noLostUpdate() throws Exception {
		int threads = 50;
		BigDecimal amountPerTrade = new BigDecimal("10.00");
		BigDecimal initialYesPool = marketRepository.findById(marketId).orElseThrow().getYesPool();

		runConcurrently(threads, n ->
				tradeService.placeTrade(userId, new TradeRequest(marketId, MarketSide.YES, amountPerTrade)));

		BigDecimal expectedYesPool = initialYesPool.add(amountPerTrade.multiply(new BigDecimal(threads)));
		BigDecimal actualYesPool = marketRepository.findById(marketId).orElseThrow().getYesPool();
		assertThat(actualYesPool).isEqualByComparingTo(expectedYesPool);

		Integer tradeCount = jdbc.queryForObject(
				"SELECT count(*) FROM trades WHERE market_id = ?", Integer.class, marketId);
		assertThat(tradeCount).isEqualTo(threads);
	}

	private void runConcurrently(int threads, IntConsumer task) throws InterruptedException {
		ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
		CountDownLatch ready = new CountDownLatch(threads);
		CountDownLatch start = new CountDownLatch(1);
		CountDownLatch done = new CountDownLatch(threads);
		for (int i = 0; i < threads; i++) {
			final int n = i;
			pool.submit(() -> {
				ready.countDown();
				try {
					start.await();
					task.accept(n);
				} catch (Exception ignored) {
				} finally {
					done.countDown();
				}
			});
		}
		ready.await();
		start.countDown();
		boolean finished = done.await(60, TimeUnit.SECONDS);
		pool.shutdownNow();
		if (!finished) {
			throw new IllegalStateException("並發任務逾時未完成");
		}
	}
}
