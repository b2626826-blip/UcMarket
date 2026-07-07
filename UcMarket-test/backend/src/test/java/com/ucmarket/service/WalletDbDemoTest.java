package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntConsumer;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ucmarket.exception.InsufficientFundsException;

// 示範 / 對帳用：4 個並發情境，真的寫進 PostgreSQL，且「完全不清資料」（沒有 @AfterEach）。
// 跑完資料留在 DB 給你 query；idempotency key 每次跑都不同（帶 user tag），留著也不會撞正式的 WalletConcurrencyTest。
// 跟正式 WalletConcurrencyTest 同一套並發機制，差別只在：★ 不清資料 + key 每次唯一 ★
//
// 怎麼跑（先 cd backend；opt-in，沒設環境變數會整個 skip）：
//   cmd：set WALLET_PG_TEST=true        PowerShell：$env:WALLET_PG_TEST="true"
//   整隻（4 情境都灌）：.\mvnw.cmd "-Dtest=WalletDbDemoTest" test
//   單一情境：見各方法上方的「單跑」那行
//   Eclipse：Run Configurations → Environment 設 WALLET_PG_TEST=true；右鍵 class 或 method → Run As → JUnit
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("walletpg-test")
@EnabledIfEnvironmentVariable(named = "WALLET_PG_TEST", matches = "true")
class WalletDbDemoTest {

	@Autowired
	private WalletService walletService;
	@Autowired
	private JdbcTemplate jdbc;

	// ① 1000 條並發 credit +1（各帶不同 idemKey）→ 餘額 100、tx 100 列
	// 單跑：.\mvnw.cmd "-Dtest=WalletDbDemoTest#demoCredit_persist" test
	@Test
	@DisplayName("①並發 credit 1000 → 留 1000 筆")
	void demoCredit_persist() throws Exception {
		UUID userId = newUser("demo-credit");
		String tag = userId.toString().substring(0, 8);
		walletService.createWalletForUser(userId);

		runConcurrently(1000, n ->
				walletService.credit(userId, new BigDecimal("1"), "BONUS", null, "c-" + tag + "-" + n));

		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("1000");
		assertThat(txCount(userId)).isEqualTo(1000);
		report("①credit", userId, "balance=1000, tx=1000");
	}

	// ② 50 條並發、同一個 idemKey → 只成立 1 筆 → 餘額 1、tx 1 列
	// 單跑：.\mvnw.cmd "-Dtest=WalletDbDemoTest#demoIdempotency_persist" test
	@Test
	@DisplayName("②並發同 idemKey 50 → 留 1 筆")
	void demoIdempotency_persist() throws Exception {
		UUID userId = newUser("demo-idem");
		String tag = userId.toString().substring(0, 8);
		walletService.createWalletForUser(userId);

		runConcurrently(50, n ->
				walletService.credit(userId, new BigDecimal("1"), "BONUS", null, "same-" + tag));

		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("1");
		assertThat(txCount(userId)).isEqualTo(1);
		report("②idem", userId, "balance=1, tx=1");
	}

	// ③ 餘額 100，200 條並發 debit -1 → 成功 100、餘額 0；tx = 1(seed) + 100(debit) = 101
	// 單跑：.\mvnw.cmd "-Dtest=WalletDbDemoTest#demoDebit_persist" test
	@Test
	@DisplayName("③並發 debit 200（餘額100）→ 留 101 筆、餘額 0")
	void demoDebit_persist() throws Exception {
		UUID userId = newUser("demo-debit");
		String tag = userId.toString().substring(0, 8);
		walletService.createWalletForUser(userId);
		walletService.credit(userId, new BigDecimal("100"), "BONUS", null, "seed-" + tag);

		AtomicInteger ok = new AtomicInteger();
		AtomicInteger insufficient = new AtomicInteger();
		runConcurrently(200, n -> {
			try {
				walletService.debit(userId, new BigDecimal("1"), "TRADE", UUID.randomUUID(), "d-" + tag + "-" + n);
				ok.incrementAndGet();
			} catch (InsufficientFundsException e) {
				insufficient.incrementAndGet();
			}
		});

		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("0");
		assertThat(ok.get()).isEqualTo(100);
		assertThat(txCount(userId)).isEqualTo(101);   // 1 credit + 100 debit
		report("③debit", userId, "balance=0, ok=100, tx=101");
	}

	// ④ 100 條並發對同一個「尚無錢包」的 user 建錢包 → 剛好 1 個、0 例外（此 user 無 tx）
	// 單跑：.\mvnw.cmd "-Dtest=WalletDbDemoTest#demoCreateWallet_persist" test
	@Test
	@DisplayName("④並發建錢包 100 → 留 1 個錢包")
	void demoCreateWallet_persist() throws Exception {
		UUID userId = newUser("demo-wallet");   // 故意不先建錢包

		AtomicInteger errors = new AtomicInteger();
		runConcurrently(100, n -> {
			try {
				walletService.createWalletForUser(userId);
			} catch (Exception e) {
				errors.incrementAndGet();
			}
		});

		Integer wallets = jdbc.queryForObject(
				"SELECT count(*) FROM wallets WHERE user_id = ?", Integer.class, userId);
		assertThat(wallets).isEqualTo(1);
		assertThat(errors.get()).isZero();
		report("④wallet", userId, "wallets=1, errors=0");
	}

	// ---------- 小工具（不刪任何東西）----------

	// 建一個帶可辨識前綴的 user（FK 需要先有 user），回傳 userId；故意不刪。
	private UUID newUser(String prefix) {
		UUID id = UUID.randomUUID();
		String tag = id.toString().substring(0, 8);
		jdbc.update("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
				id, prefix + "-" + tag, prefix + "-" + tag + "@test.com", "x");
		return id;
	}

	// 數這個 user 的 wallet_transactions 筆數
	private Integer txCount(UUID userId) {
		return jdbc.queryForObject(
				"SELECT count(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ?",
				Integer.class, userId);
	}

	// 印出這次寫了什麼、user 是誰，方便去 DB 找
	private void report(String name, UUID userId, String result) {
		System.out.println("=== DEMO " + name + " 已寫入並保留 === user=" + userId + " | " + result);
	}

	// 並發小工具：threads 條虛擬執行緒先全部就位，再「同時起跑」放大競態，全跑完才返回
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
