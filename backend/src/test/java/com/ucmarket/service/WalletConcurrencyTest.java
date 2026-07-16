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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ucmarket.exception.IdempotencyConflictException;
import com.ucmarket.exception.InsufficientFundsException;

// =================== 怎麼跑這支測試 ===================
// opt-in：一定要先設環境變數 WALLET_PG_TEST=true，否則整個 skip。跑完會自動清資料（可反覆跑）。
//
// 【命令列：先 cd 到 backend】
//   cmd        ： set WALLET_PG_TEST=true
//   PowerShell ： $env:WALLET_PG_TEST="true"
//   跑整隻 ： .\mvnw.cmd "-Dtest=WalletConcurrencyTest" test
//   跑單一 ： .\mvnw.cmd "-Dtest=WalletConcurrencyTest#concurrentDebit_noOverdraw" test
//   跑多個 ： .\mvnw.cmd "-Dtest=WalletConcurrencyTest#concurrentCredit_noLostUpdate+concurrentDebit_noOverdraw" test
//
// 【Eclipse / STS】
//   先設環境變數：Run → Run Configurations… → JUnit → 選這個 → Environment → New → WALLET_PG_TEST=true → Apply
//   跑整隻 ： 右鍵 class → Run As → JUnit Test
//   跑單一 ： 展開 class → 右鍵某個方法 → Run As → JUnit Test
//   注意：第一次右鍵直接跑會 4 skipped（沒設環境變數）；用 Run Configurations 設好再跑才會連真 PG。
// =====================================================
// WebEnvironment.NONE：只載 service + JPA + 真 DB，不載 web 層
// （錢包並發測試不需要 controller；同時避開 trade 模組無關的 ambiguous mapping）
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("walletpg-test")   // 私有 profile（不碰團隊共用的 pgtest 慣例）；連真 PostgreSQL
@EnabledIfEnvironmentVariable(named = "WALLET_PG_TEST", matches = "true")  // opt-in：沒設此環境變數就整個 skip
class WalletConcurrencyTest {

	@Autowired
	private WalletService walletService;        // 真的 service，不是 mock
	@Autowired
	private JdbcTemplate jdbc;                   // 塞/清 user 用（沒有 User entity）

	private UUID userId;

	@BeforeEach
	void seed() {
		userId = UUID.randomUUID();
		// FK：建錢包前 users 要有這列。username/email 要唯一 → 用 userId 拼
		jdbc.update(
				"INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
				userId, "ct-" + userId.toString().substring(0, 8), userId + "@test.com", "x");
		walletService.createWalletForUser(userId);   // 建空錢包(balance 0)
	}

	@AfterEach
	void cleanup() {
		// 沒有 @Transactional 回滾 → 真寫進 DB → 自己清，依 FK 反序刪
		jdbc.update("DELETE FROM wallet_transactions WHERE wallet_id IN "
				+ "(SELECT id FROM wallets WHERE user_id = ?)", userId);
		jdbc.update("DELETE FROM wallets WHERE user_id = ?", userId);
		jdbc.update("DELETE FROM users WHERE id = ?", userId);
	}

	// 場景 A：100 筆並發 credit(+1)，各帶不同 idemKey → 餘額必為 100。
	// 悲觀鎖若失效會 lost update（互相覆蓋舊餘額），餘額會 < 100。
	@Test
	@DisplayName("並發 credit：100 筆 +1 → 餘額 100、帳 100 筆（無 lost update）")
	void concurrentCredit_noLostUpdate() throws Exception {
		int threads = 100;
		runConcurrently(threads, n ->
				walletService.credit(userId, new BigDecimal("1"), "BONUS", null, "ct-" + n));

		// 錢：餘額剛好 100（抓 lost update）
		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("100");
		// 帳：流水帳剛好 100 列（抓「餘額對但帳對不上」這種分歧）
		Integer txCount = jdbc.queryForObject(
				"SELECT count(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ?",
				Integer.class, userId);
		assertThat(txCount).isEqualTo(100);
	}

