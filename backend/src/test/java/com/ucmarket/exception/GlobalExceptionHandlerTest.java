package com.ucmarket.exception;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handleBadRequest_shouldReturn400() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleBadRequest(new IllegalArgumentException("bad arg"));

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertEquals("bad arg", resp.getBody().get("message"));
    }

    @Test
    void handleConflict_shouldReturn409() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleConflict(new IllegalStateException("conflict"));

        assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
        assertEquals("conflict", resp.getBody().get("message"));
    }

    @Test
    void handleNotFound_shouldReturn404() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleNotFound(new EntityNotFoundException("not found"));

        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        assertEquals("not found", resp.getBody().get("message"));
    }

    @Test
    void handleAuth_shouldReturn401() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleAuth(new AuthenticationException("bad") {});

        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
        assertEquals("Unauthorized", resp.getBody().get("message"));
    }

    @Test
    void handleForbidden_shouldReturn403() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleForbidden(new AccessDeniedException("denied"));

        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertEquals("Forbidden", resp.getBody().get("message"));
    }

    @Test
    void handleResponseStatus_shouldReturnCorrectStatus() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleResponseStatus(new ResponseStatusException(HttpStatus.NOT_FOUND, "Market not found"));

        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        assertEquals("Market not found", resp.getBody().get("message"));
    }

    @Test
    void handleGeneral_shouldReturn500() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleGeneral(new RuntimeException("unexpected"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resp.getStatusCode());
        assertEquals("Internal server error", resp.getBody().get("message"));
    }

    @Test
    void handleValidation_shouldReturn400() {
        BindingResult bindingResult = mock(BindingResult.class);
        when(bindingResult.getFieldErrors()).thenReturn(
                java.util.List.of(new FieldError("obj", "field1", "must not be blank"))
        );
        MethodArgumentNotValidException ex =
                new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<Map<String, Object>> resp = handler.handleValidation(ex);

        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        String message = (String) resp.getBody().get("message");
        assertTrue(message.contains("field1"));
        assertTrue(message.contains("must not be blank"));
    }

    @Test
    void response_shouldContainCorrectFields() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleBadRequest(new IllegalArgumentException("test"));

        Map<String, Object> body = resp.getBody();
        assertNotNull(body);
        assertTrue(body.containsKey("timestamp"));
        assertTrue(body.containsKey("status"));
        assertTrue(body.containsKey("error"));
        assertTrue(body.containsKey("message"));
        assertEquals(400, body.get("status"));
        assertEquals("Bad Request", body.get("error"));
    }

    @Test
    void handleWalletNotFound_shouldReturn404() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleWalletNotFound(new WalletNotFoundException(UUID.randomUUID()));

        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        assertEquals(404, resp.getBody().get("status"));
    }

    @Test
    void handleInsufficientFunds_shouldReturn422() {
        ResponseEntity<Map<String, Object>> resp = handler.handleInsufficientFunds(
                new InsufficientFundsException(UUID.randomUUID(), new BigDecimal("100"), new BigDecimal("10")));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, resp.getStatusCode());
        assertEquals(422, resp.getBody().get("status"));
    }
}
