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
            String marketTitle = root.path("marketTitle").asText();

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