	// 場景 B：50 筆並發、用「相同」idemKey → 全防重只成立一筆 → 餘額 +1、DB 只 1 列。
	@Test
	@DisplayName("並發同一 idemKey → 只成立一筆（防重）")
	void concurrentSameIdemKey_writesOnce() throws Exception {
		int threads = 50;
		runConcurrently(threads, n ->
				walletService.credit(userId, new BigDecimal("1"), "BONUS", null, "dup-key"));

		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("1");
		Integer count = jdbc.queryForObject(
				"SELECT count(*) FROM wallet_transactions WHERE idempotency_key = ?",
				Integer.class, "dup-key");
		assertThat(count).isEqualTo(1);
	}

	// 場景 C：餘額 100，並發 200 筆 debit(-1) → 成功剛好 100 筆、餘額 0、絕不為負。
	@Test
	@DisplayName("並發 debit：200 筆 -1（餘額 100）→ 成功 100、餘額 0、帳 100 筆 debit、不為負")
	void concurrentDebit_noOverdraw() throws Exception {
		walletService.credit(userId, new BigDecimal("100"), "BONUS", null, "seed-100");

		int threads = 200;
		AtomicInteger ok = new AtomicInteger();
		AtomicInteger insufficient = new AtomicInteger();
		runConcurrently(threads, n -> {
			try {
				walletService.debit(userId, new BigDecimal("1"), "TRADE", UUID.randomUUID(), "d-" + n);
				ok.incrementAndGet();
			} catch (InsufficientFundsException e) {
				insufficient.incrementAndGet();
			}
		});

		// 錢：餘額剛好 0、成功/失敗各 100
		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("0");
		assertThat(ok.get()).isEqualTo(100);
		assertThat(insufficient.get()).isEqualTo(100);
		// 帳：DB 裡剛好 100 筆 debit（金額<0），用真實列數對齊 ok 計數器
		Integer debitCount = jdbc.queryForObject(
				"SELECT count(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ? AND wt.amount < 0",
				Integer.class, userId);
		assertThat(debitCount).isEqualTo(100);
	}

	// F4：100 條並發對「同一個尚無錢包的 user」呼叫 createWalletForUser → 只成立一個錢包、零例外。
	@Test
	@DisplayName("並發建錢包：100 條搶建同一 user → 剛好一個、不丟例外")
	void concurrentCreateWallet_onlyOne() throws Exception {
		UUID freshUser = UUID.randomUUID();
		jdbc.update("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
				freshUser, "cw-" + freshUser.toString().substring(0, 8), freshUser + "@test.com", "x");
		try {
			AtomicInteger errors = new AtomicInteger();
			runConcurrently(100, n -> {
				try {
					walletService.createWalletForUser(freshUser);
				} catch (Exception e) {
					errors.incrementAndGet();
				}
			});

			Integer walletCount = jdbc.queryForObject(
					"SELECT count(*) FROM wallets WHERE user_id = ?", Integer.class, freshUser);
			assertThat(walletCount).isEqualTo(1);
			assertThat(errors.get()).isZero();
		} finally {
			jdbc.update("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ?)", freshUser);
			jdbc.update("DELETE FROM wallets WHERE user_id = ?", freshUser);
			jdbc.update("DELETE FROM users WHERE id = ?", freshUser);
		}
	}

	// ======== GY（極度嚴格）對抗式併發 ========

