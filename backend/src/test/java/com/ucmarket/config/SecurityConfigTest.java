package com.ucmarket.config;

import com.ucmarket.security.JwtAuthFilter;
import com.ucmarket.security.N8nServiceTokenAuthFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock private JwtAuthFilter jwtAuthFilter;
    @Mock private N8nServiceTokenAuthFilter n8nServiceTokenAuthFilter;

    @Test
    void passwordEncoder_shouldCreateBCryptBean() {
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, n8nServiceTokenAuthFilter);
        PasswordEncoder encoder = config.passwordEncoder();
        assertNotNull(encoder);

        String hash = encoder.encode("password");
        assertTrue(encoder.matches("password", hash));
        assertFalse(encoder.matches("wrong", hash));
    }
}
