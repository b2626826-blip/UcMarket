package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.entity.Wallet;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.exception.IdempotencyConflictException;
import com.ucmarket.exception.InsufficientFundsException;
import com.ucmarket.exception.WalletNotFoundException;
import com.ucmarket.repository.WalletRepository;
import com.ucmarket.repository.WalletTransactionRepository;

/**
 * WalletService 單元測試 —— 不連 DB、不載 Spring，毫秒級。
 * 兩個 repo 都換成 mock 塞進建構子 —— 這就是 DI 讓程式好測的地方。
 * 共 14 個：createWallet(2) / credit(4) / getBalance(2) / getTransactions(2) / debit(4)。
 */
class WalletServiceTest {

	private final WalletRepository walletRepository =
			mock(WalletRepository.class);
	private final WalletTransactionRepository walletTransactionRepository =
			mock(WalletTransactionRepository.class);
	private final WalletService walletService =
			new WalletService(walletRepository, walletTransactionRepository);

	// ========== createWalletForUser（2）==========

	@Test
	@DisplayName("createWalletForUser：upsert 後回傳錢包（insertIfAbsent 被呼叫）")
	void createWalletForUser_upsertsThenReturns() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(wallet));

		Wallet result = walletService.createWalletForUser(userId);

		assertThat(result).isSameAs(wallet);
		verify(walletRepository).insertIfAbsent(any(UUID.class), eq(userId));   // DB 層 upsert（並發安全）
	}

	@Test
	@DisplayName("createWalletForUser：upsert 後仍查不到 → IllegalState（理論上不該發生）")
	void createWalletForUser_throwsIfStillMissingAfterUpsert() {
		UUID userId = UUID.randomUUID();
		when(walletRepository.findByUserId(userId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> walletService.createWalletForUser(userId))
				.isInstanceOf(IllegalStateException.class);
	}

	// ========== credit 入帳（4）==========

	@Test
	@DisplayName("credit 正常：餘額+、寫一筆正號 tx、type 由 refType 推導")
	void credit_addsMoneyAndWritesTransaction() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);                       // balance 0
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("signup-test"))
				.thenReturn(Optional.empty());                     // query-first 查不到 → 往下加錢
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));            // 原樣吐回，才能驗 tx 內容

		WalletTransaction tx = walletService.credit(
				userId, new BigDecimal("1000"), "BONUS", null, "signup-test");

		assertThat(wallet.getBalance()).isEqualByComparingTo("1000");
		assertThat(tx.getType()).isEqualTo(WalletTransactionType.SIGNUP_BONUS);  // BONUS→SIGNUP_BONUS
		assertThat(tx.getAmount()).isEqualByComparingTo("1000");
		assertThat(tx.getBalanceAfter()).isEqualByComparingTo("1000");
		verify(walletTransactionRepository).saveAndFlush(any(WalletTransaction.class));
	}

	@Test
	@DisplayName("credit：沒帶 idemKey → 擋下，連 DB 都不碰（全防重）")
	void credit_rejectsBlankIdemKey() {
		UUID userId = UUID.randomUUID();
		assertThatThrownBy(() ->
				walletService.credit(userId, new BigDecimal("100"), "BONUS", null, null))
				.isInstanceOf(IllegalArgumentException.class);
		verify(walletRepository, never()).findByUserIdForUpdate(any());
	}

	@Test
	@DisplayName("credit：查無錢包 → WalletNotFoundException")
	void credit_throwsWhenWalletMissing() {
		UUID userId = UUID.randomUUID();
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.empty());
		assertThatThrownBy(() ->
				walletService.credit(userId, new BigDecimal("100"), "BONUS", null, "k1"))
				.isInstanceOf(WalletNotFoundException.class);
	}

	@Test
	@DisplayName("credit 冪等：同一 idemKey 已有 tx → 回原筆、不重加、不再 save")
	void credit_idempotentReturnsExisting() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);                       // balance 0
		WalletTransaction existing = new WalletTransaction(
				wallet.getId(), WalletTransactionType.SIGNUP_BONUS, new BigDecimal("1000"),
				new BigDecimal("1000"), "BONUS", null, "dup-key");
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("dup-key"))
				.thenReturn(Optional.of(existing));               // 假裝這 key 已寫過

		WalletTransaction tx = walletService.credit(
				userId, new BigDecimal("1000"), "BONUS", null, "dup-key");

		assertThat(tx).isSameAs(existing);                        // 回的就是原筆
		assertThat(wallet.getBalance()).isEqualByComparingTo("0"); // 沒重加（還是 0）
		verify(walletTransactionRepository, never()).saveAndFlush(any());  // 沒再寫一筆
	}

	// ========== verify-on-hit / idempotency conflict（GY-1 防呆）==========

	@Test
	@DisplayName("credit 命中同 key 但金額不同 → IdempotencyConflict")
	void credit_conflictWhenSameKeyDifferentAmount() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		WalletTransaction prev = new WalletTransaction(
				wallet.getId(), WalletTransactionType.SIGNUP_BONUS, new BigDecimal("1000"),
				new BigDecimal("1000"), "BONUS", null, "k");
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("k")).thenReturn(Optional.of(prev));

		assertThatThrownBy(() ->
				walletService.credit(userId, new BigDecimal("500"), "BONUS", null, "k"))
				.isInstanceOf(IdempotencyConflictException.class);
	}

	@Test
	@DisplayName("credit 命中同 key、同金額、同 refType 但 refId 不同 → IdempotencyConflict（強化指紋 #8）")
	void credit_conflictWhenSameKeyDifferentRefId() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		// 既有：派彩 +100，指向 market A
		WalletTransaction prev = new WalletTransaction(
				wallet.getId(), WalletTransactionType.RESOLUTION_PAYOUT, new BigDecimal("100"),
				new BigDecimal("100"), "MARKET", UUID.randomUUID(), "k");
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("k")).thenReturn(Optional.of(prev));

		// 本次：同 wallet、同 +100、同 refType "MARKET"，但 refId 指向另一個 market → 必須 409
		assertThatThrownBy(() ->
				walletService.credit(userId, new BigDecimal("100"), "MARKET", UUID.randomUUID(), "k"))
				.isInstanceOf(IdempotencyConflictException.class);
		assertThat(wallet.getBalance()).isEqualByComparingTo("0");   // 沒重複加錢
		verify(walletTransactionRepository, never()).saveAndFlush(any());     // 沒寫 tx
	}

	@Test
	@DisplayName("debit 命中 credit 的同 key（GY-1）→ IdempotencyConflict")
	void debit_conflictWhenKeyBelongsToCredit() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		WalletTransaction creditTx = new WalletTransaction(
				wallet.getId(), WalletTransactionType.SIGNUP_BONUS, new BigDecimal("100"),
				new BigDecimal("100"), "BONUS", null, "k");
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("k")).thenReturn(Optional.of(creditTx));

		assertThatThrownBy(() ->
				walletService.debit(userId, new BigDecimal("30"), "TRADE", UUID.randomUUID(), "k"))
				.isInstanceOf(IdempotencyConflictException.class);
	}

	@Test
	@DisplayName("credit 並發 insert 撞唯一索引 → IdempotencyConflict（不外漏 500）")
	void credit_conflictWhenInsertRaces() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("k")).thenReturn(Optional.empty());
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenThrow(new org.springframework.dao.DataIntegrityViolationException("dup"));

		assertThatThrownBy(() ->
				walletService.credit(userId, new BigDecimal("10"), "BONUS", null, "k"))
				.isInstanceOf(IdempotencyConflictException.class);
	}

	// ========== getBalance 查餘額（2）==========

	@Test
	@DisplayName("getBalance：回傳該錢包餘額")
	void getBalance_returnsBalance() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		wallet.applyCredit(new BigDecimal("500"));                // 先放 500
		when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(wallet));

		assertThat(walletService.getBalance(userId)).isEqualByComparingTo("500");
	}

	@Test
	@DisplayName("getBalance：查無錢包 → WalletNotFoundException")
	void getBalance_throwsWhenMissing() {
		UUID userId = UUID.randomUUID();
		when(walletRepository.findByUserId(userId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> walletService.getBalance(userId))
				.isInstanceOf(WalletNotFoundException.class);
	}

	// ========== getTransactions 查明細（1）==========

	@Test
	@DisplayName("getTransactions：查無錢包 → WalletNotFoundException")
	void getTransactions_throwsWhenMissing() {
		UUID userId = UUID.randomUUID();
		when(walletRepository.findByUserId(userId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> walletService.getTransactions(userId, 0))
				.isInstanceOf(WalletNotFoundException.class);
	}

	@Test
	@DisplayName("getTransactions：回傳該錢包明細(時間倒序、分頁)")
	void getTransactions_returnsList() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		WalletTransaction t1 = new WalletTransaction(
				wallet.getId(), WalletTransactionType.SIGNUP_BONUS, new BigDecimal("1000"),
				new BigDecimal("1000"), "BONUS", null, "k1");

		when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository
				.findByWalletIdOrderByCreatedAtDescIdDesc(eq(wallet.getId()), any(Pageable.class)))
				.thenReturn(List.of(t1));

		List<WalletTransaction> result = walletService.getTransactions(userId, 0);

		assertThat(result).containsExactly(t1);
		verify(walletTransactionRepository)
				.findByWalletIdOrderByCreatedAtDescIdDesc(eq(wallet.getId()), any(Pageable.class));
	}

	// ========== debit 扣款（4）==========

	@Test
	@DisplayName("debit 正常：餘額足 → 扣款、寫一筆負號 TRADE_BUY")
	void debit_subtractsAndWritesNegativeTransaction() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		wallet.applyCredit(new BigDecimal("1000"));                          // 先有 1000
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.debit(
				userId, new BigDecimal("300"), "TRADE", UUID.randomUUID(), "trade-1");

		assertThat(wallet.getBalance()).isEqualByComparingTo("700");         // 1000 - 300
		assertThat(tx.getType()).isEqualTo(WalletTransactionType.TRADE_BUY);
		assertThat(tx.getAmount()).isEqualByComparingTo("-300");            // ★ 負號
		assertThat(tx.getBalanceAfter()).isEqualByComparingTo("700");
		verify(walletTransactionRepository).saveAndFlush(any(WalletTransaction.class));
	}

	@Test
	@DisplayName("debit：餘額不足 → InsufficientFunds、餘額不變、不寫 tx（I-1）")
	void debit_throwsWhenInsufficient() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		wallet.applyCredit(new BigDecimal("100"));                          // 只有 100
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> walletService.debit(
				userId, new BigDecimal("500"), "TRADE", UUID.randomUUID(), "trade-2"))
				.isInstanceOf(InsufficientFundsException.class);

		assertThat(wallet.getBalance()).isEqualByComparingTo("100");        // ★ 沒被扣
		verify(walletTransactionRepository, never()).saveAndFlush(any());           // ★ 沒寫 tx
	}

	@Test
	@DisplayName("debit 冪等：同 idemKey 已有 tx → 回原筆、不重扣、不再 save")
	void debit_idempotentReturnsExisting() {
		UUID userId = UUID.randomUUID();
		UUID tradeId = UUID.randomUUID();   // 同一筆交易 → 兩次呼叫必帶同一個 refId（符合 verify-on-hit 強化指紋）
		Wallet wallet = new Wallet(userId);
		wallet.applyCredit(new BigDecimal("1000"));
		WalletTransaction existing = new WalletTransaction(
				wallet.getId(), WalletTransactionType.TRADE_BUY, new BigDecimal("-300"),
				new BigDecimal("700"), "TRADE", tradeId, "trade-dup");
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("trade-dup"))
				.thenReturn(Optional.of(existing));

		WalletTransaction tx = walletService.debit(
				userId, new BigDecimal("300"), "TRADE", tradeId, "trade-dup");

		assertThat(tx).isSameAs(existing);
		assertThat(wallet.getBalance()).isEqualByComparingTo("1000");       // 沒重扣
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("debit：查無錢包 → WalletNotFoundException")
	void debit_throwsWhenWalletMissing() {
		UUID userId = UUID.randomUUID();
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> walletService.debit(
				userId, new BigDecimal("100"), "TRADE", UUID.randomUUID(), "k"))
				.isInstanceOf(WalletNotFoundException.class);
	}

	// ========== D1：封 sell（R1 不做賣出，credit 不接 TRADE）==========

	@Test
	@DisplayName("credit：refType=\"TRADE\"（賣出）已封 → IllegalArgumentException、不寫 tx（D1）")
	void credit_rejectsTradeSellRefType() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);                       // balance 0
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("sell-1"))
				.thenReturn(Optional.empty());                     // 查不到 → 往下走到 deriveType

		assertThatThrownBy(() ->
				walletService.credit(userId, new BigDecimal("300"), "TRADE", UUID.randomUUID(), "sell-1"))
				.isInstanceOf(IllegalArgumentException.class);

		assertThat(wallet.getBalance()).isEqualByComparingTo("0");  // 沒加錢（deriveType 在 applyCredit 前就擋）
		verify(walletTransactionRepository, never()).saveAndFlush(any());   // 沒寫 tx
	}

	// ========== 全補：toCents 小數柵欄 / 正數防呆 / deriveType 分支 ==========

	private Wallet stubbedWallet(UUID userId, String key) {
		Wallet wallet = new Wallet(userId);
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
		return wallet;
	}

	@Test
	@DisplayName("credit toCents：10.999 → 無條件捨去到 10.99（不四捨五入）")
	void credit_toCents_truncatesDown() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "c-trunc");
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.credit(userId, new BigDecimal("10.999"), "BONUS", null, "c-trunc");

		assertThat(tx.getAmount()).isEqualByComparingTo("10.99");        // 捨去，不是 11.00
		assertThat(wallet.getBalance()).isEqualByComparingTo("10.99");
	}

	@Test
	@DisplayName("debit toCents：5.999 → 捨成 5.99（餘額按 5.99 扣、tx 記 -5.99）")
	void debit_toCents_truncatesDown() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "d-trunc");
		wallet.applyCredit(new BigDecimal("100"));
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.debit(userId, new BigDecimal("5.999"), "TRADE", UUID.randomUUID(), "d-trunc");

		assertThat(tx.getAmount()).isEqualByComparingTo("-5.99");
		assertThat(wallet.getBalance()).isEqualByComparingTo("94.01");
	}

	@Test
	@DisplayName("credit toCents：0.001 → 捨成 0 → 被正數防呆擋下（不留殭屍流水）")
	void credit_toCents_subCentRoundsToZero_rejected() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "c-dust");

		assertThatThrownBy(() -> walletService.credit(userId, new BigDecimal("0.001"), "BONUS", null, "c-dust"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("正數");

		assertThat(wallet.getBalance()).isEqualByComparingTo("0");
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("credit 正數防呆：負數金額 → IllegalArgument、不寫 tx")
	void credit_negativeAmount_rejected() {
		UUID userId = UUID.randomUUID();
		stubbedWallet(userId, "c-neg");

		assertThatThrownBy(() -> walletService.credit(userId, new BigDecimal("-5"), "BONUS", null, "c-neg"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("正數");
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("debit 正數防呆：0 金額 → IllegalArgument、餘額不變、不寫 tx")
	void debit_zeroAmount_rejected() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "d-zero");
		wallet.applyCredit(new BigDecimal("100"));

		assertThatThrownBy(() -> walletService.debit(userId, new BigDecimal("0"), "TRADE", UUID.randomUUID(), "d-zero"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("正數");
		assertThat(wallet.getBalance()).isEqualByComparingTo("100");
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("deriveType：credit 未知 refType → IllegalArgument（不支援）")
	void credit_unsupportedRefType_rejected() {
		UUID userId = UUID.randomUUID();
		stubbedWallet(userId, "c-foo");

		assertThatThrownBy(() -> walletService.credit(userId, new BigDecimal("100"), "FOO", null, "c-foo"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("refType");
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("deriveType：debit 只接 TRADE，給 BONUS → IllegalArgument")
	void debit_unsupportedRefType_rejected() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "d-bonus");
		wallet.applyCredit(new BigDecimal("100"));

		assertThatThrownBy(() -> walletService.debit(userId, new BigDecimal("10"), "BONUS", null, "d-bonus"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("refType");
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("deriveType：refType=null → IllegalArgument（不可為 null）")
	void credit_nullRefType_rejected() {
		UUID userId = UUID.randomUUID();
		stubbedWallet(userId, "c-null");

		assertThatThrownBy(() -> walletService.credit(userId, new BigDecimal("100"), null, null, "c-null"))
				.isInstanceOf(IllegalArgumentException.class);
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("deriveType：credit MARKET → RESOLUTION_PAYOUT（派彩入帳）")
	void credit_marketRefType_resolutionPayout() {
		UUID userId = UUID.randomUUID();
		stubbedWallet(userId, "m-1");
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.credit(userId, new BigDecimal("100"), "MARKET", UUID.randomUUID(), "m-1");

		assertThat(tx.getType()).isEqualTo(WalletTransactionType.RESOLUTION_PAYOUT);
	}

	@Test
	@DisplayName("debit verify-on-hit：同 key 但金額不同 → IdempotencyConflict（鏡像 credit）")
	void debit_conflictWhenSameKeyDifferentAmount() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);
		UUID refId = UUID.randomUUID();
		// 既有：debit 30（流水記 -30、同 refId）
		WalletTransaction prev = new WalletTransaction(
				wallet.getId(), WalletTransactionType.TRADE_BUY, new BigDecimal("-30"),
				new BigDecimal("970"), "TRADE", refId, "dk");
		when(walletRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(wallet));
		when(walletTransactionRepository.findByIdempotencyKey("dk")).thenReturn(Optional.of(prev));

		// 同 key、同 refType/refId，但金額 50 ≠ 30 → 指紋對不上 → 409
		assertThatThrownBy(() -> walletService.debit(userId, new BigDecimal("50"), "TRADE", refId, "dk"))
				.isInstanceOf(IdempotencyConflictException.class);
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	// ========== adjust 管理員手動調整（沖帳）==========

	@Test
	@DisplayName("adjust CREDIT：ADJUSTMENT 型別、+金額、memo 寫入、refType=ADJUST")
	void adjust_credit_writesAdjustmentWithMemo() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "adj-c1");
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.adjust(userId, "CREDIT", new BigDecimal("500"), "活動補發", "adj-c1");

		assertThat(tx.getType()).isEqualTo(WalletTransactionType.ADJUSTMENT);
		assertThat(tx.getAmount()).isEqualByComparingTo("500");
		assertThat(tx.getMemo()).isEqualTo("活動補發");
		assertThat(tx.getReferenceType()).isEqualTo("ADJUST");
		assertThat(wallet.getBalance()).isEqualByComparingTo("500");
	}

	@Test
	@DisplayName("adjust DEBIT：ADJUSTMENT 型別、-金額、memo 寫入")
	void adjust_debit_writesNegativeAdjustmentWithMemo() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "adj-d1");
		wallet.applyCredit(new BigDecimal("1000"));
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.adjust(userId, "DEBIT", new BigDecimal("300"), "扣回誤發", "adj-d1");

		assertThat(tx.getType()).isEqualTo(WalletTransactionType.ADJUSTMENT);
		assertThat(tx.getAmount()).isEqualByComparingTo("-300");
		assertThat(tx.getMemo()).isEqualTo("扣回誤發");
		assertThat(wallet.getBalance()).isEqualByComparingTo("700");
	}

	@Test
	@DisplayName("adjust：空白原因 → IllegalArgument、連 DB 都不碰")
	void adjust_blankReason_rejected() {
		UUID userId = UUID.randomUUID();
		assertThatThrownBy(() ->
				walletService.adjust(userId, "CREDIT", new BigDecimal("100"), "   ", "adj-blank"))
				.isInstanceOf(IllegalArgumentException.class);
		verify(walletRepository, never()).findByUserIdForUpdate(any());
	}

	@Test
	@DisplayName("adjust：非法 direction → IllegalArgument、不寫 tx")
	void adjust_invalidDirection_rejected() {
		UUID userId = UUID.randomUUID();
		assertThatThrownBy(() ->
				walletService.adjust(userId, "SIDEWAYS", new BigDecimal("100"), "測試", "adj-dir"))
				.isInstanceOf(IllegalArgumentException.class);
		verify(walletTransactionRepository, never()).saveAndFlush(any());
	}

	@Test
	@DisplayName("deriveType：credit refType=ADJUST → ADJUSTMENT（memo 多載直接驗）")
	void credit_adjustRefType_adjustmentWithMemo() {
		UUID userId = UUID.randomUUID();
		Wallet wallet = stubbedWallet(userId, "adj-c2");
		when(walletTransactionRepository.saveAndFlush(any(WalletTransaction.class)))
				.thenAnswer(inv -> inv.getArgument(0));

		WalletTransaction tx = walletService.credit(userId, new BigDecimal("100"), "ADJUST", null, "adj-c2", "memo-x");

		assertThat(tx.getType()).isEqualTo(WalletTransactionType.ADJUSTMENT);
		assertThat(tx.getMemo()).isEqualTo("memo-x");
	}
}