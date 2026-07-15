package com.ucmarket.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.WalletTransactionResponse;
import com.ucmarket.dto.admin.AdminUserResponse;
import com.ucmarket.dto.admin.AdminUserWalletResponse;
import com.ucmarket.dto.admin.AdminWalletAdjustRequest;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.entity.WalletTransaction;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.service.WalletService;

import jakarta.persistence.EntityNotFoundException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final WalletService walletService;

    public AdminUserController(UserRepository userRepository, WalletService walletService) {
        this.userRepository = userRepository;
        this.walletService = walletService;
    }

    @GetMapping
    public List<AdminUserResponse> listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        if (role != null && status != null) {
            return userRepository.findByRole(UserRole.valueOf(role.toUpperCase())).stream()
                    .filter(u -> u.getStatus() == UserStatus.valueOf(status.toUpperCase()))
                    .map(AdminUserResponse::from)
                    .toList();
        }
        if (role != null) {
            return userRepository.findByRole(UserRole.valueOf(role.toUpperCase())).stream()
                    .map(AdminUserResponse::from).toList();
        }
        if (status != null) {
            return userRepository.findByStatus(UserStatus.valueOf(status.toUpperCase())).stream()
                    .map(AdminUserResponse::from).toList();
        }
        return userRepository.findAll().stream().map(AdminUserResponse::from).toList();
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<AdminUserResponse> suspendUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        user.changeStatus(UserStatus.BANNED);
        userRepository.save(user);
        return ResponseEntity.ok(AdminUserResponse.from(user));
    }

    @PostMapping("/{id}/unsuspend")
    public ResponseEntity<AdminUserResponse> unsuspendUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        user.changeStatus(UserStatus.ACTIVE);
        userRepository.save(user);
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
}
