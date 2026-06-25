package com.ucmarket.service;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest   // 載入完整 Spring context + 連「真 DB」(不是 mock) —— 鎖才有意義
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
				userId, "ct-" + userId, userId + "@test.com", "x");
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
}


// 還沒寫完