package com.ucmarket.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.BalanceResponse;
import com.ucmarket.dto.CreateWalletRequest;
import com.ucmarket.dto.WalletResponse;
import com.ucmarket.dto.WalletTransactionResponse;
import com.ucmarket.entity.Wallet;
import com.ucmarket.service.WalletService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

	private final WalletService walletService;

	// 建構子注入：跟 Service 注入 Repository 同一招
	public WalletController(WalletService walletService) {
		this.walletService = walletService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public WalletResponse createWallet(@Valid @RequestBody CreateWalletRequest request) {
		Wallet wallet = walletService.createWalletForUser(request.userId());
		return new WalletResponse(
				wallet.getId(),
				wallet.getUserId(),
				wallet.getBalance(),
				wallet.getCreatedAt()
		);
	}
	
	// GET /api/wallets/{userId}/balance —— 查餘額
	// 20260607 增加
	@GetMapping("/{userId}/balance")
	public BalanceResponse getBalance(@PathVariable UUID userId) { // userId 來自「URL 路徑」，不是 body
	    BigDecimal balance = walletService.getBalance(userId);
	    return new BalanceResponse(userId, balance);
	}
	
	// 查紀錄 20260607
	@GetMapping("/{userId}/transactions")
	public List<WalletTransactionResponse> transactions(
	        @PathVariable UUID userId,
	        @RequestParam(defaultValue = "0") int page) {
	    return walletService.getTransactions(userId, page).stream()
	            .map(tx -> new WalletTransactionResponse(
	                    tx.getId(), tx.getType(), tx.getAmount(),
	                    tx.getBalanceAfter(), tx.getReferenceType(), tx.getCreatedAt()))
	            .toList();
	}
}

// 這還沒review