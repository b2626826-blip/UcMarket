package com.ucmarket.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.entity.Wallet;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.exception.IdempotencyConflictException;
import com.ucmarket.exception.WalletNotFoundException;
import com.ucmarket.repository.WalletRepository;
import com.ucmarket.repository.WalletTransactionRepository;

@Service
public class WalletService {

	private final WalletRepository walletRepository;
	private final WalletTransactionRepository walletTransactionRepository;

	public WalletService(WalletRepository walletRepository,
			WalletTransactionRepository walletTransactionRepository) {
		this.walletRepository = walletRepository;
		this.walletTransactionRepository = walletTransactionRepository;
	}

	// 建錢包：get-or-create（I-9 一人一錢包）。
	// F4 並發安全：改用 DB 層 upsert（ON CONFLICT DO NOTHING）——
	// 衝突不丟例外，所以即使在 register 的 @Transactional 內被呼叫也不會毒化交易。
	@Transactional
	public Wallet createWalletForUser(UUID userId) {
		walletRepository.insertIfAbsent(UUID.randomUUID(), userId);
		return walletRepository.findByUserId(userId)
				.orElseThrow(() -> new IllegalStateException("wallet 應已存在 (upsert 後查不到): " + userId));
	}

	// 原 5 參數版本：memo 預設 null（既有呼叫者不動）
	@Transactional
	public WalletTransaction credit(UUID userId, BigDecimal amount,
			String refType, UUID refId, String idemKey) {
		return credit(userId, amount, refType, refId, idemKey, null);
	}

	// ===== credit 入帳（全防重 query-first + 悲觀鎖）=====
	@Transactional
	public WalletTransaction credit(UUID userId, BigDecimal amount,
			String refType, UUID refId, String idemKey, String memo) {
		if (idemKey == null || idemKey.isBlank()) {
			throw new IllegalArgumentException("credit 要求帶 idemKey（全防重）");
		}
		amount = toCents(amount);   // P6：入口無條件捨去到分（最小單位 0.01），之後 balance/tx/防重指紋全用這顆乾淨值
		Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		Optional<WalletTransaction> existing =
				walletTransactionRepository.findByIdempotencyKey(idemKey);
		if (existing.isPresent()) {
			// verify-on-hit：既有交易必須跟本次一致（同 wallet + credit 寫 +amount + 同 refType/refId），否則 key 被挪用
			return verifyOrConflict(existing.get(), wallet.getId(), amount, refType, refId, idemKey);
		}
		WalletTransactionType type = deriveType(true, refType);
		wallet.applyCredit(amount);
		BigDecimal balanceAfter = wallet.getBalance();
		// 團隊建構子順序：(walletId, type, amount, balanceAfter, referenceType, referenceId, idempotencyKey)
		WalletTransaction tx = new WalletTransaction(
				wallet.getId(), type, amount, balanceAfter, refType, refId, idemKey, memo);
		try {
			return walletTransactionRepository.saveAndFlush(tx);
		} catch (DataIntegrityViolationException e) {
			// 並發：另一筆同 idemKey 剛 commit（同 wallet 已被悲觀鎖序列化 → 必為跨 wallet）→ 視為衝突
			throw new IdempotencyConflictException(idemKey);
		}
	}

	// 原 5 參數版本：memo 預設 null（既有呼叫者不動）
	@Transactional
	public WalletTransaction debit(UUID userId, BigDecimal amount,
			String refType, UUID refId, String idemKey) {
		return debit(userId, amount, refType, refId, idemKey, null);
	}

	// ===== debit 扣款（鎖內檢查餘額 + 寫負號）=====
	@Transactional
	public WalletTransaction debit(UUID userId, BigDecimal amount,
			String refType, UUID refId, String idemKey, String memo) {
		if (idemKey == null || idemKey.isBlank()) {
			throw new IllegalArgumentException("debit 要求帶 idemKey（全防重）");
		}
		amount = toCents(amount);   // P6：入口無條件捨去到分（最小單位 0.01），之後 balance/tx/防重指紋全用這顆乾淨值
		Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		Optional<WalletTransaction> existing =
				walletTransactionRepository.findByIdempotencyKey(idemKey);
		if (existing.isPresent()) {
			// verify-on-hit：debit 寫的是 -amount（外加同 refType/refId）
			return verifyOrConflict(existing.get(), wallet.getId(), amount.negate(), refType, refId, idemKey);
		}
		WalletTransactionType type = deriveType(false, refType);
		wallet.applyDebit(amount);
		BigDecimal balanceAfter = wallet.getBalance();
		WalletTransaction tx = new WalletTransaction(
				wallet.getId(), type, amount.negate(), balanceAfter, refType, refId, idemKey, memo);
		try {
			return walletTransactionRepository.saveAndFlush(tx);
		} catch (DataIntegrityViolationException e) {
			throw new IdempotencyConflictException(idemKey);
		}
	}

