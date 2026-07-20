package com.ucmarket.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class N8nServiceTokenAuthFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void emptyOrBlankConfiguredTokenNeverAuthenticates() throws Exception {
        for (String configuredToken : List.of("", " ")) {
            N8nServiceTokenAuthFilter filter = new N8nServiceTokenAuthFilter(configuredToken);
            MockHttpServletRequest request = new MockHttpServletRequest(
                    "GET", "/api/admin/notifications");
            request.setServletPath("/api/admin/notifications");
            request.setParameter("status", "FAILED");
            request.addHeader("X-N8N-Service-Token", configuredToken);

            filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        }
    }
}
