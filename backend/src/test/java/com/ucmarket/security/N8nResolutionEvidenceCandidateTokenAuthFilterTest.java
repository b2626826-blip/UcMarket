package com.ucmarket.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class N8nResolutionEvidenceCandidateTokenAuthFilterTest {

    private static final String SERVICE_TOKEN = UUID.randomUUID().toString();
    private static final String PATH =
            "/api/internal/current-affairs/resolution-evidence-candidates";

    private final N8nResolutionEvidenceCandidateTokenAuthFilter filter =
            new N8nResolutionEvidenceCandidateTokenAuthFilter(SERVICE_TOKEN);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCandidates_withMatchingToken_setsCandidateReadAuthority() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", PATH);
        request.addHeader("X-N8N-Service-Token", SERVICE_TOKEN);

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
                .extracting("authority")
                .containsExactly(N8nResolutionEvidenceCandidateTokenAuthFilter.AUTHORITY);
    }

    @Test
    void getCandidates_withWrongToken_doesNotAuthenticate() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", PATH);
        request.addHeader("X-N8N-Service-Token", UUID.randomUUID().toString());

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void postCandidates_withMatchingToken_doesNotAuthenticate() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", PATH);
        request.addHeader("X-N8N-Service-Token", SERVICE_TOKEN);

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
