package com.ucmarket.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.config.SecurityConfig;
import com.ucmarket.dto.ResolutionEvidenceCandidateResponse;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtAuthFilter;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.security.N8nResolutionEvidenceCandidateTokenAuthFilter;
import com.ucmarket.security.N8nResolutionEvidenceTokenAuthFilter;
import com.ucmarket.security.N8nServiceTokenAuthFilter;
import com.ucmarket.service.ResolutionEvidenceCandidateService;

@WebMvcTest(ResolutionEvidenceCandidateController.class)
@AutoConfigureMockMvc
@Import({
        SecurityConfig.class,
        JwtAuthFilter.class,
        N8nServiceTokenAuthFilter.class,
        N8nResolutionEvidenceTokenAuthFilter.class,
        N8nResolutionEvidenceCandidateTokenAuthFilter.class
})
class ResolutionEvidenceCandidateControllerTest {

    private static final String PATH =
            "/api/internal/current-affairs/resolution-evidence-candidates";
    private static final String CANDIDATE_TOKEN = UUID.randomUUID().toString();
    private static final String EVIDENCE_TOKEN = UUID.randomUUID().toString();
    private static final String NOTIFICATION_TOKEN = UUID.randomUUID().toString();

    @DynamicPropertySource
    static void serviceTokens(DynamicPropertyRegistry registry) {
        registry.add(
                "resolution-evidence-candidates.n8n.service-token",
                () -> CANDIDATE_TOKEN);
        registry.add("resolution-evidence.n8n.service-token", () -> EVIDENCE_TOKEN);
        registry.add("notification.n8n.service-token", () -> NOTIFICATION_TOKEN);
    }

    @Autowired private MockMvc mockMvc;

    @MockitoBean private ResolutionEvidenceCandidateService candidateService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserRepository userRepository;

    @Test
    void list_candidateToken_returnsOnlyDedicatedDtoFieldsAndPagination() throws Exception {
        UUID marketId = UUID.randomUUID();
        ResolutionEvidenceCandidateResponse candidate =
                new ResolutionEvidenceCandidateResponse(
                        marketId,
                        "Candidate title",
                        "https://example.com/source",
                        "Resolve according to source",
                        LocalDateTime.of(2026, 7, 20, 12, 0));
        when(candidateService.findCandidates(2, 10))
                .thenReturn(new PageImpl<>(List.of(candidate), PageRequest.of(2, 10), 21));

        mockMvc.perform(get(PATH)
                        .header("X-N8N-Service-Token", CANDIDATE_TOKEN)
                        .param("page", "2")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].length()").value(5))
                .andExpect(jsonPath("$.content[0].marketId").value(marketId.toString()))
                .andExpect(jsonPath("$.content[0].title").value("Candidate title"))
                .andExpect(jsonPath("$.content[0].sourceUrl").value("https://example.com/source"))
                .andExpect(jsonPath("$.content[0].resolutionRule").value("Resolve according to source"))
                .andExpect(jsonPath("$.content[0].closeAt").value("2026-07-20T12:00:00"))
                .andExpect(jsonPath("$.content[0].result").doesNotExist())
                .andExpect(jsonPath("$.content[0].suggestedResult").doesNotExist())
                .andExpect(jsonPath("$.content[0].credential").doesNotExist())
                .andExpect(jsonPath("$.content[0].token").doesNotExist())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(21));
    }

    @Test
    void list_nonCandidateCredentials_areForbidden() throws Exception {
        mockMvc.perform(get(PATH)
                        .header("X-N8N-Service-Token", NOTIFICATION_TOKEN))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(PATH)
                        .header("X-N8N-Service-Token", EVIDENCE_TOKEN))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(PATH).with(user("admin").roles("ADMIN")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(PATH).with(user("regular").roles("USER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(PATH))
                .andExpect(status().isForbidden());

        verify(candidateService, never()).findCandidates(
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void candidateToken_cannotWriteEvidenceResolveOrAccessAdminApis() throws Exception {
        UUID marketId = UUID.randomUUID();

        mockMvc.perform(post("/api/internal/current-affairs/markets/{id}/resolution-evidence", marketId)
                        .header("X-N8N-Service-Token", CANDIDATE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sourceUrl": "https://example.com/source",
                                  "sourceTitle": "Objective source"
                                }
                                """))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/markets/{id}/resolve", marketId)
                        .header("X-N8N-Service-Token", CANDIDATE_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"result\":\"YES\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/markets/{id}/resolution-evidence", marketId)
                        .header("X-N8N-Service-Token", CANDIDATE_TOKEN))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/notifications")
                        .header("X-N8N-Service-Token", CANDIDATE_TOKEN)
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());
    }
}
