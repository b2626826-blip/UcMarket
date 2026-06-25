package com.ucmarket.integration;

import com.ucmarket.entity.User;
import com.ucmarket.entity.Wallet;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// F7：保留團隊 pgtest 慣例(目前無 pgtest 檔 → dormant，等同 H2);只把依賴外部 mock.sql 的測試改成自足
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("pgtest")
@Transactional
class WalletRepositoryIntegrationTest {

    @Autowired private WalletRepository walletRepository;
    @Autowired private UserRepository userRepository;

    // F7：自己 seed,不依賴外部 mock.sql;改測「一人一錢包」唯一約束(I-9)
    @Test
    void wallet_userId_isUnique_onePerUser() {
        User user = userRepository.save(new User(
                "uniq_" + UUID.randomUUID().toString().substring(0, 8),
                "uniq_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com", "hashed"));
        walletRepository.saveAndFlush(new Wallet(user.getId()));

        // 同一 user 再建第二個錢包 → 違反 uk_wallets_user_id
        assertThrows(DataIntegrityViolationException.class, () ->
                walletRepository.saveAndFlush(new Wallet(user.getId())));
    }

    // F4：驗證 DB 層 upsert 在 H2(MODE=PostgreSQL) 也支援 ON CONFLICT DO NOTHING ——
    // 同 user 連呼兩次：只成立一個錢包、不丟例外（並發安全的基礎機制）
    @Test
    void insertIfAbsent_isIdempotent() {
        User user = userRepository.saveAndFlush(new User(
                "upsert_" + UUID.randomUUID().toString().substring(0, 8),
                "upsert_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com", "hashed"));

        walletRepository.insertIfAbsent(UUID.randomUUID(), user.getId());
        walletRepository.insertIfAbsent(UUID.randomUUID(), user.getId());   // 第二次 → ON CONFLICT DO NOTHING

        assertTrue(walletRepository.findByUserId(user.getId()).isPresent());
        assertEquals(1, walletRepository.findAll().stream()
                .filter(w -> w.getUserId().equals(user.getId())).count());
    }

    @Test
    void findByUserId_shouldReturnEmpty_forUnknownUser() {
        Optional<Wallet> wallet = walletRepository.findByUserId(UUID.randomUUID());
        assertFalse(wallet.isPresent());
    }

    @Test
    void insertAndFind_shouldWork() {
        User user = new User("wallet_test_" + UUID.randomUUID().toString().substring(0, 8),
                "wallet_test@test.com", "hashed");
        user = userRepository.save(user);

        Wallet wallet = new Wallet(user.getId());
        Wallet saved = walletRepository.save(wallet);
        assertNotNull(saved.getId());

        Optional<Wallet> found = walletRepository.findByUserId(user.getId());
        assertTrue(found.isPresent());
        assertEquals(user.getId(), found.get().getUserId());
    }
}
