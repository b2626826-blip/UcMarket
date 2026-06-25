package com.ucmarket.integration;

import com.ucmarket.entity.User;
import com.ucmarket.entity.Wallet;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.WalletRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("pgtest")
@Transactional
class WalletRepositoryIntegrationTest {

    @Autowired private WalletRepository walletRepository;
    @Autowired private UserRepository userRepository;

    private static final UUID USER_RAINMAKER = UUID.fromString("00000000-0000-4000-8000-000000000002");

    @Test
    void findByUserId_shouldFindRainmakerWallet() {
        Optional<Wallet> wallet = walletRepository.findByUserId(USER_RAINMAKER);
        assertTrue(wallet.isPresent(), "Rainmaker wallet should exist (load mock.sql first)");
        assertNotNull(wallet.get().getId());
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
