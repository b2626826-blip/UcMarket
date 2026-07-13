package com.ucmarket.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.CreateMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketVolume;
import com.ucmarket.repository.PositionRepository;
import com.ucmarket.repository.TradeRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.MarketService;
import com.ucmarket.service.PriceHistoryService;
import com.ucmarket.service.TradeQuoteService;
import com.ucmarket.service.WalletService;

@WebMvcTest(MarketController.class)
@AutoConfigureMockMvc(addFilters = false)
class MarketControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MarketRepository marketRepository;
    @MockitoBean
    private TradeRepository tradeRepository;
    @MockitoBean
    private PositionRepository positionRepository;
    @MockitoBean
    private MarketService marketService;
    @MockitoBean
    private WalletService walletService;
    @MockitoBean
    private TradeQuoteService tradeQuoteService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private PriceHistoryService priceHistoryService;

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
        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(m, "id", id);
        m.setImageUrl("https://example.com/image.jpg");
        when(marketRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(m)));
        when(tradeRepository.findVolumesByMarketIds(any())).thenReturn(List.of(new MarketVolume() {
            @Override
            public UUID getMarketId() {
                return id;
            }

            @Override
            public BigDecimal getVolume() {
                return new BigDecimal("250.50");
            }
        }));

        mockMvc.perform(get("/api/markets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].volume").value(250.50))
                .andExpect(jsonPath("$[0].imageUrl").value("https://example.com/image.jpg"));
    }

    @Test
    void listMarkets_shouldFilterByCategory() throws Exception {
        Market market = createMarket(MarketStatus.ACTIVE);

        when(marketRepository.findByCategory(
                eq("CURRENT_AFFAIRS"),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(market)));

        mockMvc.perform(get("/api/markets")
                .param("category", "CURRENT_AFFAIRS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].volume").value(0));

        verify(marketRepository).findByCategory(
                eq("CURRENT_AFFAIRS"),
                any(Pageable.class));
    }

    @Test
    void listMarkets_shouldFilterByStatus() throws Exception {
        Market market = createMarket(MarketStatus.ACTIVE);

        when(marketRepository.findByStatus(
                eq(MarketStatus.ACTIVE),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(market)));

        mockMvc.perform(get("/api/markets")
                .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        verify(marketRepository).findByStatus(
                eq(MarketStatus.ACTIVE),
                any(Pageable.class));
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
                "New Market", "Desc", "CURRENT_AFFAIRS", null, "https://example.com/news", "https://example.com/image.jpg", null,
                LocalDateTime.now().plusDays(7));

        Market saved = new Market("New Market", "Desc", "CURRENT_AFFAIRS", null, "https://example.com/news", null,
                LocalDateTime.now().plusDays(7));
        when(marketRepository.save(any())).thenReturn(saved);

        mockMvc.perform(post("/api/markets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        ArgumentCaptor<Market> marketCaptor = ArgumentCaptor.forClass(Market.class);
        verify(marketRepository).save(marketCaptor.capture());
        assertEquals("CURRENT_AFFAIRS", marketCaptor.getValue().getCategory());
        assertEquals("https://example.com/news", marketCaptor.getValue().getSourceUrl());
        assertEquals("https://example.com/image.jpg", marketCaptor.getValue().getImageUrl());
    }

    @Test
    void createMarket_shouldReturn400_whenValidationFails() throws Exception {
        CreateMarketRequest request = new CreateMarketRequest(
                "", "Desc", "Cat", null, null, null, null, null);

        mockMvc.perform(post("/api/markets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMarket_shouldReturn400_whenSourceUrlIsMalformed() throws Exception {
        CreateMarketRequest request = new CreateMarketRequest(
                "New Market", "Desc", "CURRENT_AFFAIRS", null, "not a url", null, null,
                LocalDateTime.now().plusDays(7));

        mockMvc.perform(post("/api/markets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateMarket_shouldReturn400_whenSourceUrlIsMalformed() throws Exception {
        mockMvc.perform(put("/api/markets/{id}", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sourceUrl\":\"not a url\"}"))
                .andExpect(status().isBadRequest());
    }

    private Market createMarket(MarketStatus status) {
        Market m = new Market("Test Title", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));
        ReflectionTestUtils.setField(m, "status", status);
        ReflectionTestUtils.setField(m, "creatorId", UUID.randomUUID());
        return m;
    }

    @Test
    void listMarkets_shouldFilterByCategoryAndStatus() throws Exception {
        Market market = createMarket(MarketStatus.ACTIVE);

        when(marketRepository.findByCategoryAndStatus(
                eq("CURRENT_AFFAIRS"),
                eq(MarketStatus.ACTIVE),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(market)));

        mockMvc.perform(get("/api/markets")
                .param("category", "CURRENT_AFFAIRS")
                .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        verify(marketRepository).findByCategoryAndStatus(
                eq("CURRENT_AFFAIRS"),
                eq(MarketStatus.ACTIVE),
                any(Pageable.class));
    }
}
