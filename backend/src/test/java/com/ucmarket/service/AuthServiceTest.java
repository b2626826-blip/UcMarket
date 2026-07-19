package com.ucmarket.service;

import com.ucmarket.dto.auth.AuthResponse;
import com.ucmarket.dto.auth.AuthResponse.UserInfo;
import com.ucmarket.dto.auth.LoginRequest;
import com.ucmarket.dto.auth.RegisterRequest;
import com.ucmarket.entity.PasswordResetToken;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserSession;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationService;
import com.ucmarket.repository.PasswordResetTokenRepository;
import com.ucmarket.repository.UserOAuthAccountRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.UserSessionRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserSessionRepository userSessionRepository;
    @Mock private UserOAuthAccountRepository userOAuthAccountRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private NotificationService notificationService;
    @Mock private WalletService walletService;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private PasswordEncoder passwordEncoder;

    @Captor private ArgumentCaptor<User> userCaptor;
    @Captor private ArgumentCaptor<UserSession> sessionCaptor;
    @Captor private ArgumentCaptor<PasswordResetToken> resetTokenCaptor;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, userSessionRepository, userOAuthAccountRepository,
                passwordResetTokenRepository, notificationService, walletService, jwtTokenProvider,
                passwordEncoder, new ObjectMapper(), "http://localhost:5173");
    }

    @Test
    void register_shouldCreateUserAndWallet() {
        RegisterRequest request = new RegisterRequest("newuser", "new@test.com", "password123");
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPass");
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken()).thenReturn("refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpiration()).thenReturn(604800000L);

        User savedUser = new User("newuser", "new@test.com", "encodedPass");
        when(userRepository.save(any())).thenReturn(savedUser);

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("access-token", response.accessToken());
        assertEquals("refresh-token", response.refreshToken());
        assertEquals(604800L, response.expiresIn());
        assertEquals("newuser", response.user().username());

        verify(userRepository).save(userCaptor.capture());
        User captured = userCaptor.getValue();
        assertEquals("newuser", captured.getUsername());
        assertEquals("new@test.com", captured.getEmail());

        verify(walletService).createWalletForUser(any());

        // 流程1：註冊要送 10000 點（refType BONUS → SIGNUP_BONUS、refId 為 null）
        verify(walletService).credit(any(), eq(new BigDecimal("10000")), eq("BONUS"), isNull(), anyString());

        verify(userSessionRepository).save(any());
    }

    @Test
    void register_shouldThrow_whenEmailExists() {
        RegisterRequest request = new RegisterRequest("user", "dup@test.com", "password123");
        when(userRepository.existsByEmail("dup@test.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
        verify(walletService, never()).createWalletForUser(any());
    }

    @Test
    void register_shouldThrow_whenUsernameExists() {
        RegisterRequest request = new RegisterRequest("dupuser", "e@test.com", "password123");
        when(userRepository.existsByEmail("e@test.com")).thenReturn(false);
        when(userRepository.existsByUsername("dupuser")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
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

    @Test
    void deleteAccount_shouldSoftDeletePasswordUser() {
        UUID userId = UUID.randomUUID();
        User user = new User("testuser", "user@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "id", userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correctPwd", "encodedPwd")).thenReturn(true);

        authService.deleteAccount(userId, "correctPwd");

        assertEquals(UserStatus.DISABLED, user.getStatus());
        assertNull(user.getPasswordHash());
        assertTrue(user.getEmail().startsWith("deleted+"));
        assertTrue(user.getUsername().startsWith("deleted_"));
        assertNull(user.getAvatarUrl());
        assertNull(user.getBio());
        verify(userRepository).save(user);
        verify(userSessionRepository).deleteByUserId(userId);
        verify(userOAuthAccountRepository).deleteByUserId(userId);
    }

    @Test
    void deleteAccount_shouldSoftDeleteOAuthUser_withoutPassword() {
        UUID userId = UUID.randomUUID();
        User user = new User("oauthuser", "oauth@test.com", null);
        ReflectionTestUtils.setField(user, "id", userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        authService.deleteAccount(userId, null);

        assertEquals(UserStatus.DISABLED, user.getStatus());
        verify(userSessionRepository).deleteByUserId(userId);
        verify(userOAuthAccountRepository).deleteByUserId(userId);
    }

    @Test
    void deleteAccount_shouldThrow_whenPasswordMissing() {
        UUID userId = UUID.randomUUID();
        User user = new User("testuser", "user@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> authService.deleteAccount(userId, null));
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteAccount_shouldThrow_whenPasswordIncorrect() {
        UUID userId = UUID.randomUUID();
        User user = new User("testuser", "user@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encodedPwd")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> authService.deleteAccount(userId, "wrong"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteAccount_shouldThrow_whenAdmin() {
        UUID userId = UUID.randomUUID();
        User user = new User("admin", "admin@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalStateException.class, () -> authService.deleteAccount(userId, "pwd"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteAccount_shouldThrow_whenAlreadyDisabled() {
        UUID userId = UUID.randomUUID();
        User user = new User("gone", "gone@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "status", UserStatus.DISABLED);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalStateException.class, () -> authService.deleteAccount(userId, "pwd"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void refresh_shouldThrow_whenUserNotActive() {
        UUID userId = UUID.randomUUID();
        UserSession session = new UserSession(userId, "hash",
                java.time.LocalDateTime.now().plusDays(1), null);
        User user = new User("gone", "gone@test.com", "pwd");
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "status", UserStatus.DISABLED);

        when(userSessionRepository.findByRefreshTokenHash(any())).thenReturn(Optional.of(session));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalStateException.class, () -> authService.refresh("raw-refresh"));
    }

    @Test
    void forgotPassword_shouldEnqueueReset_forActivePasswordUser() {
        UUID userId = UUID.randomUUID();
        User user = new User("testuser", "user@test.com", "encodedPwd");
        ReflectionTestUtils.setField(user, "id", userId);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String message = authService.forgotPassword("user@test.com");

        assertEquals("若此 Email 已註冊，我們已寄出重設信件。", message);
        verify(passwordResetTokenRepository).invalidateUnusedByUserId(eq(userId), any());
        verify(passwordResetTokenRepository).save(resetTokenCaptor.capture());
        PasswordResetToken saved = resetTokenCaptor.getValue();
        assertEquals(userId, saved.getUserId());
        assertNotNull(saved.getTokenHash());
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now().plusMinutes(9)));

        verify(notificationService).enqueue(
                eq(NotificationEventType.PASSWORD_RESET),
                eq(userId),
                eq("user@test.com"),
                isNull(),
                contains("reset-password?token="),
                startsWith("password-reset:" + userId + ":"));
    }

    @Test
    void forgotPassword_shouldNotEnqueue_whenEmailUnknown() {
        when(userRepository.findByEmail("missing@test.com")).thenReturn(Optional.empty());

        String message = authService.forgotPassword("missing@test.com");

        assertEquals("若此 Email 已註冊，我們已寄出重設信件。", message);
        verify(passwordResetTokenRepository, never()).save(any());
        verify(notificationService, never()).enqueue(any(), any(), any(), any(), any(), any());
    }

    @Test
    void forgotPassword_shouldNotEnqueue_whenOAuthOnly() {
        UUID userId = UUID.randomUUID();
        User user = new User("oauth", "oauth@test.com", null);
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findByEmail("oauth@test.com")).thenReturn(Optional.of(user));

        String message = authService.forgotPassword("oauth@test.com");

        assertEquals("若此 Email 已註冊，我們已寄出重設信件。", message);
        verify(notificationService, never()).enqueue(any(), any(), any(), any(), any(), any());
    }

    @Test
    void resetPassword_shouldUpdatePasswordAndClearSessions() {
        UUID userId = UUID.randomUUID();
        User user = new User("testuser", "user@test.com", "oldHash");
        ReflectionTestUtils.setField(user, "id", userId);

        String rawToken = "raw-reset-token";
        String hash = sha256Hex(rawToken);
        PasswordResetToken token = new PasswordResetToken(userId, hash, LocalDateTime.now().plusMinutes(10));

        when(passwordResetTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(token));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("new-password")).thenReturn("newHash");

        authService.resetPassword(rawToken, "new-password");

        assertEquals("newHash", user.getPasswordHash());
        assertNotNull(token.getUsedAt());
        verify(userRepository).save(user);
        verify(passwordResetTokenRepository).save(token);
        verify(userSessionRepository).deleteByUserId(userId);
    }

    @Test
    void resetPassword_shouldThrow_whenTokenInvalid() {
        when(passwordResetTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> authService.resetPassword("bad-token", "new-password"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_shouldThrow_whenTokenExpired() {
        UUID userId = UUID.randomUUID();
        String rawToken = "expired-token";
        String hash = sha256Hex(rawToken);
        PasswordResetToken token = new PasswordResetToken(userId, hash, LocalDateTime.now().minusMinutes(1));
        when(passwordResetTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(token));

        assertThrows(IllegalArgumentException.class,
                () -> authService.resetPassword(rawToken, "new-password"));
        verify(userRepository, never()).save(any());
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
