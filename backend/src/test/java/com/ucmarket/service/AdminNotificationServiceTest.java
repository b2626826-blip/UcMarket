package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import com.ucmarket.dto.admin.AdminNotificationResponse;
import com.ucmarket.notification.NotificationEventType;
import com.ucmarket.notification.NotificationJob;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.notification.NotificationJobStatus;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class AdminNotificationServiceTest {

    @Mock
    private NotificationJobRepository notificationJobRepository;

    @InjectMocks
    private AdminNotificationService adminNotificationService;

    @Test
    void listByStatus_returnsPagedResponseDtos() {
        var pageable = PageRequest.of(1, 2);
        NotificationJob failed = job(NotificationJobStatus.FAILED);
        when(notificationJobRepository.findByStatus(NotificationJobStatus.FAILED, pageable))
                .thenReturn(new PageImpl<>(List.of(failed), pageable, 3));

        var result = adminNotificationService.listByStatus(NotificationJobStatus.FAILED, pageable);

        assertEquals(1, result.getContent().size());
        AdminNotificationResponse response = result.getContent().get(0);
        assertEquals(failed.getId(), response.id());
        assertEquals(NotificationEventType.MARKET_SUBMITTED, response.eventType());
        assertEquals("admin@example.com", response.recipient());
        assertEquals(NotificationJobStatus.FAILED, response.status());
        assertEquals(3, response.attemptCount());
        assertEquals("smtp unavailable", response.lastError());
        assertEquals(3, result.getTotalElements());
        verify(notificationJobRepository).findByStatus(NotificationJobStatus.FAILED, pageable);
    }

    @Test
    void resend_failedJob_returnsResetJob() {
        UUID id = UUID.randomUUID();
        NotificationJob failed = job(NotificationJobStatus.FAILED);
        ReflectionTestUtils.setField(failed, "id", id);
        NotificationJob reset = job(NotificationJobStatus.RETRY);
        ReflectionTestUtils.setField(reset, "id", id);
        when(notificationJobRepository.resetForResend(eq(id), any(LocalDateTime.class))).thenReturn(1);
        when(notificationJobRepository.findById(id))
                .thenReturn(Optional.of(failed), Optional.of(reset));

        AdminNotificationResponse response = adminNotificationService.resend(id);

        assertEquals(id, response.id());
        assertEquals(NotificationJobStatus.RETRY, response.status());
        assertEquals(3, response.attemptCount());
        assertEquals("smtp unavailable", response.lastError());
        verify(notificationJobRepository).resetForResend(eq(id), any(LocalDateTime.class));
    }

    @Test
    void resend_missingJob_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(notificationJobRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> adminNotificationService.resend(id));
    }

    @Test
    void resend_nonFailedJob_throwsConflict() {
        UUID id = UUID.randomUUID();
        NotificationJob pending = job(NotificationJobStatus.PENDING);
        ReflectionTestUtils.setField(pending, "id", id);
        when(notificationJobRepository.findById(id)).thenReturn(Optional.of(pending));

        assertThrows(IllegalStateException.class, () -> adminNotificationService.resend(id));
    }

    private NotificationJob job(NotificationJobStatus status) {
        NotificationJob job = new NotificationJob(
                NotificationEventType.MARKET_SUBMITTED,
                UUID.randomUUID(),
                "admin@example.com",
                UUID.randomUUID(),
                "{}",
                "test-" + UUID.randomUUID());
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(job, "status", status);
        ReflectionTestUtils.setField(job, "attemptCount", 3);
        ReflectionTestUtils.setField(job, "lastError", "smtp unavailable");
        ReflectionTestUtils.setField(job, "createdAt", LocalDateTime.of(2026, 7, 17, 10, 0));
        ReflectionTestUtils.setField(job, "updatedAt", LocalDateTime.of(2026, 7, 17, 10, 5));
        return job;
    }
}
