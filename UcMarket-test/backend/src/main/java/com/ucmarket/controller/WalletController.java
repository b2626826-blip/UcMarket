package com.ucmarket.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.BalanceResponse;
import com.ucmarket.dto.WalletTransactionResponse;
import com.ucmarket.entity.User;
import com.ucmarket.service.WalletService;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

	private final WalletService walletService;

	// 建構子注入：跟 Service 注入 Repository 同一招
	public WalletController(WalletService walletService) {
		this.walletService = walletService;
	}

	// 註：建錢包不開 HTTP 端點 —— register 流程已於同一 @Transactional 內呼叫
	// WalletService.createWalletForUser()（一人一錢包）。對外只暴露查詢，避免多餘越權面。

	// GET /api/wallets/me/balance —— 查「自己」的餘額（userId 取自 JWT，不從網址拿 → 杜絕 IDOR）
	@GetMapping("/me/balance")
	public BalanceResponse getBalance(@AuthenticationPrincipal User user) {
	    BigDecimal balance = walletService.getBalance(user.getId());
	    return new BalanceResponse(user.getId(), balance);
	}

	// 查紀錄 (改綁 JWT，userId 取自登入身分）
	@GetMapping("/me/transactions/all")
	public List<WalletTransactionResponse> allTransactions(@AuthenticationPrincipal User user) {
		return walletService.getTransactions(user.getId()).stream()
				.map(tx -> new WalletTransactionResponse(
						tx.getId(), tx.getType(), tx.getAmount(),
						tx.getBalanceAfter(), tx.getReferenceType(), tx.getReferenceId(), tx.getCreatedAt()))
				.toList();
	}

	@GetMapping("/me/transactions")
	public List<WalletTransactionResponse> transactions(
	        @AuthenticationPrincipal User user,
	        @RequestParam(defaultValue = "0") int page) {
	    return walletService.getTransactions(user.getId(), page).stream()
	            .map(tx -> new WalletTransactionResponse(
	                    tx.getId(), tx.getType(), tx.getAmount(),
	                    tx.getBalanceAfter(), tx.getReferenceType(), tx.getReferenceId(), tx.getCreatedAt()))
	            .toList();
	}
}
