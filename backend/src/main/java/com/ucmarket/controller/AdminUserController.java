package com.ucmarket.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.PageResponse;
import com.ucmarket.dto.WalletTransactionResponse;
import com.ucmarket.dto.admin.AdminUserResponse;
import com.ucmarket.dto.admin.AdminUserWalletResponse;
import com.ucmarket.dto.admin.AdminWalletAdjustRequest;
import com.ucmarket.entity.AdminLog;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.repository.AdminLogRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.service.WalletService;
import com.ucmarket.util.PageParams;

import jakarta.persistence.EntityNotFoundException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final WalletService walletService;
    private final AdminLogRepository adminLogRepository;
    private final ObjectMapper objectMapper;

    public AdminUserController(UserRepository userRepository, WalletService walletService,
            AdminLogRepository adminLogRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.walletService = walletService;
        this.adminLogRepository = adminLogRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public PageResponse<AdminUserResponse> listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserRole roleEnum = parseRole(role);
        UserStatus statusEnum = parseStatus(status);

        Page<AdminUserResponse> result = userRepository
                .search(roleEnum, statusEnum, keyword, PageParams.of(page, size, "createdAt"))
                .map(AdminUserResponse::from);
        return PageResponse.of(result);
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<AdminUserResponse> suspendUser(
            @PathVariable UUID id, @AuthenticationPrincipal User admin) {
        if (admin.getId().equals(id)) {
            throw new IllegalArgumentException("不可停權自己");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        user.changeStatus(UserStatus.BANNED);
        userRepository.save(user);
        adminLogRepository.save(new AdminLog(
                admin.getId(), "USER_SUSPEND", "USER", id, "{\"status\":\"BANNED\"}"));
        return ResponseEntity.ok(AdminUserResponse.from(user));
    }

    @PostMapping("/{id}/unsuspend")
    public ResponseEntity<AdminUserResponse> unsuspendUser(
            @PathVariable UUID id, @AuthenticationPrincipal User admin) {
        if (admin.getId().equals(id)) {
            throw new IllegalArgumentException("不可解除自己的停權");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        user.changeStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        adminLogRepository.save(new AdminLog(
                admin.getId(), "USER_UNSUSPEND", "USER", id, "{\"status\":\"ACTIVE\"}"));
        return ResponseEntity.ok(AdminUserResponse.from(user));
    }

    // 錢包調整（沖帳）：只能調一般用戶；ADMIN 目標一律拒絕（同時擋掉調自己與調其他 admin）
    @PostMapping("/{id}/wallet/adjust")
    public WalletTransactionResponse adjustWallet(
            @PathVariable UUID id,
            @RequestBody AdminWalletAdjustRequest req,
            @AuthenticationPrincipal User admin) {
        User target = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        if (target.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("不可調整管理員帳號");
        }
        String idemKey = "adjust:" + admin.getId() + ":" + UUID.randomUUID();
        WalletTransaction tx = walletService.adjust(
                target.getId(), req.direction(), req.amount(), req.reason(), idemKey);
        // 稽核與帳務雙軌：流水記「錢怎麼動」，AdminLog 記「哪個管理員做的」；txId 讓兩邊互相可追
        adminLogRepository.save(new AdminLog(
                admin.getId(), "WALLET_ADJUST", "USER", id,
                toJson(Map.of(
                        "direction", req.direction().toUpperCase(),
                        "amount", req.amount(),
                        "reason", req.reason(),
                        "txId", tx.getId()))));
        return new WalletTransactionResponse(
                tx.getId(), tx.getType(), tx.getAmount(), tx.getBalanceAfter(),
                tx.getReferenceType(), tx.getReferenceId(), tx.getMemo(), tx.getCreatedAt());
    }

    // 查某用戶錢包（餘額 + 最近流水）—— 給調整頁「選定用戶」時顯示
    @GetMapping("/{id}/wallet")
    public AdminUserWalletResponse getUserWallet(@PathVariable UUID id) {
        userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        BigDecimal balance = walletService.getBalance(id);
        List<WalletTransactionResponse> transactions = walletService.getTransactions(id).stream()
                .map(tx -> new WalletTransactionResponse(
                        tx.getId(), tx.getType(), tx.getAmount(), tx.getBalanceAfter(),
                        tx.getReferenceType(), tx.getReferenceId(), tx.getMemo(), tx.getCreatedAt()))
                .toList();
        return new AdminUserWalletResponse(balance, transactions);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize admin log metadata", e);
        }
    }

    private static UserRole parseRole(String role) {
        if (role == null || role.isBlank()) return null;
        return UserRole.valueOf(role.toUpperCase());
    }

    private static UserStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        return UserStatus.valueOf(status.toUpperCase());
    }
}
