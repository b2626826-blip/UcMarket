package com.ucmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.MarketService;
import com.ucmarket.service.TradeQuoteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MarketController.class)
@AutoConfigureMockMvc(addFilters = false)
class MarketControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private MarketRepository marketRepository;
    @MockitoBean private MarketService marketService;
    @MockitoBean private TradeQuoteService tradeQuoteService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserRepository userRepository;

    private static final UUID AUTH_USER_ID = UUID.randomUUID();

    @BeforeEach
    void setUpSecurityContext() {
        User user = new User("testuser", "test@test.com", "password");
        ReflectionTestUtils.setField(user, "id", AUTH_USER_ID);
        var auth = new UsernamePasswordAuthenticationToken(user, null, java.util.List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDownSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listMarkets_shouldReturnAllMarkets() throws Exception {
        Market m = createMarket(MarketStatus.ACTIVE);
        when(marketRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(m)));

        mockMvc.perform(get("/api/markets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void getMarket_shouldReturnMarket_whenFound() throws Exception {
        Market m = createMarket(MarketStatus.ACTIVE);
        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(m, "id", id);
        when(marketRepository.findById(id)).thenReturn(Optional.of(m));

        mockMvc.perform(get("/api/markets/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Title"));
    }

    @Test
    void getMarketByCode_shouldReturnMarket_whenFound() throws Exception {
        Market m = createMarket(MarketStatus.ACTIVE);
        ReflectionTestUtils.setField(m, "code", "MKT0001");
        when(marketRepository.findByCode("MKT0001")).thenReturn(Optional.of(m));

        mockMvc.perform(get("/api/markets/code/{code}", "MKT0001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("MKT0001"));
    }

    @Test
    void createMarket_shouldReturn201() throws Exception {
        CreateMarketRequest request = new CreateMarketRequest(
                "New Market", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));

        Market saved = new Market("New Market", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));
        when(marketRepository.save(any())).thenReturn(saved);

        mockMvc.perform(post("/api/markets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    void createMarket_shouldReturn400_whenValidationFails() throws Exception {
        CreateMarketRequest request = new CreateMarketRequest(
                "", "Desc", "Cat", null, null, null, null);

        mockMvc.perform(post("/api/markets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    private Market createMarket(MarketStatus status) {
        Market m = new Market("Test Title", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));
        ReflectionTestUtils.setField(m, "status", status);
        ReflectionTestUtils.setField(m, "creatorId", UUID.randomUUID());
        return m;
    }
}
