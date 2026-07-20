package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;

import com.ucmarket.entity.Wallet;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.exception.IdempotencyConflictException;
import com.ucmarket.exception.InsufficientFundsException;
import com.ucmarket.repository.WalletRepository;
import com.ucmarket.repository.WalletTransactionRepository;

import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.lifecycle.AddLifecycleHook;
import net.jqwik.api.lifecycle.LifecycleContext;
import net.jqwik.api.lifecycle.PropagationMode;
import net.jqwik.api.lifecycle.SkipExecutionHook;

/**
 * 錢包 property-based 測試（jqwik）。
 * 亂數生成「credit/debit 操作序列」，循序跑真實 WalletService，每步驗：
 *   1) 真實餘額 == 獨立參考模型算出的餘額（model-based：抓任何邏輯分歧）
 *   2) 餘額 == Σ流水 amount（自我對帳）
 *   3) balance_after 逐筆鏈一致
 *   4) 每個 idemKey 至多一筆（冪等）
 *   5) 餘額永不為負
 *
 * fake repo 刻意「笨」：只存 list + 擋重複 key（模擬唯一索引），
 * 所有業務規則（toCents / verify-on-hit / 超扣 / deriveType）全走 production code。
 * DB 專屬/併發擬真不在此層 —— 那是 WalletConcurrencyTest（真 PG）的事。
 */
class WalletPropertyTest {

	enum Kind { CREDIT, DEBIT }

	record Op(Kind kind, BigDecimal amount, String idemKey) {}

	// 平日常駐：3000 次，秒級，每次 mvn test 都跑 → 持續覆蓋。
	@Property(tries = 3000)
	void invariants_hold(@ForAll("opSequences") List<Op> ops) {
		verify(ops);
	}

	// 狠版：5 萬次。opt-in —— 設環境變數 PBT_HARSH 才跑，平日整個 skip，不拖慢 build。
	//   PowerShell：$env:PBT_HARSH="true"；cmd：set PBT_HARSH=true
	// 用 jqwik 的 SkipExecutionHook 真的 skip，不是在方法內 early-return：
	// 後者 jqwik 照樣回報「tries=50000 / checks=50000」，但實際是空迴圈，報表數字是假的。
	// 註：Jupiter 的 @EnabledIfEnvironmentVariable 在這裡無效 —— jqwik 是獨立 engine，
	//     會印 "annotation from JUnit which cannot be processed by jqwik" 然後照跑。
	@Property(tries = 50000)
	@AddLifecycleHook(value = SkipUnlessHarshOptIn.class, propagateTo = PropagationMode.ALL_DESCENDANTS)
	void invariants_hold_harsh(@ForAll("opSequences") List<Op> ops) {
		verify(ops);
	}

	static class SkipUnlessHarshOptIn implements SkipExecutionHook {
		@Override
		public SkipResult shouldBeSkipped(LifecycleContext context) {
			return System.getenv("PBT_HARSH") != null
					? SkipResult.doNotSkip()
					: SkipResult.skip("未設 PBT_HARSH（狠版 5 萬次為 opt-in）");
		}
	}

