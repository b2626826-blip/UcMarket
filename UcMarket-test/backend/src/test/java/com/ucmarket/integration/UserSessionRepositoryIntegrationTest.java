package com.ucmarket.integration;

import com.ucmarket.entity.User;
import com.ucmarket.entity.UserSession;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.UserSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("pgtest")
@Transactional
class UserSessionRepositoryIntegrationTest {

    @Autowired private UserSessionRepository userSessionRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void findByRefreshTokenHash_shouldReturnEmpty_forUnknownToken() {
        Optional<UserSession> result = userSessionRepository.findByRefreshTokenHash("nonexistent-hash");
        assertFalse(result.isPresent());
    }

    @Test
    void insertAndFindByRefreshTokenHash_shouldWork() {
        User user = new User("session_test_" + UUID.randomUUID().toString().substring(0, 8),
                "session_test@test.com", "hashed");
        user = userRepository.save(user);

        String hash = "test-hash-" + UUID.randomUUID();
        UserSession session = new UserSession(user.getId(), hash, LocalDateTime.now().plusDays(30), "127.0.0.1");
        UserSession saved = userSessionRepository.save(session);
        assertNotNull(saved.getId());

        Optional<UserSession> found = userSessionRepository.findByRefreshTokenHash(hash);
        assertTrue(found.isPresent());
        assertEquals(user.getId(), found.get().getUserId());
    }

    @Test
    void deleteByUserId_shouldWork() {
        User user = new User("del_session_test_" + UUID.randomUUID().toString().substring(0, 8),
                "del_session_test@test.com", "hashed");
        user = userRepository.save(user);

        String hash = "delete-test-hash-" + UUID.randomUUID();
        UserSession session = new UserSession(user.getId(), hash, LocalDateTime.now().plusDays(30), null);
        userSessionRepository.save(session);

        userSessionRepository.deleteByUserId(user.getId());

        Optional<UserSession> found = userSessionRepository.findByRefreshTokenHash(hash);
        assertFalse(found.isPresent());
    }
}
