package com.ucmarket.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.ucmarket.dto.auth.AuthResponse;
import com.ucmarket.dto.auth.FirebaseLoginRequest;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserOAuthAccount;
import com.ucmarket.repository.UserOAuthAccountRepository;
import com.ucmarket.repository.UserRepository;

@Service
@Transactional
public class FirebaseAuthService {

    private static final BigDecimal SIGNUP_BONUS_POINTS = new BigDecimal("10000");

    private final UserRepository userRepository;
    private final UserOAuthAccountRepository oauthAccountRepository;
    private final WalletService walletService;
    private final AuthService authService;

    public FirebaseAuthService(UserRepository userRepository,
            UserOAuthAccountRepository oauthAccountRepository,
            WalletService walletService,
            AuthService authService) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.walletService = walletService;
        this.authService = authService;
    }

    public AuthResponse loginWithFirebase(FirebaseLoginRequest request) {
        FirebaseToken token = verifyIdToken(request.idToken());
        String email = token.getEmail();
        String uid = token.getUid();
        String provider = request.provider().toUpperCase();
        String picture = (String) token.getClaims().get("picture");

        validateProvider(provider);

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("此帳號未提供 Email，請改用 Google 或註冊帳號");
        }

        Optional<UserOAuthAccount> existing = oauthAccountRepository.findByProviderAndProviderUid(provider, uid);
        if (existing.isPresent()) {
            User user = userRepository.findById(existing.get().getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            user.recordLogin(LocalDateTime.now());
            return authService.buildAuthResponse(user);
        }

        Optional<User> byEmail = userRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            User user = byEmail.get();
            oauthAccountRepository.save(new UserOAuthAccount(user.getId(), provider, uid, email));
            user.recordLogin(LocalDateTime.now());
            return authService.buildAuthResponse(user);
        }

        String username = generateUniqueUsername(email);
        User newUser = new User(username, email, null);
        if (picture != null && !picture.isBlank()) {
            newUser.updateProfile(picture, null);
        }
        userRepository.save(newUser);

        oauthAccountRepository.save(new UserOAuthAccount(newUser.getId(), provider, uid, email));
        walletService.createWalletForUser(newUser.getId());
        walletService.credit(newUser.getId(), SIGNUP_BONUS_POINTS, "BONUS", null, "signup-" + newUser.getId());

        return authService.buildAuthResponse(newUser);
    }

    private FirebaseToken verifyIdToken(String idToken) {
        try {
            return FirebaseAuth.getInstance().verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            throw new IllegalArgumentException("Invalid Firebase ID token: " + e.getMessage(), e);
        }
    }

    private void validateProvider(String provider) {
        if (!provider.equals("GOOGLE") && !provider.equals("GITHUB") && !provider.equals("FACEBOOK")) {
            throw new IllegalArgumentException("Unsupported OAuth provider: " + provider);
        }
    }

    private String generateUniqueUsername(String email) {
        String base = email.substring(0, email.indexOf('@'));
        String username = base;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = base + suffix;
            suffix++;
        }
        return username;
    }
}
