package com.ucmarket.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

class N8nWebhookEmailSenderTest {

    private static final String TOKEN = "test-webhook-token";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void send_postsJsonBodyAndTokenHeader_andAcceptsAny2xx() throws Exception {
        AtomicReference<String> requestBody = new AtomicReference<>();
        AtomicReference<String> tokenHeader = new AtomicReference<>();
        AtomicReference<String> upgradeHeader = new AtomicReference<>();

        startServer(exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            tokenHeader.set(exchange.getRequestHeaders().getFirst("X-Webhook-Token"));
            upgradeHeader.set(exchange.getRequestHeaders().getFirst("Upgrade"));
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });

        sender(serverUrl(), Duration.ofSeconds(1))
                .send("owner@example.com", "通知主旨", "通知內容");

        JsonNode body = objectMapper.readTree(requestBody.get());
        assertThat(body.get("recipientEmail").asText()).isEqualTo("owner@example.com");
        assertThat(body.get("subject").asText()).isEqualTo("通知主旨");
        assertThat(body.get("body").asText()).isEqualTo("通知內容");
        assertThat(tokenHeader.get()).isEqualTo(TOKEN);
        assertThat(upgradeHeader.get()).isNull();
    }

    @ParameterizedTest
    @ValueSource(ints = { 400, 404, 500, 503 })
    void send_non2xx_throwsRuntimeException(int status) throws Exception {
        startServer(exchange -> {
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
        });

        assertThatThrownBy(() -> sender(serverUrl(), Duration.ofSeconds(1))
                .send("owner@example.com", "subject", "body"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("HTTP " + status);
    }

    @Test
    void send_readTimeout_throwsRuntimeException() throws Exception {
        startServer(exchange -> {
            try {
                Thread.sleep(250);
                exchange.sendResponseHeaders(200, -1);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });

        assertThatThrownBy(() -> sender(serverUrl(), Duration.ofMillis(50))
                .send("owner@example.com", "subject", "body"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("timed out");
    }

    @Test
    void send_connectionFailure_throwsRuntimeException() throws Exception {
        int unusedPort;
        try (ServerSocket socket = new ServerSocket(0)) {
            unusedPort = socket.getLocalPort();
        }

        assertThatThrownBy(() -> sender(
                "http://127.0.0.1:" + unusedPort + "/notify",
                Duration.ofSeconds(1))
                .send("owner@example.com", "subject", "body"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("request failed");
    }

    @Test
    void applicationContext_workerDisabled_startsWithoutN8nSettings() {
        contextRunner()
                .withPropertyValues("notification.worker.enabled=false")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(EmailSender.class);
                });
    }

    @Test
    void applicationContext_workerEnabledWithoutWebhookUrl_failsFast() {
        contextRunner()
                .withPropertyValues(
                        "notification.worker.enabled=true",
                        "notification.n8n.webhook-url=",
                        "notification.n8n.webhook-token=" + TOKEN)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseInstanceOf(IllegalArgumentException.class)
                            .rootCause()
                            .hasMessageContaining("webhook URL");
                });
    }

    @Test
    void applicationContext_workerEnabledWithoutWebhookToken_failsFast() {
        contextRunner()
                .withPropertyValues(
                        "notification.worker.enabled=true",
                        "notification.n8n.webhook-url=http://localhost:5678/webhook/notify",
                        "notification.n8n.webhook-token=")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseInstanceOf(IllegalArgumentException.class)
                            .rootCause()
                            .hasMessageContaining("webhook token");
                });
    }

    private ApplicationContextRunner contextRunner() {
        return new ApplicationContextRunner()
                .withUserConfiguration(SenderTestConfiguration.class)
                .withPropertyValues(
                        "notification.n8n.connect-timeout-ms=1000",
                        "notification.n8n.read-timeout-ms=1000");
    }

    private N8nWebhookEmailSender sender(String url, Duration readTimeout) {
        return new N8nWebhookEmailSender(
                objectMapper,
                url,
                TOKEN,
                Duration.ofSeconds(1).toMillis(),
                readTimeout.toMillis());
    }

    private void startServer(com.sun.net.httpserver.HttpHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/notify", handler);
        server.start();
    }

    private String serverUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/notify";
    }

    @Configuration(proxyBeanMethods = false)
    @Import(N8nWebhookEmailSender.class)
    static class SenderTestConfiguration {

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }
}