	// GY-1：N 個「不同 user」併發用「同一個全域 idemKey」credit。
	// 跨錢包 → 悲觀鎖序列化不了（不同列）→ 只能靠 wallet_transactions 的全域唯一索引擋。
	// 若索引不存在，這條會抓出來（會變成多筆成立）。
	@Test
	@DisplayName("GY 跨錢包同一全域 idemKey：30 user 併發 → 全域只成立 1 筆、其餘 409")
	void concurrentSameKeyAcrossWallets_globalUniqueWins() throws Exception {
		int n = 30;
		String key = "global-" + UUID.randomUUID();
		UUID[] users = new UUID[n];
		for (int i = 0; i < n; i++) {
			UUID u = UUID.randomUUID();
			jdbc.update("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
					u, "gw-" + u.toString().substring(0, 8), u + "@test.com", "x");
			walletService.createWalletForUser(u);
			users[i] = u;
		}
		AtomicInteger ok = new AtomicInteger();
		AtomicInteger conflict = new AtomicInteger();
		try {
			runConcurrently(n, i -> {
				try {
					walletService.credit(users[i], new BigDecimal("1"), "BONUS", null, key);
					ok.incrementAndGet();
				} catch (IdempotencyConflictException e) {
					conflict.incrementAndGet();
				}
			});

			Integer keyCount = jdbc.queryForObject(
					"SELECT count(*) FROM wallet_transactions WHERE idempotency_key = ?", Integer.class, key);
			assertThat(keyCount).isEqualTo(1);             // 全域只 1 筆
			assertThat(ok.get()).isEqualTo(1);             // 只 1 個成功
			assertThat(conflict.get()).isEqualTo(n - 1);   // 其餘全 409（ok+conflict 必須湊滿 n）
			BigDecimal total = BigDecimal.ZERO;
			for (UUID u : users) {
				total = total.add(walletService.getBalance(u));
			}
			assertThat(total).isEqualByComparingTo("1");   // 30 個錢包加總只多了 1 點
		} finally {
			for (UUID u : users) {
				jdbc.update("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ?)", u);
				jdbc.update("DELETE FROM wallets WHERE user_id = ?", u);
				jdbc.update("DELETE FROM users WHERE id = ?", u);
			}
		}
	}

	// GY-2：拿「同一個 idemKey」亂搞 —— 同一錢包，N 條併發，一半 credit 一半 debit、金額全不同。
	// 悲觀鎖序列化 → 第一條成立，其餘全 verify-on-hit 撞「型別/金額不符」→ 409
	// （brandur 冪等聖經：同 key 不同參數 = client bug → 一律 409）。
	// 不變量：這把 key 全 DB 只准 1 筆，餘額剛好 = seed + 那唯一一筆的「帶號」金額。
	@Test
	@DisplayName("GY 同 key 亂搞（credit/debit 混打不同金額）：60 併發 → 只 1 筆生效、其餘 409")
	void concurrentSameKeyMixedOps_onlyOneEffect() throws Exception {
		BigDecimal seed = new BigDecimal("1000");
		walletService.credit(userId, seed, "BONUS", null, "seed-" + userId);   // 墊夠 → debit 也可能當贏家

		int threads = 60;
		String key = "chaos-" + UUID.randomUUID();
		AtomicInteger ok = new AtomicInteger();
		AtomicInteger conflict = new AtomicInteger();
		runConcurrently(threads, n -> {
			try {
				BigDecimal amt = new BigDecimal(n + 1);                // 1..60，全不同
				if (n % 2 == 0) {
					walletService.credit(userId, amt, "BONUS", null, key);
				} else {
					walletService.debit(userId, amt, "TRADE", UUID.randomUUID(), key);
				}
				ok.incrementAndGet();
			} catch (IdempotencyConflictException e) {
				conflict.incrementAndGet();
			}
		});

		assertThat(ok.get()).isEqualTo(1);                       // 全程只 1 條操作生效
		assertThat(conflict.get()).isEqualTo(threads - 1);       // 其餘全 409（ok+conflict 必須湊滿）
		Integer keyCount = jdbc.queryForObject(
				"SELECT count(*) FROM wallet_transactions WHERE idempotency_key = ?", Integer.class, key);
		assertThat(keyCount).isEqualTo(1);
		// 餘額 = seed + 唯一成立那筆的帶號金額（credit 正、debit 負）
		BigDecimal persistedSigned = jdbc.queryForObject(
				"SELECT amount FROM wallet_transactions WHERE idempotency_key = ?", BigDecimal.class, key);
		assertThat(walletService.getBalance(userId)).isEqualByComparingTo(seed.add(persistedSigned));
	}

