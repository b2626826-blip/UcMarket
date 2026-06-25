package com.ucmarket.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.ucmarket.exception.InsufficientFundsException;

/**
 * Wallet entity 不變式單元測試 —— 不連 DB、不載 Spring，毫秒級。
 * 守 applyCredit/applyDebit 的正數防呆、餘額≥0(I-1)，
 * 以及 BigDecimal 一律用 compareTo（不用 equals）避免 scale 敏感的陷阱。
 */
class WalletTest {

	private Wallet funded(String amount) {
		Wallet w = new Wallet(UUID.randomUUID());
		w.applyCredit(new BigDecimal(amount));
		return w;
	}

	// ===== applyCredit =====

	@Test
	@DisplayName("applyCredit：正數 → 餘額累加")
	void applyCredit_positive_accumulates() {
		Wallet w = new Wallet(UUID.randomUUID());
		w.applyCredit(new BigDecimal("100"));
		w.applyCredit(new BigDecimal("0.50"));
		assertThat(w.getBalance()).isEqualByComparingTo("100.50");
	}

	@Test
	@DisplayName("applyCredit：0 → IllegalArgument（必須為正數）")
	void applyCredit_zero_rejected() {
		Wallet w = new Wallet(UUID.randomUUID());
		assertThatThrownBy(() -> w.applyCredit(new BigDecimal("0")))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("正數");
	}

	@Test
	@DisplayName("applyCredit：負數 → IllegalArgument")
	void applyCredit_negative_rejected() {
		Wallet w = new Wallet(UUID.randomUUID());
		assertThatThrownBy(() -> w.applyCredit(new BigDecimal("-1")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@DisplayName("applyCredit：null → IllegalArgument")
	void applyCredit_null_rejected() {
		Wallet w = new Wallet(UUID.randomUUID());
		assertThatThrownBy(() -> w.applyCredit(null))
				.isInstanceOf(IllegalArgumentException.class);
	}

	// ===== applyDebit =====

	@Test
	@DisplayName("applyDebit：餘額足 → 扣款")
	void applyDebit_sufficient_subtracts() {
		Wallet w = funded("100");
		w.applyDebit(new BigDecimal("30"));
		assertThat(w.getBalance()).isEqualByComparingTo("70");
	}

	@Test
	@DisplayName("applyDebit：剛好扣到 0（邊界，允許）")
	void applyDebit_exactBalance_toZero() {
		Wallet w = funded("100");
		w.applyDebit(new BigDecimal("100"));
		assertThat(w.getBalance()).isEqualByComparingTo("0");
	}

	@Test
	@DisplayName("applyDebit：超扣 1 分 → InsufficientFunds、餘額不變(I-1)")
	void applyDebit_overdraw_throwsAndKeepsBalance() {
		Wallet w = funded("100");
		assertThatThrownBy(() -> w.applyDebit(new BigDecimal("100.01")))
				.isInstanceOf(InsufficientFundsException.class);
		assertThat(w.getBalance()).isEqualByComparingTo("100");   // 失敗不可改狀態
	}

	@Test
	@DisplayName("applyDebit：0 → IllegalArgument（必須為正數）")
	void applyDebit_zero_rejected() {
		Wallet w = funded("100");
		assertThatThrownBy(() -> w.applyDebit(new BigDecimal("0")))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("正數");
	}

	@Test
	@DisplayName("applyDebit：負數 → IllegalArgument")
	void applyDebit_negative_rejected() {
		Wallet w = funded("100");
		assertThatThrownBy(() -> w.applyDebit(new BigDecimal("-1")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@DisplayName("applyDebit：null → IllegalArgument")
	void applyDebit_null_rejected() {
		Wallet w = funded("100");
		assertThatThrownBy(() -> w.applyDebit(null))
				.isInstanceOf(IllegalArgumentException.class);
	}

	// ===== BigDecimal scale 陷阱：一律 compareTo，不用 equals =====

	@Test
	@DisplayName("scale 陷阱：0.00 視同 0（非正數）→ 被擋（equals 會誤判 0.00≠0）")
	void applyCredit_zeroWithScale_rejected() {
		Wallet w = new Wallet(UUID.randomUUID());
		assertThatThrownBy(() -> w.applyCredit(new BigDecimal("0.00")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@DisplayName("scale 陷阱：餘額 100.00 debit 100 → 剛好 0（餘額比較比值不比 scale）")
	void applyDebit_scaleInsensitiveBalanceCheck() {
		Wallet w = funded("100.00");
		w.applyDebit(new BigDecimal("100"));   // 100.00 vs 100：compareTo==0 → 允許扣到 0
		assertThat(w.getBalance()).isEqualByComparingTo("0");
	}
}
