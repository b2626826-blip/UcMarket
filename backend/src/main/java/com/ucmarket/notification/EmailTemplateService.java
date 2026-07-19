package com.ucmarket.notification;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class EmailTemplateService {

    private final ObjectMapper objectMapper;

    public EmailTemplateService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public EmailContent render(NotificationEventType eventType, String payload) {
        return switch (eventType) {
            case MARKET_SUBMITTED -> renderMarketSubmitted(payload);
            case MARKET_APPROVED -> renderMarketApproved(payload);
            case MARKET_REJECTED -> renderMarketRejected(payload);
            case MARKET_CHANGES_REQUESTED -> renderMarketChangesRequested(payload);
            case DAILY_PENDING_REVIEW_SUMMARY -> renderDailyPendingReviewSummary(payload);
            case MARKET_CLOSING_REMINDER -> renderMarketClosingReminder(payload);
            case MARKET_RESOLVED -> renderMarketResolved(payload);
            case PASSWORD_RESET -> renderPasswordReset(payload);
        };
    }

    private EmailContent renderPasswordReset(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String resetUrl = root.path("resetUrl").asText();
            String username = root.path("username").asText("使用者");
            int expiresInMinutes = root.path("expiresInMinutes").asInt(10);

            return new EmailContent(
                    "[UcMarket] 重設密碼",
                    """
                    您好 %s，

                    我們收到您的密碼重設請求。請於 %d 分鐘內點擊以下連結完成重設：

                    %s

                    若您沒有提出此請求，請忽略本信件，帳號密碼不會變更。
                    """.formatted(username, expiresInMinutes, resetUrl).strip());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderMarketResolved(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String marketTitle = root.path("marketTitle").asText();
            String result = root.path("result").asText();

            return new EmailContent(
                    "[UcMarket] Market resolved",
                    "Market \"%s\" was resolved as %s.".formatted(marketTitle, result));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderMarketClosingReminder(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String marketTitle = root.path("marketTitle").asText();
            String closeAt = root.path("closeAt").asText();

            return new EmailContent(
                    "[UcMarket] Market closing soon",
                    "Market \"%s\" closes at %s.".formatted(marketTitle, closeAt));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderDailyPendingReviewSummary(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String summaryDate = root.path("summaryDate").asText();
            int pendingCount = root.path("pendingCount").asInt();
            StringBuilder body = new StringBuilder(
                    "Pending review summary for %s: %s market(s) awaiting review."
                            .formatted(summaryDate, pendingCount));
            for (JsonNode market : root.path("markets")) {
                body.append("\n- ").append(market.path("marketTitle").asText());
            }

            return new EmailContent(
                    "[UcMarket] Daily pending review summary",
                    body.toString());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderMarketChangesRequested(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String marketTitle = root.path("marketTitle").asText();
            String comment = root.path("comment").asText();

            return new EmailContent(
                    "[UcMarket] Market changes requested",
                    "Changes were requested for your market \"%s\". Comment: %s"
                            .formatted(marketTitle, comment));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderMarketRejected(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String marketTitle = root.path("marketTitle").asText();
            String reason = root.path("reason").asText();

            return new EmailContent(
                    "[UcMarket] Market rejected",
                    "Your market \"%s\" was rejected. Reason: %s"
                            .formatted(marketTitle, reason));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderMarketApproved(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String marketTitle = root.path("marketTitle").asText();

            return new EmailContent(
                    "[UcMarket] Market approved",
                    "Your market \"%s\" was approved and is now active.".formatted(marketTitle));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    private EmailContent renderMarketSubmitted(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
            String marketTitle = root.path("marketTitle").asText();
            String recipientType = root.path("recipientType").asText();

            if ("CREATOR_ADMIN".equals(recipientType)) {
                return new EmailContent(
                        "[UcMarket] Market submitted and awaiting your review",
                        "Your market \"%s\" was submitted and is awaiting your review."
                                .formatted(marketTitle));
            }

            if ("ADMIN".equals(recipientType)) {
                return new EmailContent(
                        "[UcMarket] Market awaiting review",
                        "Market \"%s\" was submitted and is awaiting review."
                                .formatted(marketTitle));
            }

            return new EmailContent(
                    "[UcMarket] Market submitted",
                    "Your market \"%s\" was submitted for review.".formatted(marketTitle));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid notification payload", e);
        }
    }

    public record EmailContent(String subject, String body) {
    }
}
