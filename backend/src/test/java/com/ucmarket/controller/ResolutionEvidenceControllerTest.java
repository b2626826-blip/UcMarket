package com.ucmarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.config.SecurityConfig;
import com.ucmarket.dto.ResolutionEvidenceRequest;
import com.ucmarket.dto.ResolutionEvidenceResponse;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtAuthFilter;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.security.N8nResolutionEvidenceCandidateTokenAuthFilter;
import com.ucmarket.security.N8nResolutionEvidenceTokenAuthFilter;
import com.ucmarket.security.N8nServiceTokenAuthFilter;
import com.ucmarket.service.MarketResolutionEvidenceService;

@WebMvcTest(ResolutionEvidenceController.class)
@AutoConfigureMockMvc
@Import({
        SecurityConfig.class,
        JwtAuthFilter.class,
        N8nServiceTokenAuthFilter.class,
        N8nResolutionEvidenceTokenAuthFilter.class,
        N8nResolutionEvidenceCandidateTokenAuthFilter.class
})
class ResolutionEvidenceControllerTest {

    private static final String EVIDENCE_SERVICE_TOKEN = UUID.randomUUID().toString();
    private static final String NOTIFICATION_SERVICE_TOKEN = UUID.randomUUID().toString();

    @DynamicPropertySource
    static void evidenceServiceToken(DynamicPropertyRegistry registry) {
        registry.add("resolution-evidence.n8n.service-token", () -> EVIDENCE_SERVICE_TOKEN);
        registry.add("notification.n8n.service-token", () -> NOTIFICATION_SERVICE_TOKEN);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private MarketResolutionEvidenceService evidenceService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserRepository userRepository;

    @Test
    void submit_correctEvidenceToken_returnsDedicatedDto() throws Exception {
        UUID marketId = UUID.randomUUID();
        ResolutionEvidenceRequest request = new ResolutionEvidenceRequest(
                "https://example.com/news/1", "Objective report", Instant.parse("2026-07-20T01:00:00Z"));
        ResolutionEvidenceResponse response = response(marketId, request);
        when(evidenceService.save(eq(marketId), any())).thenReturn(response);

        mockMvc.perform(post("/api/internal/current-affairs/markets/{id}/resolution-evidence", marketId)
                        .header("X-N8N-Service-Token", EVIDENCE_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.marketId").value(marketId.toString()))
                .andExpect(jsonPath("$.sourceUrl").value(request.sourceUrl()))
                .andExpect(jsonPath("$.sourceTitle").value(request.sourceTitle()))
                .andExpect(jsonPath("$.result").doesNotExist())
                .andExpect(jsonPath("$.suggestedResult").doesNotExist())
                .andExpect(jsonPath("$.serviceToken").doesNotExist())
                .andExpect(jsonPath("$.market").doesNotExist());
    }

    @Test
    void submit_missingOrWrongEvidenceToken_returns403() throws Exception {
        UUID marketId = UUID.randomUUID();
        String body = objectMapper.writeValueAsString(request());

        mockMvc.perform(post("/api/internal/current-affairs/markets/{id}/resolution-evidence", marketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/internal/current-affairs/markets/{id}/resolution-evidence", marketId)
                        .header("X-N8N-Service-Token", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        verify(evidenceService, never()).save(any(), any());
    }

    @Test
    void evidenceToken_cannotResolveQueryNotificationsOrAccessOtherAdminApi() throws Exception {
        UUID marketId = UUID.randomUUID();

        mockMvc.perform(post("/api/admin/markets/{id}/resolve", marketId)
                        .header("X-N8N-Service-Token", EVIDENCE_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"result\":\"YES\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/notifications")
                        .header("X-N8N-Service-Token", EVIDENCE_SERVICE_TOKEN)
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/users")
                        .header("X-N8N-Service-Token", EVIDENCE_SERVICE_TOKEN))
                .andExpect(status().isForbidden());
    }

    @Test
    void notificationToken_cannotSubmitResolutionEvidence() throws Exception {
        UUID marketId = UUID.randomUUID();

        mockMvc.perform(post("/api/internal/current-affairs/markets/{id}/resolution-evidence", marketId)
                        .header("X-N8N-Service-Token", NOTIFICATION_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isForbidden());

        verify(evidenceService, never()).save(any(), any());
    }

    @Test
    void submit_nonHttpUrl_returns400() throws Exception {
        UUID marketId = UUID.randomUUID();
        ResolutionEvidenceRequest request = new ResolutionEvidenceRequest(
                "ftp://example.com/news/1", "Objective report", null);

        mockMvc.perform(post("/api/internal/current-affairs/markets/{id}/resolution-evidence", marketId)
                        .header("X-N8N-Service-Token", EVIDENCE_SERVICE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(evidenceService, never()).save(any(), any());
    }

    @Test
    void list_adminReturnsEvidenceDtos() throws Exception {
        UUID marketId = UUID.randomUUID();
        ResolutionEvidenceResponse response = response(marketId, request());
        when(evidenceService.list(marketId)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/admin/markets/{id}/resolution-evidence", marketId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].marketId").value(marketId.toString()))
                .andExpect(jsonPath("$[0].sourceUrl").value(response.sourceUrl()));
    }

    @Test
    void list_regularUserAndAnonymous_areForbidden() throws Exception {
        UUID marketId = UUID.randomUUID();

        mockMvc.perform(get("/api/admin/markets/{id}/resolution-evidence", marketId)
                        .with(user("regular").roles("USER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/markets/{id}/resolution-evidence", marketId))
                .andExpect(status().isForbidden());

        verify(evidenceService, never()).list(any());
    }

    private static ResolutionEvidenceRequest request() {
        return new ResolutionEvidenceRequest("https://example.com/news/1", "Objective report", null);
    }

    private static ResolutionEvidenceResponse response(
            UUID marketId, ResolutionEvidenceRequest request) {
        Instant now = Instant.parse("2026-07-20T02:00:00Z");
        return new ResolutionEvidenceResponse(
                UUID.randomUUID(), marketId, request.sourceUrl(), request.sourceTitle(),
                request.publishedAt(), now, now);
    }
}
