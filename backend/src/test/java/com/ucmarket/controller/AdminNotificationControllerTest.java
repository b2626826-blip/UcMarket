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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.config.SecurityConfig;
import com.ucmarket.dto.admin.AdminNotificationResponse;
import com.ucmarket.entity.User;
import com.ucmarket.entity.UserRole;
import com.ucmarket.entity.UserStatus;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJobStatus;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtAuthFilter;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.security.N8nResolutionEvidenceCandidateTokenAuthFilter;
import com.ucmarket.security.N8nServiceTokenAuthFilter;
import com.ucmarket.security.N8nResolutionEvidenceTokenAuthFilter;
import com.ucmarket.service.AdminNotificationService;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(AdminNotificationController.class)
@AutoConfigureMockMvc
@Import({
        SecurityConfig.class,
        JwtAuthFilter.class,
        N8nServiceTokenAuthFilter.class,
        N8nResolutionEvidenceTokenAuthFilter.class,
        N8nResolutionEvidenceCandidateTokenAuthFilter.class
})
class AdminNotificationControllerTest {

    private static final String N8N_SERVICE_TOKEN = UUID.randomUUID().toString();

    @DynamicPropertySource
    static void n8nServiceToken(DynamicPropertyRegistry registry) {
        registry.add("notification.n8n.service-token", () -> N8N_SERVICE_TOKEN);
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminNotificationService adminNotificationService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserRepository userRepository;

    @Test
    void listNotifications_adminReturnsPagedDto() throws Exception {
        AdminNotificationResponse response = response(NotificationJobStatus.FAILED);
        when(adminNotificationService.listByStatus(eq(NotificationJobStatus.FAILED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(response), PageRequest.of(1, 2), 3));

        mockMvc.perform(get("/api/admin/notifications")
                        .with(user("admin").roles("ADMIN"))
                        .param("status", "failed")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(response.id().toString()))
                .andExpect(jsonPath("$.content[0].eventType").value("MARKET_SUBMITTED"))
                .andExpect(jsonPath("$.content[0].recipient").value("admin@example.com"))
                .andExpect(jsonPath("$.content[0].status").value("FAILED"))
                .andExpect(jsonPath("$.content[0].attemptCount").value(3))
                .andExpect(jsonPath("$.content[0].nextAttemptAt").exists())
                .andExpect(jsonPath("$.content[0].createdAt").exists())
                .andExpect(jsonPath("$.content[0].updatedAt").exists())
                .andExpect(jsonPath("$.content[0].lastError").value("smtp unavailable"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3));

        verify(adminNotificationService).listByStatus(
                eq(NotificationJobStatus.FAILED), any(Pageable.class));
    }

    @Test
    void adminJwt_getAndPostBehaviorRemainsAuthorized() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        String jwt = "admin-jwt";
        User admin = new User("admin", "admin@example.com", "password");
        ReflectionTestUtils.setField(admin, "id", adminId);
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        ReflectionTestUtils.setField(admin, "status", UserStatus.ACTIVE);
        AdminNotificationResponse response = response(NotificationJobStatus.RETRY);

        when(jwtTokenProvider.validateToken(jwt)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(jwt)).thenReturn(adminId);
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(adminNotificationService.listByStatus(
                eq(NotificationJobStatus.FAILED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(adminNotificationService.resend(notificationId)).thenReturn(response);

        mockMvc.perform(get("/api/admin/notifications")
                        .header("Authorization", "Bearer " + jwt)
                        .param("status", "FAILED"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/admin/notifications/{id}/resend", notificationId)
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());

        verify(adminNotificationService).listByStatus(
                eq(NotificationJobStatus.FAILED), any(Pageable.class));
        verify(adminNotificationService).resend(notificationId);
    }

    @Test
    void listNotifications_n8nServiceTokenReturns200() throws Exception {
        when(adminNotificationService.listByStatus(eq(NotificationJobStatus.FAILED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/admin/notifications")
                        .header("X-N8N-Service-Token", N8N_SERVICE_TOKEN)
                        .param("status", "FAILED"))
                .andExpect(status().isOk());

        verify(adminNotificationService).listByStatus(
                eq(NotificationJobStatus.FAILED), any(Pageable.class));
    }

    @Test
    void listNotifications_missingOrWrongServiceTokenReturns403() throws Exception {
        mockMvc.perform(get("/api/admin/notifications")
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/notifications")
                        .header("X-N8N-Service-Token", UUID.randomUUID().toString())
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());

        verify(adminNotificationService, never()).listByStatus(any(), any());
    }

    @Test
    void listNotifications_n8nServiceTokenCannotQueryOtherStatuses() throws Exception {
        mockMvc.perform(get("/api/admin/notifications")
                        .header("X-N8N-Service-Token", N8N_SERVICE_TOKEN)
                        .param("status", "SENT"))
                .andExpect(status().isForbidden());

        verify(adminNotificationService, never()).listByStatus(any(), any());
    }

    @Test
    void n8nServiceToken_cannotResendOrAccessOtherAdminApi() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(post("/api/admin/notifications/{id}/resend", id)
                        .header("X-N8N-Service-Token", N8N_SERVICE_TOKEN))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/users")
                        .header("X-N8N-Service-Token", N8N_SERVICE_TOKEN))
                .andExpect(status().isForbidden());

        verify(adminNotificationService, never()).resend(any());
    }

    @Test
    void listNotifications_invalidStatusReturns400() throws Exception {
        mockMvc.perform(get("/api/admin/notifications")
                        .with(user("admin").roles("ADMIN"))
                        .param("status", "unknown"))
                .andExpect(status().isBadRequest());

        verify(adminNotificationService, never()).listByStatus(any(), any());
    }

    @Test
    void listNotifications_missingStatusReturns400() throws Exception {
        mockMvc.perform(get("/api/admin/notifications")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());

        verify(adminNotificationService, never()).listByStatus(any(), any());
    }

    @Test
    void resend_adminReturnsResetJob() throws Exception {
        AdminNotificationResponse response = response(NotificationJobStatus.RETRY);
        when(adminNotificationService.resend(response.id())).thenReturn(response);

        mockMvc.perform(post("/api/admin/notifications/{id}/resend", response.id())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(response.id().toString()))
                .andExpect(jsonPath("$.status").value("RETRY"))
                .andExpect(jsonPath("$.attemptCount").value(3))
                .andExpect(jsonPath("$.lastError").value("smtp unavailable"));
    }

    @Test
    void resend_missingJobReturns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(adminNotificationService.resend(id))
                .thenThrow(new EntityNotFoundException("Notification job not found: " + id));

        mockMvc.perform(post("/api/admin/notifications/{id}/resend", id)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void resend_nonFailedJobReturns409() throws Exception {
        UUID id = UUID.randomUUID();
        when(adminNotificationService.resend(id))
                .thenThrow(new IllegalStateException("Only FAILED notification jobs can be resent"));

        mockMvc.perform(post("/api/admin/notifications/{id}/resend", id)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isConflict());
    }

    @Test
    void adminNotificationEndpoints_userReturns403() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(get("/api/admin/notifications")
                        .with(user("regular").roles("USER"))
                        .param("status", "FAILED"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/notifications/{id}/resend", id)
                        .with(user("regular").roles("USER")))
                .andExpect(status().isForbidden());

        verify(adminNotificationService, never()).listByStatus(any(), any());
        verify(adminNotificationService, never()).resend(any());
    }

    private AdminNotificationResponse response(NotificationJobStatus status) {
        return new AdminNotificationResponse(
                UUID.randomUUID(),
                NotificationEventType.MARKET_SUBMITTED,
                "admin@example.com",
                status,
                3,
                LocalDateTime.of(2026, 7, 17, 10, 10),
                null,
                LocalDateTime.of(2026, 7, 17, 10, 0),
                LocalDateTime.of(2026, 7, 17, 10, 5),
                null,
                "smtp unavailable");
    }
}