	// verify-on-hit：命中的既有交易必須跟本次請求「完整一致」，否則代表 key 被挪用去做別的 → 409。
	// 指紋 = 同 wallet + 同帶號金額 + 同 refType + 同 refId。
	//   ‧ 帶號金額：credit 傳 +amount、debit 傳 -amount，一條就同時涵蓋「跨型別(sign)/不同金額」。
	//   ‧ refType/refId：把「同 wallet 同金額但指向不同來源」也擋下（例：同 +100 但一筆是派彩、一筆是退款）。
	// 正常情境下 idemKey 已內嵌來源（signup-/resolution:/cancel:），故同 key 必同 refType/refId，這層只在被誤用時觸發。
	private WalletTransaction verifyOrConflict(WalletTransaction prev, UUID walletId,
			BigDecimal signedAmount, String refType, UUID refId, String idemKey) {
		if (!Objects.equals(prev.getWalletId(), walletId)
				|| prev.getAmount().compareTo(signedAmount) != 0
				|| !Objects.equals(prev.getReferenceType(), refType)
				|| !Objects.equals(prev.getReferenceId(), refId)) {
			throw new IdempotencyConflictException(idemKey);
		}
		return prev;
	}

	// ===== 管理員手動調整（沖帳）=====
	// direction=CREDIT 加值、DEBIT 扣除；refType 固定 "ADJUST" → 型別 ADJUSTMENT；reason 進 memo（用戶看得到）。
	// 全程走 credit/debit（同一交易寫流水 + 動餘額），維持「餘額 = 流水鏈」不變量；扣破負由 debit 擋。
	@Transactional
	public WalletTransaction adjust(UUID userId, String direction, BigDecimal amount, String reason, String idemKey) {
		if (reason == null || reason.isBlank()) {
			throw new IllegalArgumentException("調整原因不可為空");
		}
		if (direction == null) {
			throw new IllegalArgumentException("direction 不可為 null");
		}
		return switch (direction.toUpperCase()) {
			case "CREDIT" -> credit(userId, amount, "ADJUST", null, idemKey, reason);
			case "DEBIT" -> debit(userId, amount, "ADJUST", null, idemKey, reason);
			default -> throw new IllegalArgumentException("direction 必須是 CREDIT 或 DEBIT: " + direction);
		};
	}

	// ===== 查明細 =====
	@Transactional(readOnly = true)
	public List<WalletTransaction> getTransactions(UUID userId) {
		Wallet wallet = walletRepository.findByUserId(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		return walletTransactionRepository
				.findByWalletIdOrderByCreatedAtDescIdDesc(wallet.getId());
	}

	@Transactional(readOnly = true)
	public List<WalletTransaction> getTransactions(UUID userId, int page) {
		Wallet wallet = walletRepository.findByUserId(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		return walletTransactionRepository
				.findByWalletIdOrderByCreatedAtDescIdDesc(wallet.getId(), PageRequest.of(page, 20));
	}

	// ===== 查餘額 =====
	@Transactional(readOnly = true)
	public BigDecimal getBalance(UUID userId) {
		Wallet wallet = walletRepository.findByUserId(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		return wallet.getBalance();
	}

	// P6：把金額正規化到「分」(2 位小數)，超出部分無條件捨去（RoundingMode.DOWN：只減不加 → 不會憑空生點）。
	// 單點正規化 —— credit/debit 一進門就呼叫，之後 balance / tx.amount / balance_after 全是乾淨 2 位 → DB 不會再二次 round。
	// 捨到 0（如 0.001）會被 applyCredit/applyDebit 的「必須為正數」擋下，不會留殭屍流水。
	private static BigDecimal toCents(BigDecimal amount) {
		if (amount == null) {
			throw new IllegalArgumentException("金額不可為 null");
		}
		return amount.setScale(2, RoundingMode.DOWN);
	}

	// refType → type（credit→SELL/PAYOUT/SIGNUP；debit→BUY）。注意 MARKET 對 RESOLUTION_PAYOUT
	private static WalletTransactionType deriveType(boolean isCredit, String refType) {
		if (refType == null) {
			throw new IllegalArgumentException("refType 不可為 null");
		}
		if (isCredit) {
			return switch (refType) {
				case "MARKET" -> WalletTransactionType.RESOLUTION_PAYOUT;
				case "BONUS" -> WalletTransactionType.SIGNUP_BONUS;
				case "ADJUST" -> WalletTransactionType.ADJUSTMENT;
				default -> throw new IllegalArgumentException("credit 不支援的 refType: " + refType);
			};
		} else {
			return switch (refType) {
				case "TRADE" -> WalletTransactionType.TRADE_BUY;
				case "ADJUST" -> WalletTransactionType.ADJUSTMENT;
				default -> throw new IllegalArgumentException("debit 不支援的 refType: " + refType);
			};
		}
	}

	// ↓↓↓ 以下 2 個先放簽章（契約），下一步才實作 ↓↓↓
	public Wallet lock(UUID userId, BigDecimal amount, UUID tradeId, String idemKey) {
		throw new UnsupportedOperationException("下一步實作");
	}

	public Wallet unlock(UUID userId, BigDecimal amount, UUID tradeId, String idemKey) {
		throw new UnsupportedOperationException("下一步實作");
	}
}
