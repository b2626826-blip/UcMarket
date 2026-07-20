package com.ucmarket.notification;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(prefix = "notification.worker", name = "enabled", havingValue = "true")
public class N8nWebhookEmailSender implements EmailSender {

    private final ObjectMapper objectMapper;
    private final URI webhookUrl;
    private final String webhookToken;
    private final Duration readTimeout;
    private final HttpClient httpClient;

    public N8nWebhookEmailSender(
            ObjectMapper objectMapper,
            @Value("${notification.n8n.webhook-url}") String webhookUrl,
            @Value("${notification.n8n.webhook-token}") String webhookToken,
            @Value("${notification.n8n.connect-timeout-ms}") long connectTimeoutMs,
            @Value("${notification.n8n.read-timeout-ms}") long readTimeoutMs) {
        this.objectMapper = objectMapper;
        this.webhookUrl = parseWebhookUrl(webhookUrl);
        this.webhookToken = requireNonBlank(webhookToken, "n8n webhook token must not be blank");
        this.readTimeout = positiveDuration(readTimeoutMs, "n8n read timeout must be positive");
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(positiveDuration(
                        connectTimeoutMs,
                        "n8n connect timeout must be positive"))
                .build();
    }

    @Override
    public void send(String recipientEmail, String subject, String body) {
        try {
            String requestBody = objectMapper.writeValueAsString(
                    new WebhookRequest(recipientEmail, subject, body));
            HttpRequest request = HttpRequest.newBuilder(webhookUrl)
                    .timeout(readTimeout)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("X-Webhook-Token", webhookToken)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            int statusCode = httpClient
                    .send(request, HttpResponse.BodyHandlers.discarding())
                    .statusCode();

            if (statusCode < 200 || statusCode >= 300) {
                throw new RuntimeException("n8n webhook returned HTTP " + statusCode);
            }
        } catch (HttpTimeoutException e) {
            throw new RuntimeException("n8n webhook request timed out", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("n8n webhook request interrupted", e);
        } catch (IOException e) {
            throw new RuntimeException("n8n webhook request failed", e);
        }
    }

    private static URI parseWebhookUrl(String value) {
        String url = requireNonBlank(value, "n8n webhook URL must not be blank");
        URI uri;

        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("n8n webhook URL must be valid", e);
        }

        if (!"http".equalsIgnoreCase(uri.getScheme())
                && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("n8n webhook URL must use HTTP or HTTPS");
        }

        return uri;
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private static Duration positiveDuration(long milliseconds, String message) {
        if (milliseconds <= 0) {
            throw new IllegalArgumentException(message);
        }
        return Duration.ofMillis(milliseconds);
    }

    private record WebhookRequest(String recipientEmail, String subject, String body) {
    }
}
