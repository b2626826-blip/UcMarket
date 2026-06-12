package com.ucmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.auth.AuthResponse;
import com.ucmarket.dto.auth.AuthResponse.UserInfo;
import com.ucmarket.dto.auth.LoginRequest;
import com.ucmarket.dto.auth.RegisterRequest;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private AuthService authService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserRepository userRepository;

    @Test
    void register_shouldReturn201() throws Exception {
        RegisterRequest request = new RegisterRequest("newuser", "new@test.com", "password123");
        AuthResponse response = new AuthResponse("access", "refresh", 604800L,
                new UserInfo(UUID.randomUUID(), "newuser", "new@test.com", "USER", "ACTIVE", 0, null, null));

        when(authService.register(any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access"))
                .andExpect(jsonPath("$.user.username").value("newuser"));
    }

    @Test
    void register_shouldReturn400_whenValidationFails() throws Exception {
        RegisterRequest request = new RegisterRequest("ab", "invalid-email", "12");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_shouldReturn200() throws Exception {
        LoginRequest request = new LoginRequest("user@test.com", "password");
        AuthResponse response = new AuthResponse("access-token", "refresh", 604800L,
                new UserInfo(UUID.randomUUID(), "user", "user@test.com", "USER", "ACTIVE", 0, null, null));

        when(authService.login(any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"));
    }

    @Test
    void login_shouldReturn400_whenValidationFails() throws Exception {
        LoginRequest request = new LoginRequest("", "");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void me_shouldReturn401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_shouldReturn204_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent());
    }
}
