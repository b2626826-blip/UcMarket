package com.ucmarket.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.admin.AdminNotificationResponse;
import com.ucmarket.notification.NotificationJob;
import com.ucmarket.notification.NotificationJobRepository;
import com.ucmarket.notification.NotificationJobStatus;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional(readOnly = true)
public class AdminNotificationService {

    private final NotificationJobRepository notificationJobRepository;

    public AdminNotificationService(NotificationJobRepository notificationJobRepository) {
        this.notificationJobRepository = notificationJobRepository;
    }

    public Page<AdminNotificationResponse> listByStatus(
            NotificationJobStatus status, Pageable pageable) {
        return notificationJobRepository.findByStatus(status, pageable)
                .map(AdminNotificationResponse::from);
    }

    @Transactional
    public AdminNotificationResponse resend(UUID id) {
        NotificationJob job = findJob(id);
        if (job.getStatus() != NotificationJobStatus.FAILED) {
            throw new IllegalStateException("Only FAILED notification jobs can be resent");
        }

        int updated = notificationJobRepository.resetForResend(id, LocalDateTime.now());
        if (updated != 1) {
            throw new IllegalStateException("Notification job is no longer FAILED");
        }
        return AdminNotificationResponse.from(findJob(id));
    }

    private NotificationJob findJob(UUID id) {
        return notificationJobRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Notification job not found: " + id));
    }
}
