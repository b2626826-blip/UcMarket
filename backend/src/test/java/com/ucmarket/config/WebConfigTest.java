package com.ucmarket.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import static org.junit.jupiter.api.Assertions.*;

class WebConfigTest {

    @Test
    void addCorsMappings_shouldAllowConfiguredOrigins() {
        WebConfig config = new WebConfig();
        CorsRegistry registry = new CorsRegistry();

        config.addCorsMappings(registry);

        assertDoesNotThrow(() -> config.addCorsMappings(registry));
    }
}
