package com.ucmarket.integration;

import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.repository.UserRepository;
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
class UserRepositoryIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    private static final UUID ADMIN_SHUNG_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID BANNED_DEMO_ID = UUID.fromString("00000000-0000-4000-8000-000000000008");
    private static final UUID DISABLED_DEMO_ID = UUID.fromString("00000000-0000-4000-8000-000000000009");

    @Test
    void mockData_adminShung_shouldExist() {
        User admin = userRepository.findById(ADMIN_SHUNG_ID).orElse(null);
        assertNotNull(admin, "admin_shung should exist in DB (load mock.sql first)");
        assertEquals("admin_shung", admin.getUsername());
        assertEquals("admin.shung@ucmarket.test", admin.getEmail());
        assertEquals(UserRole.ADMIN, admin.getRole());
        assertEquals(UserStatus.ACTIVE, admin.getStatus());
        assertEquals(980, admin.getReputation());
    }

    @Test
    void mockData_bannedUser_shouldBeBanned() {
        User banned = userRepository.findById(BANNED_DEMO_ID).orElse(null);
        assertNotNull(banned, "banned_demo should exist");
        assertEquals(UserStatus.BANNED, banned.getStatus());
        assertEquals("banned_demo", banned.getUsername());
    }

    @Test
    void mockData_disabledUser_shouldHaveNullLastLogin() {
        User disabled = userRepository.findById(DISABLED_DEMO_ID).orElse(null);
        assertNotNull(disabled, "disabled_demo should exist");
        assertEquals(UserStatus.DISABLED, disabled.getStatus());
        assertNull(disabled.getLastLoginAt());
    }

    @Test
    void findByEmail_shouldFindExistingUser() {
        Optional<User> result = userRepository.findByEmail("admin.shung@ucmarket.test");
        assertTrue(result.isPresent());
        assertEquals("admin_shung", result.get().getUsername());
    }

    @Test
    void findByEmail_shouldReturnEmpty_forUnknownEmail() {
        Optional<User> result = userRepository.findByEmail("nobody@ucmarket.test");
        assertFalse(result.isPresent());
    }

    @Test
    void findByUsername_shouldFindExistingUser() {
        Optional<User> result = userRepository.findByUsername("rainmaker");
        assertTrue(result.isPresent());
        assertEquals("rainmaker@ucmarket.test", result.get().getEmail());
    }

    @Test
    void existsByEmail_shouldReturnTrue() {
        assertTrue(userRepository.existsByEmail("tech.luna@ucmarket.test"));
        assertFalse(userRepository.existsByEmail("fake@test.com"));
    }

    @Test
    void existsByUsername_shouldReturnTrue() {
        assertTrue(userRepository.existsByUsername("sports_lee"));
        assertFalse(userRepository.existsByUsername("nobody_here"));
    }

    @Test
    void insertAndDelete_shouldWork(@Autowired UserRepository repo) {
        String uniqueName = "tmp_test_" + UUID.randomUUID().toString().substring(0, 8);
        User newUser = new User(uniqueName, uniqueName + "@test.com", "hashed");
        User saved = repo.save(newUser);
        assertNotNull(saved.getId());

        Optional<User> found = repo.findByUsername(uniqueName);
        assertTrue(found.isPresent());

        repo.delete(saved);
        assertFalse(repo.findByUsername(uniqueName).isPresent());
    }

    @Test
    void findByRoleAndStatus_shouldReturnOnlyActiveAdmins() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        User activeAdmin = new User("active_admin_" + suffix, "active_admin_" + suffix + "@test.com", "hashed");
        activeAdmin.changeRole(UserRole.ADMIN);

        User disabledAdmin = new User("disabled_admin_" + suffix, "disabled_admin_" + suffix + "@test.com", "hashed");
        disabledAdmin.changeRole(UserRole.ADMIN);
        disabledAdmin.changeStatus(UserStatus.DISABLED);

        User activeUser = new User("active_user_" + suffix, "active_user_" + suffix + "@test.com", "hashed");

        userRepository.save(activeAdmin);
        userRepository.save(disabledAdmin);
        userRepository.save(activeUser);

        var result = userRepository.findByRoleAndStatus(UserRole.ADMIN, UserStatus.ACTIVE);

        assertTrue(result.stream().anyMatch(user -> user.getId().equals(activeAdmin.getId())));
        assertFalse(result.stream().anyMatch(user -> user.getId().equals(disabledAdmin.getId())));
        assertFalse(result.stream().anyMatch(user -> user.getId().equals(activeUser.getId())));
    }
}
