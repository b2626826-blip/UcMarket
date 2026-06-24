package com.ucmarket.service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.auth.AuthResponse;
import com.ucmarket.dto.auth.AuthResponse.UserInfo;
import com.ucmarket.dto.auth.LoginRequest;
import com.ucmarket.dto.auth.RegisterRequest;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserSession;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.repository.UserSessionRepository;
import com.ucmarket.security.JwtTokenProvider;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final WalletService walletService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, UserSessionRepository userSessionRepository,
            WalletService walletService, JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.walletService = walletService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already taken");
        }

        User user = new User(request.username(), request.email(), passwordEncoder.encode(request.password()));
        userRepository.save(user);

        walletService.createWalletForUser(user.getId());

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (user.getStatus() != com.ucmarket.entity.UserStatus.ACTIVE) {
            throw new IllegalStateException("Account is not active");
        }

        user.recordLogin(LocalDateTime.now());
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public UserInfo getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return new UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(),
                user.getStatus().name(), user.getReputation(), user.getAvatarUrl(), user.getBio());
    }

    public void logout(UUID userId, String refreshToken) {
        String hash = sha256(refreshToken);
        UserSession session = userSessionRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        if (!session.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Token does not belong to current user");
        }
        session.revoke();
        userSessionRepository.save(session);
    }

    public AuthResponse refresh(String rawRefreshToken) {
        String hash = sha256(rawRefreshToken);
        UserSession session = userSessionRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (session.getRevokedAt() != null) {
            throw new IllegalArgumentException("Refresh token has been revoked");
        }
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Refresh token has expired");
        }

        session.revoke();
        userSessionRepository.save(session);

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return buildAuthResponse(user);
    }

    public UserInfo updateProfile(UUID userId, String username, String avatarUrl, String bio) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (username != null && !username.equals(user.getUsername())) {
            if (userRepository.existsByUsername(username)) {
                throw new IllegalArgumentException("Username already taken");
            }
            user.setUsername(username);
        }
        user.updateProfile(avatarUrl, bio);
        userRepository.save(user);

        return new UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(),
                user.getStatus().name(), user.getReputation(), user.getAvatarUrl(), user.getBio());
    }

    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken();
        long expiresIn = jwtTokenProvider.getRefreshTokenExpiration();

        String hash = sha256(refreshToken);
        UserSession session = new UserSession(user.getId(), hash, LocalDateTime.now().plusSeconds(expiresIn / 1000), null);
        userSessionRepository.save(session);

        UserInfo userInfo = new UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(),
                user.getStatus().name(), user.getReputation(), user.getAvatarUrl(), user.getBio());
        return new AuthResponse(accessToken, refreshToken, expiresIn / 1000, userInfo);
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes());
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
