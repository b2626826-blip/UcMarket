package com.ucmarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.config.SecurityConfig;
import com.ucmarket.dto.CurrentAffairsMarketResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.CurrentAffairsMarketRepository;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtAuthFilter;
import com.ucmarket.security.JwtTokenProvider;

@WebMvcTest(CurrentAffairsMarketController.class)
@AutoConfigureMockMvc
@Import({ SecurityConfig.class, JwtAuthFilter.class })
class CurrentAffairsMarketControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private CurrentAffairsMarketRepository currentAffairsMarketRepository;
	@MockitoBean
	private JwtTokenProvider jwtTokenProvider;
	@MockitoBean
	private UserRepository userRepository;

	@Test
	void listMarkets_shouldReturnPagedPopularMarkets() throws Exception {
		Market highVolume = market("熱門市場");
		Market lowVolume = market("次熱門市場");
		highVolume.setImageUrl("https://example.com/current-affairs.jpg");
		when(currentAffairsMarketRepository.findPageWithVolume(
				eq(MarketStatus.ACTIVE), eq("popular"), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(
						CurrentAffairsMarketResponse.from(highVolume, new BigDecimal("300")),
						CurrentAffairsMarketResponse.from(lowVolume, new BigDecimal("100"))
				), PageRequest.of(1, 2), 5));

		mockMvc.perform(get("/api/current-affairs/markets")
				.param("page", "1")
				.param("size", "2"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(2))
				.andExpect(jsonPath("$.content[0].title").value("熱門市場"))
				.andExpect(jsonPath("$.content[0].imageUrl").value("https://example.com/current-affairs.jpg"))
				.andExpect(jsonPath("$.content[0].volume").value(300))
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.totalElements").value(5))
				.andExpect(jsonPath("$.totalPages").value(3))
				.andExpect(jsonPath("$.hasNext").value(true));

		verify(currentAffairsMarketRepository).findPageWithVolume(
				eq(MarketStatus.ACTIVE), eq("popular"), any(Pageable.class));
	}

	@Test
	void listMarkets_shouldRejectUnknownSort() throws Exception {
		mockMvc.perform(get("/api/current-affairs/markets").param("sort", "price"))
				.andExpect(status().isBadRequest());
	}

	private Market market(String title) {
		Market market = new Market(title, "描述", "CURRENT_AFFAIRS", null, null,
				null, LocalDateTime.now().plusDays(1));
		ReflectionTestUtils.setField(market, "id", UUID.randomUUID());
		market.changeStatus(MarketStatus.ACTIVE);
		return market;
	}
}
