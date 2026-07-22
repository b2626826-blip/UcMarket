package com.ucmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.admin.AdminWalletAdjustRequest;
import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.entity.WalletTransactionType;
import com.ucmarket.repository.AdminLogRepository;
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
    @MockitoBean private AdminLogRepository adminLogRepository;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();
        adminUser = new User("admin", "admin@test.com", "encoded");
        ReflectionTestUtils.setField(adminUser, "id", adminId);
        ReflectionTestUtils.setField(adminUser, "role", UserRole.ADMIN);
        var auth = new UsernamePasswordAuthenticationToken(
                adminUser, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User user(UUID id, UserRole role) {
        User u = new User("u" + id.toString().substring(0, 6), id + "@test.com", "enc");
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "role", role);
        ReflectionTestUtils.setField(u, "status", UserStatus.ACTIVE);
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
    void adjustWallet_happyPath_writesAdminLogWithTxId() throws Exception {
        UUID targetId = UUID.randomUUID();
        WalletTransaction tx = adjustmentTx();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user(targetId, UserRole.USER)));
        when(walletService.adjust(eq(targetId), eq("CREDIT"), any(BigDecimal.class), eq("活動補發"), anyString()))
                .thenReturn(tx);
        when(adminLogRepository.save(any(AdminLog.class))).thenAnswer(inv -> inv.getArgument(0));

        var body = new AdminWalletAdjustRequest("CREDIT", new BigDecimal("500"), "活動補發");
        mockMvc.perform(post("/api/admin/users/{id}/wallet/adjust", targetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        verify(adminLogRepository).save(argThat(log ->
                "WALLET_ADJUST".equals(log.getAction())
                        && "USER".equals(log.getTargetType())
                        && targetId.equals(log.getTargetId())
                        && adminId.equals(log.getAdminUserId())
                        && log.getMetadata() != null
                        && log.getMetadata().contains(tx.getId().toString())
                        && log.getMetadata().contains("活動補發")));
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

    @Test
    void suspendUser_happyPath_writesAdminLog() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user(targetId, UserRole.USER)));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(adminLogRepository.save(any(AdminLog.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/api/admin/users/{id}/suspend", targetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BANNED"));

        verify(adminLogRepository).save(argThat(log ->
                "USER_SUSPEND".equals(log.getAction())
                        && "USER".equals(log.getTargetType())
                        && targetId.equals(log.getTargetId())
                        && adminId.equals(log.getAdminUserId())));
    }

    @Test
    void suspendUser_self_returns400AndNoLog() throws Exception {
        mockMvc.perform(post("/api/admin/users/{id}/suspend", adminId))
                .andExpect(status().isBadRequest());

        verify(userRepository, never()).save(any());
        verify(adminLogRepository, never()).save(any());
    }

    @Test
    void unsuspendUser_happyPath_writesAdminLog() throws Exception {
        UUID targetId = UUID.randomUUID();
        User banned = user(targetId, UserRole.USER);
        ReflectionTestUtils.setField(banned, "status", UserStatus.BANNED);
        when(userRepository.findById(targetId)).thenReturn(Optional.of(banned));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(adminLogRepository.save(any(AdminLog.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/api/admin/users/{id}/unsuspend", targetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(adminLogRepository).save(argThat(log ->
                "USER_UNSUSPEND".equals(log.getAction())
                        && targetId.equals(log.getTargetId())));
    }
}
