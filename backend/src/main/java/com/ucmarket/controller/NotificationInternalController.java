package com.ucmarket.controller;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.internal.ClosingMarketResponse;
import com.ucmarket.dto.internal.DigestResponse;
import com.ucmarket.dto.internal.FailedNotificationsResponse;
import com.ucmarket.service.NotificationQueryService;

// n8n 專用唯讀內部 API（02 每日摘要／03 截止提醒的資料源）。
// 認證走 ServiceTokenFilter 的 X-Service-Token，不走使用者 JWT。
// IllegalArgumentException 由 GlobalExceptionHandler 統一映射為 400。
@RestController
@RequestMapping("/api/internal/notifications")
public class NotificationInternalController {

    private final NotificationQueryService queryService;

    public NotificationInternalController(NotificationQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/digest")
    public DigestResponse digest(@RequestParam(required = false) String date) {
        return queryService.digest(parseDateOrYesterday(date));
    }

    @GetMapping("/closing-markets")
    public List<ClosingMarketResponse> closingMarkets(
            @RequestParam(defaultValue = "24") int withinHours) {
        if (withinHours <= 0) {
            throw new IllegalArgumentException("withinHours must be positive");
        }
        return queryService.closingMarkets(withinHours);
    }

    @GetMapping("/failed")
    public FailedNotificationsResponse failedNotifications(
            @RequestParam(defaultValue = "5") int recentLimit) {
        if (recentLimit <= 0 || recentLimit > 50) {
            throw new IllegalArgumentException("recentLimit must be between 1 and 50");
        }
        return queryService.failedNotifications(recentLimit);
    }

    private static LocalDate parseDateOrYesterday(String date) {
        if (date == null || date.isBlank()) {
            return LocalDate.now().minusDays(1);
        }
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("invalid date: " + date);
        }
    }
}
