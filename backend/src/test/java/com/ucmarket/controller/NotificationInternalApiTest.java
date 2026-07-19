package com.ucmarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.ucmarket.dto.internal.ClosingMarketResponse;
import com.ucmarket.dto.internal.DigestResponse;
import com.ucmarket.dto.internal.FailedNotificationsResponse;
import com.ucmarket.exception.GlobalExceptionHandler;
import com.ucmarket.security.ServiceTokenFilter;
import com.ucmarket.service.NotificationQueryService;

// 關卡 3 契約測試（spec §3 驗證項）：token 把關 401、參數驗證 400、回傳 JSON 形狀。
// standalone MockMvc——刻意不載 SecurityConfig：token 檢查是 servlet filter 層的責任，
// 在 SecurityConfig 放行 /api/internal/** 之前就必須成立（fail-closed）。
class NotificationInternalApiTest {

    private static final String TOKEN = "test-service-token";

    private NotificationQueryService queryService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        queryService = mock(NotificationQueryService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new NotificationInternalController(queryService))
                .addFilters(new ServiceTokenFilter(TOKEN))
                .setControllerAdvice(new GlobalExceptionHandler())
                // standalone 預設 converter 會把 LocalDate 寫成 [y,m,d] 陣列；
                // 關 WRITE_DATES_AS_TIMESTAMPS 對齊 Spring Boot production 的 ISO 字串契約
                .setMessageConverters(new MappingJackson2HttpMessageConverter(
                        Jackson2ObjectMapperBuilder.json()
                                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                                .build()))
                .build();
    }

    @Test
    void digest_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/internal/notifications/digest"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void digest_withWrongToken_returns401() throws Exception {
        mockMvc.perform(get("/api/internal/notifications/digest")
                        .header(ServiceTokenFilter.HEADER, "wrong-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void digest_withValidToken_returnsContractShape() throws Exception {
        when(queryService.digest(any(LocalDate.class))).thenReturn(new DigestResponse(
                LocalDate.of(2026, 7, 14), 3, 1, 42, new BigDecimal("12500.00")));

        mockMvc.perform(get("/api/internal/notifications/digest")
                        .param("date", "2026-07-14")
                        .header(ServiceTokenFilter.HEADER, TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-07-14"))
                .andExpect(jsonPath("$.newMarketCount").value(3))
                .andExpect(jsonPath("$.pendingReviewCount").value(1))
                .andExpect(jsonPath("$.tradeCount").value(42))
                .andExpect(jsonPath("$.tradeVolume").value(12500.00));
    }

    @Test
    void digest_withInvalidDate_returns400() throws Exception {
        mockMvc.perform(get("/api/internal/notifications/digest")
                        .param("date", "not-a-date")
                        .header(ServiceTokenFilter.HEADER, TOKEN))
                .andExpect(status().isBadRequest());
    }

    @Test
    void closingMarkets_withValidToken_returnsArray() throws Exception {
        UUID marketId = UUID.randomUUID();
        when(queryService.closingMarkets(anyInt())).thenReturn(List.of(
                new ClosingMarketResponse(marketId, "世足冠軍",
                        LocalDateTime.of(2026, 7, 16, 9, 0), "harry01")));

        mockMvc.perform(get("/api/internal/notifications/closing-markets")
                        .param("withinHours", "24")
                        .header(ServiceTokenFilter.HEADER, TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].marketId").value(marketId.toString()))
                .andExpect(jsonPath("$[0].title").value("世足冠軍"))
                .andExpect(jsonPath("$[0].creatorName").value("harry01"));
    }

    @Test
    void failedNotifications_withValidToken_returnsContractShape() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(queryService.failedNotifications(anyInt())).thenReturn(new FailedNotificationsResponse(
                2, List.of(new FailedNotificationsResponse.FailedNotificationItem(
                        jobId, "MARKET_SUBMITTED", "admin@test.local", "connect timeout",
                        LocalDateTime.of(2026, 7, 19, 10, 0)))));

        mockMvc.perform(get("/api/internal/notifications/failed")
                        .header(ServiceTokenFilter.HEADER, TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.recent[0].id").value(jobId.toString()))
                .andExpect(jsonPath("$.recent[0].eventType").value("MARKET_SUBMITTED"))
                .andExpect(jsonPath("$.recent[0].lastError").value("connect timeout"));
    }

    @Test
    void failedNotifications_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/internal/notifications/failed"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void closingMarkets_withNonPositiveWindow_returns400() throws Exception {
        mockMvc.perform(get("/api/internal/notifications/closing-markets")
                        .param("withinHours", "0")
                        .header(ServiceTokenFilter.HEADER, TOKEN))
                .andExpect(status().isBadRequest());
    }

    @Test
    void failClosed_whenTokenNotConfigured_everythingIs401() throws Exception {
        MockMvc unconfigured = MockMvcBuilders
                .standaloneSetup(new NotificationInternalController(queryService))
                .addFilters(new ServiceTokenFilter(""))
                .build();

        unconfigured.perform(get("/api/internal/notifications/digest")
                        .header(ServiceTokenFilter.HEADER, "anything"))
                .andExpect(status().isUnauthorized());
    }
}
