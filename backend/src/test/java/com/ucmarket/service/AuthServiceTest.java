package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.dto.auth.AuthResponse;
import com.ucmarket.dto.auth.AuthResponse.UserInfo;
import com.ucmarket.dto.auth.LoginRequest;
import com.ucmarket.dto.auth.RegisterRequest;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserSession;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.UserSessionRepository;
import com.ucmarket.security.JwtTokenProvider;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserSessionRepository userSessionRepository;
    @Mock private WalletService walletService;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private PasswordEncoder passwordEncoder;

    @Captor private ArgumentCaptor<User> userCaptor;
    @Captor private ArgumentCaptor<UserSession> sessionCaptor;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, userSessionRepository, walletService,
                jwtTokenProvider, passwordEncoder);
    }

    @Test
    void register_shouldCreateUserAndWallet() {
        RegisterRequest request = new RegisterRequest("newuser", "new@test.com", "password123");
        String idempotencyKey = "register-123";
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPass");
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpiration()).thenReturn(604800000L);
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
            return user;
        });

        AuthResponse response = authService.register(request, idempotencyKey);

        assertNotNull(response);
        assertEquals("access-token", response.accessToken());
        assertEquals("refresh-token", response.refreshToken());
        assertEquals(604800L, response.expiresIn());
        assertEquals("newuser", response.user().username());

        verify(userRepository).save(userCaptor.capture());
        User captured = userCaptor.getValue();
        assertEquals("newuser", captured.getUsername());
        assertEquals("new@test.com", captured.getEmail());

        verify(walletService).createWalletForUser(captured.getId());
        verify(walletService).credit(
                eq(captured.getId()),
                eq(new BigDecimal("10000")),
                eq("BONUS"),
                isNull(),
                eq("signup:" + idempotencyKey)
        );
        verify(userSessionRepository).save(any());
    }

    @Test
    void register_shouldThrow_whenIdempotencyKeyMissing() {
        RegisterRequest request = new RegisterRequest("newuser", "new@test.com", "password123");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.register(request, " "));

        assertEquals("Missing Idempotency-Key header", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_shouldThrow_whenEmailExists() {
        RegisterRequest request = new RegisterRequest("user", "dup@test.com", "password123");
        when(userRepository.existsByEmail("dup@test.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request, "register-dup"));
        verify(userRepository, never()).save(any());
        verify(walletService, never()).createWalletForUser(any());
    }

    @Test
    void register_shouldThrow_whenUsernameExists() {
        RegisterRequest request = new RegisterRequest("dupuser", "e@test.com", "password123");
        when(userRepository.existsByEmail("e@test.com")).thenReturn(false);
        when(userRepository.existsByUsername("dupuser")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request, "register-dup"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_shouldSucceed_withValidCredentials() {
        LoginRequest request = new LoginRequest("user@test.com", "correctPwd");
        User user = new User("testuser", "user@test.com", "encodedPwd");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correctPwd", "encodedPwd")).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpiration()).thenReturn(604800000L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token", response.accessToken());
        assertNotNull(user.getLastLoginAt());
    }

    @Test
    void login_shouldThrow_whenWrongPassword() {
        LoginRequest request = new LoginRequest("user@test.com", "wrongPwd");
        User user = new User("testuser", "user@test.com", "encodedPwd");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPwd", "encodedPwd")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> authService.login(request));
    }

    @Test
    void login_shouldThrow_whenUserBanned() {
        LoginRequest request = new LoginRequest("banned@test.com", "pwd");
        User user = new User("banned", "banned@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "status", UserStatus.BANNED);

        when(userRepository.findByEmail("banned@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pwd", "encodedPwd")).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> authService.login(request));
    }

    @Test
    void getCurrentUser_shouldReturnUserInfo() {
        UUID userId = UUID.randomUUID();
        User user = new User("existing", "e@test.com", "pwd");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserInfo info = authService.getCurrentUser(userId);

        assertNotNull(info);
        assertNull(info.id());
        assertEquals("existing", info.username());
    }

    @Test
    void getCurrentUser_shouldThrow_whenNotFound() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> authService.getCurrentUser(userId));
    }

    @Test
    void logout_shouldRevokeSession() {
        UUID userId = UUID.randomUUID();
        String refreshToken = "some-refresh-token";
        UserSession session = new UserSession(userId, "hash", null, null);
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));

        authService.logout(userId, refreshToken);

        assertNotNull(session.getRevokedAt());
        verify(userSessionRepository).save(session);
    }

    @Test
    void logout_shouldThrow_whenSessionNotFound() {
        UUID userId = UUID.randomUUID();
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> authService.logout(userId, "some-token"));
        verify(userSessionRepository, never()).save(any());
    }

    @Test
    void logout_shouldThrow_whenSessionBelongsToOtherUser() {
        UUID userId = UUID.randomUUID();
        UserSession session = new UserSession(UUID.randomUUID(), "hash", null, null);
        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));

        assertThrows(IllegalArgumentException.class, () -> authService.logout(userId, "some-token"));
        verify(userSessionRepository, never()).save(any());
    }
}
