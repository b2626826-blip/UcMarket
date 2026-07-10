package com.ucmarket.security;

import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private static final String SECRET = "my-test-secret-key-that-is-long-enough-for-hs256-algorithm-12345";
    private static final long ACCESS_EXPIRATION = 900000;
    private static final long REFRESH_EXPIRATION = 604800000;

    private JwtTokenProvider tokenProvider;
    private User user;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION);
        user = new User("testuser", "test@test.com", "pwd");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "role", UserRole.USER);
    }

    @Test
    void generateAccessToken_shouldReturnValidToken() {
        String token = tokenProvider.generateAccessToken(user);
        assertNotNull(token);
        assertTrue(token.split("\\.").length == 3);
    }

    @Test
    void generateAccessToken_shouldContainUserId() {
        String token = tokenProvider.generateAccessToken(user);
        UUID extractedId = tokenProvider.getUserIdFromToken(token);
        assertEquals(user.getId(), extractedId);
    }

    @Test
    void validateToken_shouldReturnTrue_forValidToken() {
        String token = tokenProvider.generateAccessToken(user);
        assertTrue(tokenProvider.validateToken(token));
    }

    @Test
    void validateToken_shouldReturnFalse_forInvalidToken() {
        assertFalse(tokenProvider.validateToken("invalid-token"));
    }

    @Test
    void validateToken_shouldReturnFalse_forExpiredToken() {
        JwtTokenProvider shortLived = new JwtTokenProvider(SECRET, -1, REFRESH_EXPIRATION);
        String token = shortLived.generateAccessToken(user);
        assertFalse(shortLived.validateToken(token));
    }

    @Test
    void validateToken_shouldReturnFalse_forWrongKey() {
        String token = tokenProvider.generateAccessToken(user);
        JwtTokenProvider otherProvider = new JwtTokenProvider("different-secret-key-that-is-also-long-enough-abcdefg", ACCESS_EXPIRATION, REFRESH_EXPIRATION);
        assertFalse(otherProvider.validateToken(token));
    }

    @Test
    void generateRefreshToken_shouldReturnNonEmptyString() {
        String refreshToken = tokenProvider.generateRefreshToken();
        assertNotNull(refreshToken);
        assertFalse(refreshToken.isEmpty());
    }

    @Test
    void getRefreshTokenExpiration_shouldReturnConfiguredValue() {
        assertEquals(REFRESH_EXPIRATION, tokenProvider.getRefreshTokenExpiration());
    }

    @Test
    void getUserIdFromToken_shouldExtractCorrectUser() {
        String token = tokenProvider.generateAccessToken(user);
        UUID extractedId = tokenProvider.getUserIdFromToken(token);
        assertEquals(user.getId(), extractedId);
    }
}
