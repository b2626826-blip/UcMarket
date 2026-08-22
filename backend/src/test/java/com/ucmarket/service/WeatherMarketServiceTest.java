package com.ucmarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.repository.MarketRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WeatherMarketServiceTest {

    @Mock
    private MarketRepository marketRepository;

    @Mock
    private PriceHistoryService priceHistoryService;

    @InjectMocks
    private WeatherMarketService weatherMarketService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(weatherMarketService, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(weatherMarketService, "mockEnabled", true);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of());
        when(marketRepository.save(any(Market.class))).thenAnswer(invocation -> {
            Market market = invocation.getArgument(0);
            ReflectionTestUtils.setField(market, "id", UUID.randomUUID());
            return market;
        });
    }

    private List<Market> createdMarketsOn(LocalDate today) {
        weatherMarketService.createDailyWeatherMarkets(today);
        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
        verify(marketRepository, atLeastOnce()).save(captor.capture());
        return captor.getAllValues();
    }

    private List<Market> monthlyRainMarkets(List<Market> markets) {
        return markets.stream().filter(market -> {
            try {
                JsonNode node = objectMapper.readTree(market.getMetadata());
                return "monthlyRain".equals(node.path("metric").asText(null));
            } catch (Exception e) {
                return false;
            }
        }).toList();
    }

    @Test
    void monthlyRainMarketsCloseOnTheLastDayOfTheirMonth() {
        // 8 月有 31 天：固定 plusDays(27) 會在 8/28 關閉，比月末早三天。
        LocalDate today = LocalDate.of(2026, 8, 10);
        List<Market> rainMarkets = monthlyRainMarkets(createdMarketsOn(today));

        assertFalse(rainMarkets.isEmpty(), "expected monthly rain markets to be created");
        for (Market market : rainMarkets) {
            assertEquals(LocalDateTime.of(2026, 8, 31, 23, 59, 59), market.getCloseAt(),
                    "monthly rain market must stay open until the month actually ends");
        }
    }

    @Test
    void monthlyRainMarketsCloseOnTheLastDayOfAShortMonth() {
        // 2028 年是閏年，2 月有 29 天。
        LocalDate today = LocalDate.of(2028, 2, 5);
        List<Market> rainMarkets = monthlyRainMarkets(createdMarketsOn(today));

        assertFalse(rainMarkets.isEmpty(), "expected monthly rain markets to be created");
        for (Market market : rainMarkets) {
            assertEquals(LocalDateTime.of(2028, 2, 29, 23, 59, 59), market.getCloseAt(),
                    "leap February must stay open through the 29th");
        }
    }

    @Test
    void monthlyRainMarketsUseTheFirstOfTheCurrentMonthAsTheirSubject() {
        List<Market> rainMarkets = monthlyRainMarkets(createdMarketsOn(LocalDate.of(2026, 8, 10)));

        assertFalse(rainMarkets.isEmpty(), "expected monthly rain markets to be created");
        for (Market market : rainMarkets) throwingAssertMonthStart(market);
    }

    private void throwingAssertMonthStart(Market market) {
        try {
            JsonNode node = objectMapper.readTree(market.getMetadata());
            assertEquals("2026-08-01", node.path("date").asText(null));
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }

    @Test
    void temperatureMarketsCoverTheForecastWindowFromTheGivenDate() {
        List<Market> markets = createdMarketsOn(LocalDate.of(2026, 8, 10));

        List<Market> tempMarkets = markets.stream().filter(market -> {
            try {
                JsonNode node = objectMapper.readTree(market.getMetadata());
                return "maxTemp".equals(node.path("metric").asText(null));
            } catch (Exception e) {
                return false;
            }
        }).toList();

        assertFalse(tempMarkets.isEmpty(), "expected temperature markets to be created");
        for (Market market : tempMarkets) {
            LocalDateTime closeAt = market.getCloseAt();
            assertTrue(!closeAt.isBefore(LocalDateTime.of(2026, 8, 10, 23, 59, 59))
                            && !closeAt.isAfter(LocalDateTime.of(2026, 8, 12, 23, 59, 59)),
                    "temperature market closeAt out of forecast window: " + closeAt);
        }
    }
}
