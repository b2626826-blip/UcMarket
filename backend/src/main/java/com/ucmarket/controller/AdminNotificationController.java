package com.ucmarket.controller;

import java.util.Locale;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.PageResponse;
import com.ucmarket.dto.admin.AdminNotificationResponse;
import com.ucmarket.notification.NotificationJobStatus;
import com.ucmarket.service.AdminNotificationService;
import com.ucmarket.util.PageParams;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    public AdminNotificationController(AdminNotificationService adminNotificationService) {
        this.adminNotificationService = adminNotificationService;
    }

    @GetMapping
    public PageResponse<AdminNotificationResponse> listNotifications(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NotificationJobStatus statusEnum = parseStatus(status);
        return PageResponse.of(adminNotificationService.listByStatus(
                statusEnum, PageParams.of(page, size, "createdAt")));
    }

    @PostMapping("/{id}/resend")
    public AdminNotificationResponse resend(@PathVariable UUID id) {
        return adminNotificationService.resend(id);
    }

    private static NotificationJobStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("status is required");
        }
        return NotificationJobStatus.valueOf(status.toUpperCase(Locale.ROOT));
    }
}