	private void verify(List<Op> ops) {
		UUID userId = UUID.randomUUID();
		Wallet wallet = new Wallet(userId);            // 真錢包，applyCredit/Debit 直接改它
		List<WalletTransaction> ledger = new ArrayList<>();
		WalletService svc = serviceBackedBy(wallet, ledger);
		Model model = new Model();

		for (Op op : ops) {
			try {
				if (op.kind() == Kind.CREDIT) {
					svc.credit(userId, op.amount(), "BONUS", null, op.idemKey());
				} else {
					svc.debit(userId, op.amount(), "TRADE", null, op.idemKey());
				}
			} catch (IllegalArgumentException | InsufficientFundsException | IdempotencyConflictException expected) {
				// 預期內的拒絕；是否真的「沒改狀態」交給下面的不變式驗
			}
			model.apply(op);

			// 1) 真實 == 模型
			assertThat(wallet.getBalance()).isEqualByComparingTo(model.balance);
			// 5) 永不為負
			assertThat(wallet.getBalance()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
			// 2~4) 帳本自我對帳
			assertLedgerConsistent(wallet, ledger);
		}
	}

	// ===== 獨立參考模型（不抄 service，自己照規則算一遍）=====
	private static final class Model {
		BigDecimal balance = BigDecimal.ZERO;
		final Map<String, BigDecimal> seen = new HashMap<>();   // idemKey -> 已記的帶號金額

		void apply(Op op) {
			BigDecimal mag = op.amount().setScale(2, RoundingMode.DOWN);     // toCents
			BigDecimal signed = op.kind() == Kind.CREDIT ? mag : mag.negate();

			if (seen.containsKey(op.idemKey())) {
				// 命中既有 key：相符→冪等回原筆、不符→衝突；兩者都不改狀態
				return;
			}
			if (mag.compareTo(BigDecimal.ZERO) <= 0) {
				return;     // 正數防呆（含捨成 0）→ 拒絕，不佔 key
			}
			if (op.kind() == Kind.DEBIT && balance.compareTo(mag) < 0) {
				return;     // 超扣 → 拒絕，不佔 key
			}
			balance = balance.add(signed);
			seen.put(op.idemKey(), signed);
		}
	}

	private void assertLedgerConsistent(Wallet wallet, List<WalletTransaction> ledger) {
		BigDecimal running = BigDecimal.ZERO;
		Map<String, Integer> keyCount = new HashMap<>();
		for (WalletTransaction tx : ledger) {
			running = running.add(tx.getAmount());
			// 3) balance_after 鏈：本筆快照 == 截至本筆的累加
			assertThat(tx.getBalanceAfter()).isEqualByComparingTo(running);
			keyCount.merge(tx.getIdempotencyKey(), 1, Integer::sum);
		}
		// 2) 餘額 == Σ流水
		assertThat(wallet.getBalance()).isEqualByComparingTo(running);
		// 4) 每個 idemKey 至多一筆
		assertThat(keyCount.values()).allMatch(c -> c == 1);
	}

	// ===== 笨 fake repo：只存資料 + 擋重複 key，零業務邏輯 =====
	private WalletService serviceBackedBy(Wallet wallet, List<WalletTransaction> ledger) {
		WalletRepository walletRepo = mock(WalletRepository.class);
		WalletTransactionRepository txRepo = mock(WalletTransactionRepository.class);

		when(walletRepo.findByUserIdForUpdate(any())).thenReturn(Optional.of(wallet));
		when(walletRepo.findByUserId(any())).thenReturn(Optional.of(wallet));

		when(txRepo.findByIdempotencyKey(anyString())).thenAnswer(inv -> {
			String key = inv.getArgument(0);
			return ledger.stream().filter(t -> key.equals(t.getIdempotencyKey())).findFirst();
		});
		when(txRepo.saveAndFlush(any(WalletTransaction.class))).thenAnswer(inv -> {
			WalletTransaction tx = inv.getArgument(0);
			boolean dup = tx.getIdempotencyKey() != null
					&& ledger.stream().anyMatch(t -> tx.getIdempotencyKey().equals(t.getIdempotencyKey()));
			if (dup) {
				throw new DataIntegrityViolationException("dup idempotency_key");   // 模擬唯一索引
			}
			ledger.add(tx);
			return tx;
		});
		return new WalletService(walletRepo, txRepo);
	}

	// ===== 序列生成：金額含 sub-cent/負/0、key 用小池子逼碰撞 =====
	@Provide
	Arbitrary<List<Op>> opSequences() {
		Arbitrary<Kind> kind = Arbitraries.of(Kind.CREDIT, Kind.DEBIT);
		Arbitrary<BigDecimal> amount = Arbitraries.longs().between(-3000, 300000)
				.map(n -> BigDecimal.valueOf(n, 3));   // -3.000 ~ 300.000，scale 3 → 踩 toCents 截斷/正數防呆
		Arbitrary<String> key = Arbitraries.integers().between(0, 14).map(i -> "k" + i);   // 15 把 → 演化+碰撞兼具
		Arbitrary<Op> op = Combinators.combine(kind, amount, key).as(Op::new);
		return op.list().ofMinSize(0).ofMaxSize(40);
	}
}
