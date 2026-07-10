package com.ucmarket.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.DevTxRequest;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.service.WalletService;

// ⚠️⚠️ DEV ONLY —— 純手動測 credit/debit。
// credit/debit 本來「沒有」對外端點（公開 = 任何人都能印錢/亂扣別人）。
// 測完「刪掉這整支」，絕對不能上線！
@Profile("dev") // 只在 dev profile 載入；prod 不註冊此端點，避免任意印錢/扣錢
@RestController
@RequestMapping("/api/dev/wallets")
public class DevWalletController {

	private final WalletService walletService;

	public DevWalletController(WalletService walletService) {
		this.walletService = walletService;
	}

	@PostMapping("/credit")
	public WalletTransaction credit(@RequestBody DevTxRequest req) {
		return walletService.credit(req.userId(), req.amount(), req.refType(), req.refId(), req.idemKey());
	}

	@PostMapping("/debit")
	public WalletTransaction debit(@RequestBody DevTxRequest req) {
		return walletService.debit(req.userId(), req.amount(), req.refType(), req.refId(), req.idemKey());
	}
}