	// GY-3：貼地飛行 —— 空錢包起跳，credit:debit = 1:2 狂洗，逼最多 debit 去撞 overdraw 邊界。
	// 一邊加一邊扣、餘額長期貼著 0；同時守三條不變量
	// （Jepsen「Bank」守恆 + Flexcoin 超賣防線 + DEV.to「餘額==流水總和」抓 lost update）：
	//   ① 餘額 == 流水總和（balance == Σ amount）
	//   ② 餘額 >= 0，且每一筆 balance_after >= 0（任一刻都不准破 0）
	//   ③ 餘額 == 成功credit - 成功debit（計數器獨立推導）、tx 筆數 == 成功總數
	@Test
	@DisplayName("GY 貼地飛行：空錢包 credit:debit=1:2 狂洗 300 → 守恆、永不為負、帳實一致")
	void concurrentGroundHugging_neverOverdrawsAndConserves() throws Exception {
		// @BeforeEach 已建好空錢包(餘額 0)，不墊 seed → 每筆 debit 都在啃 0 邊界
		String tag = userId.toString().substring(0, 8);
		int threads = 300;
		AtomicInteger creditsOk = new AtomicInteger();
		AtomicInteger debitsOk = new AtomicInteger();
		runConcurrently(threads, n -> {
			try {
				if (n % 3 == 0) {   // 1/3 credit、2/3 debit → 餘額長不大、貼著地板
					walletService.credit(userId, new BigDecimal("1"), "BONUS", null, "gh-c-" + tag + "-" + n);
					creditsOk.incrementAndGet();
				} else {
					walletService.debit(userId, new BigDecimal("1"), "TRADE", UUID.randomUUID(), "gh-d-" + tag + "-" + n);
					debitsOk.incrementAndGet();
				}
			} catch (InsufficientFundsException ignored) {
				// 餘額不足的 debit：被擋下、不寫 tx —— 這正是我們要狂洗的路徑
			}
		});

		BigDecimal balance = walletService.getBalance(userId);
		// ① 守恆：餘額必須剛好等於流水總和（抓 lost update / 帳實分歧）
		BigDecimal ledgerSum = jdbc.queryForObject(
				"SELECT COALESCE(SUM(wt.amount), 0) FROM wallet_transactions wt "
				+ "JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ?", BigDecimal.class, userId);
		assertThat(balance).isEqualByComparingTo(ledgerSum);
		// ② 永不超賣：最終 >= 0，且歷史上每一筆 balance_after 都 >= 0（任一刻都沒破 0）
		assertThat(balance).isGreaterThanOrEqualTo(BigDecimal.ZERO);
		BigDecimal minBalanceAfter = jdbc.queryForObject(
				"SELECT COALESCE(MIN(wt.balance_after), 0) FROM wallet_transactions wt "
				+ "JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ?", BigDecimal.class, userId);
		assertThat(minBalanceAfter).isGreaterThanOrEqualTo(BigDecimal.ZERO);
		// ③ 計數器獨立推導：空錢包起跳 → 餘額 == 成功credit - 成功debit；tx 筆數 == 成功總數
		assertThat(balance).isEqualByComparingTo(
				new BigDecimal(creditsOk.get()).subtract(new BigDecimal(debitsOk.get())));
		Integer txCount = jdbc.queryForObject(
				"SELECT count(*) FROM wallet_transactions wt "
				+ "JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = ?", Integer.class, userId);
		assertThat(txCount).isEqualTo(creditsOk.get() + debitsOk.get());
	}

	// ── 並發小工具：threads 條虛擬執行緒同時起跑，全跑完才返回 ──
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
					start.await();          // 等所有執行緒就位 → 同時起跑，放大競態
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
