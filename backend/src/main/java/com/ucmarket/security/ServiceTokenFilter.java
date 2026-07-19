package com.ucmarket.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// 機器對機器(service-to-service)認證：/api/internal/** 一律驗 X-Service-Token 標頭。
// 與使用者 JWT 完全分離——n8n 排程呼叫端只需一把固定 token，不用維護登入/續期。
// fail-closed：service.token 未設定時所有 internal 請求都 401，不會裸奔。
// 注意：Spring Boot 會把 Filter bean 自動註冊為 servlet filter（先於 security chain），
// 所以 token 檢查在 SecurityConfig 放行 /api/internal/** 之前就已生效。
@Component
public class ServiceTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Service-Token";

    private final String expectedToken;

    public ServiceTokenFilter(@Value("${service.token:}") String expectedToken) {
        this.expectedToken = expectedToken;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/internal/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String provided = request.getHeader(HEADER);
        if (expectedToken.isBlank() || provided == null || !constantTimeEquals(expectedToken, provided)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"status\":401,\"message\":\"invalid service token\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    // 常數時間比較：比對耗時不隨「猜對前綴長度」變化，杜絕計時側信道(timing attack)
    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
