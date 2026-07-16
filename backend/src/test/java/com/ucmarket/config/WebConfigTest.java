package com.ucmarket.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class WebConfigTest {

    @Test
    void addCorsMappings_shouldAllowConfiguredOrigins() {
        WebConfig config = new WebConfig();
        ReflectionTestUtils.setField(
                config,
                "allowedOrigins",
                "http://localhost:5173,http://localhost:3000"
        );
        CorsRegistry registry = new CorsRegistry();

        config.addCorsMappings(registry);

        Map<String, CorsConfiguration> corsConfigurations =
                ReflectionTestUtils.invokeMethod(registry, "getCorsConfigurations");
        CorsConfiguration apiConfiguration = corsConfigurations.get("/api/**");

        assertNotNull(apiConfiguration);
        assertEquals(
                List.of("http://localhost:5173", "http://localhost:3000"),
                apiConfiguration.getAllowedOrigins()
        );
    }
}
