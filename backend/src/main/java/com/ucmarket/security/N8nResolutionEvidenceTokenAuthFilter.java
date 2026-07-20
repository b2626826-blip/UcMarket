package com.ucmarket.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class N8nResolutionEvidenceTokenAuthFilter extends OncePerRequestFilter {

    public static final String AUTHORITY = "N8N_RESOLUTION_EVIDENCE_WRITE";
    private static final String HEADER_NAME = "X-N8N-Service-Token";
    private static final String PATH_PREFIX = "/api/internal/current-affairs/markets/";
    private static final String PATH_SUFFIX = "/resolution-evidence";

    private final String serviceToken;

    public N8nResolutionEvidenceTokenAuthFilter(
            @Value("${resolution-evidence.n8n.service-token:}") String serviceToken) {
        this.serviceToken = serviceToken;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !"POST".equals(request.getMethod())
                || !path.startsWith(PATH_PREFIX)
                || !path.endsWith(PATH_SUFFIX);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null
                && matches(request.getHeader(HEADER_NAME))) {
            var authority = new SimpleGrantedAuthority(AUTHORITY);
            var authentication = new UsernamePasswordAuthenticationToken(
                    "n8n-resolution-evidence", null, List.of(authority));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        chain.doFilter(request, response);
    }

    private boolean matches(String presentedToken) {
        if (serviceToken == null || serviceToken.isBlank()
                || presentedToken == null || presentedToken.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                serviceToken.getBytes(StandardCharsets.UTF_8),
                presentedToken.getBytes(StandardCharsets.UTF_8));
    }
}
