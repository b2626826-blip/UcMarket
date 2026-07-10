package com.ucmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.dto.admin.MarketSummaryItem;
import com.ucmarket.dto.admin.ReviewMarketRequest;
import com.ucmarket.dto.ResolveMarketRequest;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.User;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketReviewRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.AdminDashboardService;
import com.ucmarket.service.MarketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminMarketController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminMarketControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private MarketService marketService;
    @MockitoBean private AdminDashboardService adminDashboardService;
    @MockitoBean private MarketRepository marketRepository;
    @MockitoBean private MarketReviewRepository marketReviewRepository;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserRepository userRepository;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = new User("admin", "admin@test.com", "encoded");
        ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());

        var auth = new UsernamePasswordAuthenticationToken(
                adminUser, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private Market createMarket() {
        Market m = new Market("Title", "Desc", "Cat", null, null, null, LocalDateTime.now().plusDays(7));
        ReflectionTestUtils.setField(m, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(m, "status", MarketStatus.PENDING);
        ReflectionTestUtils.setField(m, "creatorId", UUID.randomUUID());
        return m;
    }

    @Test
    void listMarkets_shouldReturnSummaryAndMarkets() throws Exception {
        List<MarketSummaryItem> summary = List.of(
                new MarketSummaryItem("全部事件", 1L, "primary")
        );
        List<Market> markets = List.of(createMarket());

        when(adminDashboardService.getMarketSummary()).thenReturn(summary);
        when(marketRepository.findAll()).thenReturn(markets);

        mockMvc.perform(get("/api/admin/markets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").isArray())
                .andExpect(jsonPath("$.markets").isArray())
                .andExpect(jsonPath("$.summary[0].label").value("全部事件"));
    }

    @Test
    void approveMarket_shouldReturn200() throws Exception {
        Market market = createMarket();
        when(marketService.approveMarket(any(UUID.class), any(UUID.class))).thenReturn(market);

        mockMvc.perform(post("/api/admin/markets/{id}/approve", market.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(market.getId().toString()));
    }

    @Test
    void rejectMarket_shouldReturn200() throws Exception {
        Market market = createMarket();
        ReviewMarketRequest request = new ReviewMarketRequest("Invalid source");
        when(marketService.rejectMarket(any(UUID.class), any(UUID.class), anyString())).thenReturn(market);

        mockMvc.perform(post("/api/admin/markets/{id}/reject", market.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void rejectMarket_shouldReturn400_whenNoComment() throws Exception {
        Market market = createMarket();
        String body = "{}";

        mockMvc.perform(post("/api/admin/markets/{id}/reject", market.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requestChanges_shouldReturn200() throws Exception {
        Market market = createMarket();
        ReviewMarketRequest request = new ReviewMarketRequest("Please add sources");
        when(marketService.requestChanges(any(UUID.class), any(UUID.class), anyString())).thenReturn(market);

        mockMvc.perform(post("/api/admin/markets/{id}/request-changes", market.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void resolveMarket_shouldReturn200() throws Exception {
        Market market = createMarket();
        ReflectionTestUtils.setField(market, "status", MarketStatus.ACTIVE);
        ResolveMarketRequest request = new ResolveMarketRequest(MarketResult.YES);
        when(marketService.resolveMarket(any(UUID.class), any(UUID.class), any())).thenReturn(market);

        mockMvc.perform(post("/api/admin/markets/{id}/resolve", market.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void resolveMarket_shouldReturn400_whenNoResult() throws Exception {
        Market market = createMarket();
        String body = "{}";

        mockMvc.perform(post("/api/admin/markets/{id}/resolve", market.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }
}
