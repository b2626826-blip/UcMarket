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
        };
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
