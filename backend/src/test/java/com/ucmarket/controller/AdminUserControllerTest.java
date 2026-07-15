package com.ucmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.admin.AdminWalletAdjustRequest;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminUserController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminUserControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private UserRepository userRepository;
    @MockitoBean private WalletService walletService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = new User("admin", "admin@test.com", "encoded");
        ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(adminUser, "role", UserRole.ADMIN);
        var auth = new UsernamePasswordAuthenticationToken(
                adminUser, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User user(UUID id, UserRole role) {
        User u = new User("u" + id.toString().substring(0, 6), id + "@test.com", "enc");
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "role", role);
        return u;
    }

    private WalletTransaction adjustmentTx() {
        WalletTransaction tx = new WalletTransaction(UUID.randomUUID(), WalletTransactionType.ADJUSTMENT,
                new BigDecimal("500"), new BigDecimal("1500"), "ADJUST", null, "adj-k", "活動補發");
        ReflectionTestUtils.setField(tx, "id", UUID.randomUUID());
        return tx;
    }

    @Test
    void adjustWallet_happyPath_returns200WithMemo() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user(targetId, UserRole.USER)));
        when(walletService.adjust(eq(targetId), eq("CREDIT"), any(BigDecimal.class), eq("活動補發"), anyString()))
                .thenReturn(adjustmentTx());

        var body = new AdminWalletAdjustRequest("CREDIT", new BigDecimal("500"), "活動補發");
        mockMvc.perform(post("/api/admin/users/{id}/wallet/adjust", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("ADJUSTMENT"))
                .andExpect(jsonPath("$.memo").value("活動補發"));
    }

    @Test
    void adjustWallet_blocksAdminTarget_returns400() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user(targetId, UserRole.ADMIN)));

        var body = new AdminWalletAdjustRequest("CREDIT", new BigDecimal("500"), "測試");
        mockMvc.perform(post("/api/admin/users/{id}/wallet/adjust", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());

        verify(walletService, never()).adjust(any(), any(), any(), any(), any());
    }

    @Test
    void adjustWallet_userNotFound_returns404() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.empty());

        var body = new AdminWalletAdjustRequest("CREDIT", new BigDecimal("500"), "測試");
        mockMvc.perform(post("/api/admin/users/{id}/wallet/adjust", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound());
    }

    @Test
    void getUserWallet_returnsBalanceAndTransactions() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user(targetId, UserRole.USER)));
        when(walletService.getBalance(targetId)).thenReturn(new BigDecimal("1500"));
        when(walletService.getTransactions(targetId)).thenReturn(List.of(adjustmentTx()));

        mockMvc.perform(get("/api/admin/users/{id}/wallet", targetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(1500))
                .andExpect(jsonPath("$.transactions").isArray())
                .andExpect(jsonPath("$.transactions[0].memo").value("活動補發"));
    }
}
