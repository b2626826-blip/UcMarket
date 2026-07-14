package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.admin.AdminUserResponse;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
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
}
