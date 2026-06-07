package com.ucmarket.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.auth.AuthResponse;
import com.ucmarket.dto.auth.AuthResponse.UserInfo;
import com.ucmarket.dto.auth.LoginRequest;
import com.ucmarket.dto.auth.RegisterRequest;
import com.ucmarket.entity.User;
import com.ucmarket.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserInfo> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserInfo info = authService.getCurrentUser(user.getId());
        return ResponseEntity.ok(info);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal User user) {
        if (user != null) {
            authService.logout(user.getId().toString());
        }
        return ResponseEntity.noContent().build();
    }
}
