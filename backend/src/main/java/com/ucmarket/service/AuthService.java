package com.ucmarket.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.ucmarket.notification.PasswordResetPayload;
import com.ucmarket.repository.PasswordResetTokenRepository;
import com.ucmarket.repository.UserOAuthAccountRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.UserSessionRepository;
import com.ucmarket.security.JwtTokenProvider;

@Service
@Transactional
public class AuthService {

    // 流程1：註冊送點金額（負責人已同意 10000）
    private static final BigDecimal SIGNUP_BONUS_POINTS = new BigDecimal("10000");
    private static final int PASSWORD_RESET_EXPIRES_MINUTES = 10;
    private static final String FORGOT_PASSWORD_MESSAGE = "若此 Email 已註冊，我們已寄出重設信件。";

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final UserOAuthAccountRepository userOAuthAccountRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final NotificationService notificationService;
    private final WalletService walletService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository, UserSessionRepository userSessionRepository,
            UserOAuthAccountRepository userOAuthAccountRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            NotificationService notificationService, WalletService walletService,
            JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder, ObjectMapper objectMapper,
            @Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.userOAuthAccountRepository = userOAuthAccountRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.notificationService = notificationService;
        this.walletService = walletService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
        this.frontendBaseUrl = trimTrailingSlash(frontendBaseUrl);
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("此 Email 已被註冊");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("此使用者名稱已被使用");
        }

        User user = new User(request.username(), request.email(), passwordEncoder.encode(request.password()));
        userRepository.save(user);

        walletService.createWalletForUser(user.getId());

        // 流程1：註冊送點。與建 user / 建錢包同屬 register 的 @Transactional → 一起成功 / 一起回滾。
        // idemKey = signup-{userId}（可推導、每人一次）→ 萬一 register 重送也不會重複送點。
        walletService.credit(user.getId(), SIGNUP_BONUS_POINTS, "BONUS", null, "signup-" + user.getId());

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Email 或密碼錯誤"));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Email 或密碼錯誤");
        }

        if (user.getStatus() != com.ucmarket.entity.UserStatus.ACTIVE) {
            throw new IllegalStateException("帳號未啟用或已停用");
        }

        user.recordLogin(LocalDateTime.now());
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public UserInfo getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("找不到使用者"));
        return new UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(),
                user.getStatus().name(), user.getReputation(), user.getAvatarUrl(), user.getBio(),
                user.getPasswordHash() != null, user.getCreatedAt());
    }

    public void logout(UUID userId, String refreshToken) {
        String hash = sha256(refreshToken);
        UserSession session = userSessionRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("無效的重新整理權杖"));
        if (!session.getUserId().equals(userId)) {
            throw new IllegalArgumentException("權杖不屬於目前使用者");
        }
        session.revoke();
        userSessionRepository.save(session);
    }

    public AuthResponse refresh(String rawRefreshToken) {
        String hash = sha256(rawRefreshToken);
        UserSession session = userSessionRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("無效的重新整理權杖"));

        if (session.getRevokedAt() != null) {
            throw new IllegalArgumentException("重新整理權杖已失效");
        }
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("重新整理權杖已過期");
        }

        session.revoke();
        userSessionRepository.save(session);

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("找不到使用者"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException("帳號未啟用或已停用");
        }

        return buildAuthResponse(user);
    }

    public void deleteAccount(UUID userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("找不到使用者"));

        if (user.getRole() == UserRole.ADMIN) {
            throw new IllegalStateException("管理員無法自行註銷帳號");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException("帳號未啟用或已停用");
        }

        if (user.getPasswordHash() != null) {
            if (password == null || password.isBlank()) {
                throw new IllegalArgumentException("請輸入目前密碼");
            }
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new IllegalArgumentException("目前密碼不正確");
            }
        }

        user.anonymizeForDeletion();
        userRepository.save(user);
        userSessionRepository.deleteByUserId(userId);
        userOAuthAccountRepository.deleteByUserId(userId);
    }

    public UserInfo updateProfile(UUID userId, String username, String avatarUrl, String bio) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("找不到使用者"));

        if (username != null && !username.equals(user.getUsername())) {
            if (userRepository.existsByUsername(username)) {
                throw new IllegalArgumentException("此使用者名稱已被使用");
            }
            user.setUsername(username);
        }
        user.updateProfile(avatarUrl, bio);
        userRepository.save(user);

        return new UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(),
                user.getStatus().name(), user.getReputation(), user.getAvatarUrl(), user.getBio(),
                user.getPasswordHash() != null, user.getCreatedAt());
    }

    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("找不到使用者"));

        if (user.getPasswordHash() == null) {
            throw new IllegalStateException("第三方登入帳號無法在此變更密碼");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("目前密碼不正確");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public String forgotPassword(String email) {
        Optional<User> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            return FORGOT_PASSWORD_MESSAGE;
        }

        User user = found.get();
        if (user.getStatus() != UserStatus.ACTIVE || user.getPasswordHash() == null) {
            return FORGOT_PASSWORD_MESSAGE;
        }

        LocalDateTime now = LocalDateTime.now();
        passwordResetTokenRepository.invalidateUnusedByUserId(user.getId(), now);

        String rawToken = generateResetToken();
        String tokenHash = sha256(rawToken);
        PasswordResetToken resetToken = new PasswordResetToken(
                user.getId(),
                tokenHash,
                now.plusMinutes(PASSWORD_RESET_EXPIRES_MINUTES));
        passwordResetTokenRepository.save(resetToken);

        String resetUrl = frontendBaseUrl + "/auth/reset-password?token=" + rawToken;
        String payload = toJson(new PasswordResetPayload(
                resetUrl, user.getUsername(), PASSWORD_RESET_EXPIRES_MINUTES));
        notificationService.enqueue(
                NotificationEventType.PASSWORD_RESET,
                user.getId(),
                user.getEmail(),
                null,
                payload,
                "password-reset:%s:%s".formatted(user.getId(), tokenHash.substring(0, 16)));

        return FORGOT_PASSWORD_MESSAGE;
    }

    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("重設連結無效或已過期");
        }

        String tokenHash = sha256(rawToken.trim());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("重設連結無效或已過期"));

        LocalDateTime now = LocalDateTime.now();
        if (!resetToken.isUsable(now)) {
            throw new IllegalArgumentException("重設連結無效或已過期");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("重設連結無效或已過期"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("重設連結無效或已過期");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.markUsed(now);
        passwordResetTokenRepository.save(resetToken);
        passwordResetTokenRepository.invalidateUnusedByUserId(user.getId(), now);
        userSessionRepository.deleteByUserId(user.getId());
    }

    public AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken();
        long expiresIn = jwtTokenProvider.getRefreshTokenExpiration();

        String hash = sha256(refreshToken);
        UserSession session = new UserSession(user.getId(), hash, LocalDateTime.now().plusSeconds(expiresIn / 1000), null);
        userSessionRepository.save(session);

        UserInfo userInfo = new UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(),
                user.getStatus().name(), user.getReputation(), user.getAvatarUrl(), user.getBio(),
                user.getPasswordHash() != null, user.getCreatedAt());
        return new AuthResponse(accessToken, refreshToken, expiresIn / 1000, userInfo);
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize password reset payload", e);
        }
    }

    private static String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:5173";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
