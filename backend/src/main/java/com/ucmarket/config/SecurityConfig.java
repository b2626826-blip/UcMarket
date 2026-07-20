package com.ucmarket.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.ucmarket.security.JwtAuthFilter;
import com.ucmarket.security.N8nResolutionEvidenceCandidateTokenAuthFilter;
import com.ucmarket.security.N8nServiceTokenAuthFilter;
import com.ucmarket.security.N8nResolutionEvidenceTokenAuthFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final N8nServiceTokenAuthFilter n8nServiceTokenAuthFilter;
    private final N8nResolutionEvidenceTokenAuthFilter n8nResolutionEvidenceTokenAuthFilter;
    private final N8nResolutionEvidenceCandidateTokenAuthFilter
            n8nResolutionEvidenceCandidateTokenAuthFilter;

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            N8nServiceTokenAuthFilter n8nServiceTokenAuthFilter,
            N8nResolutionEvidenceTokenAuthFilter n8nResolutionEvidenceTokenAuthFilter,
            N8nResolutionEvidenceCandidateTokenAuthFilter
                    n8nResolutionEvidenceCandidateTokenAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.n8nServiceTokenAuthFilter = n8nServiceTokenAuthFilter;
        this.n8nResolutionEvidenceTokenAuthFilter = n8nResolutionEvidenceTokenAuthFilter;
        this.n8nResolutionEvidenceCandidateTokenAuthFilter =
                n8nResolutionEvidenceCandidateTokenAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password",
                        "/api/auth/refresh",
                        "/api/auth/oauth/**").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/markets/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/markets/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/current-affairs/markets").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/rankings/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/admin/notifications")
                    .hasAnyAuthority("ROLE_ADMIN", N8nServiceTokenAuthFilter.AUTHORITY)
                .requestMatchers(
                        HttpMethod.POST,
                        "/api/internal/current-affairs/markets/*/resolution-evidence")
                    .hasAuthority(N8nResolutionEvidenceTokenAuthFilter.AUTHORITY)
                .requestMatchers(
                        HttpMethod.GET,
                        "/api/internal/current-affairs/resolution-evidence-candidates")
                    .hasAuthority(N8nResolutionEvidenceCandidateTokenAuthFilter.AUTHORITY)
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(n8nServiceTokenAuthFilter, JwtAuthFilter.class)
            .addFilterAfter(n8nResolutionEvidenceTokenAuthFilter, N8nServiceTokenAuthFilter.class)
            .addFilterAfter(
                    n8nResolutionEvidenceCandidateTokenAuthFilter,
                    N8nResolutionEvidenceTokenAuthFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
