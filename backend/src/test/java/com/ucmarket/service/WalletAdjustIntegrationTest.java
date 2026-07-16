package com.ucmarket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.exception.InsufficientFundsException;

// ===== 怎麼跑（同 WalletConcurrencyTest 慣例）=====
// opt-in：要先設環境變數 WALLET_PG_TEST=true，否則整支 skip（不擋一般 build）。連真 PostgreSQL、跑完自清。
//   PowerShell ： $env:WALLET_PG_TEST="true"; .\mvnw.cmd "-Dtest=WalletAdjustIntegrationTest" test
// 目的：驗 adjust() 走「真 Spring @Transactional 代理 + 真 DB」的交易邊界（提交 / 失敗回滾）。
// 這是本功能唯一「新引入的風險點」（credit/debit 改 5→6 參數委派、adjust 內部呼叫 6 參數的 self-invocation）。
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("walletpg-test")
@EnabledIfEnvironmentVariable(named = "WALLET_PG_TEST", matches = "true")
class WalletAdjustIntegrationTest {

    @Autowired private WalletService walletService;
    @Autowired private JdbcTemplate jdbc;

    private UUID userId;

    @BeforeEach
    void seed() {
        userId = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
                userId, "adj-" + userId.toString().substring(0, 8), userId + "@test.com", "x");
        walletService.createWalletForUser(userId);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ?)", userId);
        jdbc.update("DELETE FROM wallets WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM users WHERE id = ?", userId);
    }

    @Test
    @DisplayName("adjust CREDIT 真交易提交：餘額+、DB 寫一筆 ADJUSTMENT + memo")
    void adjust_credit_commits() {
        walletService.credit(userId, new BigDecimal("1000"), "BONUS", null, "seed-" + userId);

        WalletTransaction tx = walletService.adjust(
                userId, "CREDIT", new BigDecimal("500"), "活動補發", "adj-" + userId + "-c");

        assertThat(tx.getType()).isEqualTo(WalletTransactionType.ADJUSTMENT);
        assertThat(tx.getMemo()).isEqualTo("活動補發");
        // 新鮮讀確認真的提交進 DB
        assertThat(walletService.getBalance(userId)).isEqualByComparingTo("1500");
        String memo = jdbc.queryForObject(
                "SELECT memo FROM wallet_transactions WHERE idempotency_key = ?", String.class, "adj-" + userId + "-c");
        assertThat(memo).isEqualTo("活動補發");
    }

    @Test
    @DisplayName("adjust DEBIT 餘額不足：丟 InsufficientFunds、回滾、餘額不變、無 ADJUSTMENT 流水")
    void adjust_debit_insufficient_rollsBack() {
        walletService.credit(userId, new BigDecimal("100"), "BONUS", null, "seed-" + userId);

        assertThatThrownBy(() -> walletService.adjust(
                userId, "DEBIT", new BigDecimal("500"), "扣太多", "adj-" + userId + "-d"))
                .isInstanceOf(InsufficientFundsException.class);

        assertThat(walletService.getBalance(userId)).isEqualByComparingTo("100");   // 沒被扣
        Integer adjCount = jdbc.queryForObject(
                "SELECT count(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id "
                        + "WHERE w.user_id = ? AND wt.type = 'ADJUSTMENT'", Integer.class, userId);
        assertThat(adjCount).isEqualTo(0);   // 沒寫調整流水（已回滾）
    }

    @Test
    @DisplayName("adjust DEBIT 正常：餘額-、DB 寫一筆負號 ADJUSTMENT + memo")
    void adjust_debit_commits() {
        walletService.credit(userId, new BigDecimal("1000"), "BONUS", null, "seed-" + userId);

        WalletTransaction tx = walletService.adjust(
                userId, "DEBIT", new BigDecimal("300"), "扣回誤發", "adj-" + userId + "-d2");

        assertThat(tx.getType()).isEqualTo(WalletTransactionType.ADJUSTMENT);
        assertThat(tx.getAmount()).isEqualByComparingTo("-300");
        assertThat(tx.getMemo()).isEqualTo("扣回誤發");
        assertThat(walletService.getBalance(userId)).isEqualByComparingTo("700");
    }
}
