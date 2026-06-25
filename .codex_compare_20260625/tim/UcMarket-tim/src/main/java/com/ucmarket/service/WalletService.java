package com.ucmarket.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.entity.Wallet;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
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

	// 建錢包：get-or-create（I-9 一人一錢包）
	@Transactional
	public Wallet createWalletForUser(UUID userId) {
		return walletRepository.findByUserId(userId)
				.orElseGet(() -> walletRepository.save(new Wallet(userId)));
	}

	// ===== credit 入帳（全防重 query-first + 悲觀鎖）=====
	@Transactional
	public WalletTransaction credit(UUID userId, BigDecimal amount,
			String refType, UUID refId, String idemKey) {
		if (idemKey == null || idemKey.isBlank()) {
			throw new IllegalArgumentException("credit 要求帶 idemKey（全防重）");
		}
		Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		Optional<WalletTransaction> existing =
				walletTransactionRepository.findByIdempotencyKey(idemKey);
		if (existing.isPresent()) {
			return existing.get();
		}
		WalletTransactionType type = deriveType(true, refType);
		wallet.applyCredit(amount);
		BigDecimal balanceAfter = wallet.getBalance();
		// 團隊建構子順序：(walletId, type, amount, balanceAfter, referenceType, referenceId, idempotencyKey)
		WalletTransaction tx = new WalletTransaction(
				wallet.getId(),userId, type, amount, balanceAfter, refType, refId, idemKey);
		return walletTransactionRepository.save(tx);
	}

	// ===== debit 扣款（鎖內檢查餘額 + 寫負號）=====
	@Transactional
	public WalletTransaction debit(UUID userId, BigDecimal amount,
			String refType, UUID refId, String idemKey) {
		if (idemKey == null || idemKey.isBlank()) {
			throw new IllegalArgumentException("debit 要求帶 idemKey（全防重）");
		}
		Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
				.orElseThrow(() -> new WalletNotFoundException(userId));
		Optional<WalletTransaction> existing =
				walletTransactionRepository.findByIdempotencyKey(idemKey);
		if (existing.isPresent()) {
			return existing.get();
		}
		WalletTransactionType type = deriveType(false, refType);
		wallet.applyDebit(amount);
		BigDecimal balanceAfter = wallet.getBalance();
		WalletTransaction tx = new WalletTransaction(
				wallet.getId(),userId, type, amount.negate(), balanceAfter, refType, refId, idemKey);
		return walletTransactionRepository.save(tx);
	}

	// ===== 查明細 =====
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

	// refType → type（credit→SELL/PAYOUT/SIGNUP；debit→BUY）。注意 MARKET 對 RESOLUTION_PAYOUT
	private static WalletTransactionType deriveType(boolean isCredit, String refType) {
		if (refType == null) {
			throw new IllegalArgumentException("refType 不可為 null");
		}
		if (isCredit) {
			return switch (refType) {
				case "TRADE" -> WalletTransactionType.TRADE_SELL;
				case "MARKET" -> WalletTransactionType.RESOLUTION_PAYOUT;
				case "BONUS" -> WalletTransactionType.SIGNUP_BONUS;
				default -> throw new IllegalArgumentException("credit 不支援的 refType: " + refType);
			};
		} else {
			return switch (refType) {
				case "TRADE" -> WalletTransactionType.TRADE_BUY;
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
