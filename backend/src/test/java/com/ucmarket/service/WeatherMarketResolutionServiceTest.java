package com.ucmarket.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@ExtendWith(MockitoExtension.class)
class WeatherMarketResolutionServiceTest {

    private static final UUID SYSTEM_CREATOR_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");

    /** 固定的「今天」，讓所有斷言與真實日曆位置無關。2026-09-15 落在月降雨的可解析視窗內。 */
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 15);
    /** TODAY 的前一個月起始日，月降雨市場最早可解析日為 2026-09-02。 */
    private static final LocalDate LAST_MONTH_START = LocalDate.of(2026, 8, 1);
    private static final LocalDate YESTERDAY = TODAY.minusDays(1);

    @Mock
    private MarketRepository marketRepository;

    @Mock
    private CwaObservationClient observationClient;

    @Mock
    private MarketService marketService;

    @InjectMocks
    private WeatherMarketResolutionService resolutionService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(resolutionService, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(resolutionService, "enabled", true);
        ReflectionTestUtils.setField(resolutionService, "mockObservationEnabled", false);
    }

    @Test
    void resolveMaxTempMarketAsYesWhenObservationExceedsThreshold() {
        Market market = createWeatherMarket("maxTemp", "台北", YESTERDAY, 30);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));
        when(observationClient.fetchDailyMaxTemperature("台北", YESTERDAY))
                .thenReturn(Optional.of(32.0));

        resolutionService.resolveWeatherMarkets(TODAY);

        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.YES);
    }

    @Test
    void resolveMaxTempMarketAsNoWhenObservationBelowThreshold() {
        Market market = createWeatherMarket("maxTemp", "台北", YESTERDAY, 30);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));
        when(observationClient.fetchDailyMaxTemperature("台北", YESTERDAY))
                .thenReturn(Optional.of(28.0));

        resolutionService.resolveWeatherMarkets(TODAY);

        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.NO);
    }

    @Test
    void resolveMonthlyRainMarketAsYesWhenTotalExceedsThreshold() {
        LocalDate monthStart = LAST_MONTH_START;
        Market market = createWeatherMarket("monthlyRain", "高雄", monthStart, 200);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));
        when(observationClient.fetchMonthlyTotalPrecipitation("高雄", YearMonth.from(monthStart)))
                .thenReturn(Optional.of(250.0));

        resolutionService.resolveWeatherMarkets(TODAY);

        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.YES);
    }

    @Test
    void resolveMonthlyRainMarketAsNoWhenTotalBelowThreshold() {
        LocalDate monthStart = LAST_MONTH_START;
        Market market = createWeatherMarket("monthlyRain", "高雄", monthStart, 200);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));
        when(observationClient.fetchMonthlyTotalPrecipitation("高雄", YearMonth.from(monthStart)))
                .thenReturn(Optional.of(150.0));

        resolutionService.resolveWeatherMarkets(TODAY);

        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.NO);
    }

    @Test
    void skipMonthlyRainMarketOnTheDayBeforeEarliestResolutionDate() {
        Market market = createWeatherMarket("monthlyRain", "高雄", LAST_MONTH_START, 200);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(LocalDate.of(2026, 9, 1));

        verifyNoInteractions(observationClient);
        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    @Test
    void resolveMonthlyRainMarketOnEarliestResolutionDate() {
        Market market = createWeatherMarket("monthlyRain", "高雄", LAST_MONTH_START, 200);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));
        when(observationClient.fetchMonthlyTotalPrecipitation("高雄", YearMonth.from(LAST_MONTH_START)))
                .thenReturn(Optional.of(250.0));

        resolutionService.resolveWeatherMarkets(LocalDate.of(2026, 9, 2));

        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.YES);
    }

    @Test
    void skipNonClosedMarkets() {
        Market market = createWeatherMarket("maxTemp", "台北", YESTERDAY, 30);
        market.changeStatus(MarketStatus.ACTIVE);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(observationClient);
        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    @Test
    void skipAlreadyResolvedMarkets() {
        Market market = createWeatherMarket("maxTemp", "台北", YESTERDAY, 30);
        ReflectionTestUtils.setField(market, "result", MarketResult.YES);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(observationClient);
        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    @Test
    void skipWhenObservationDataUnavailable() {
        Market market = createWeatherMarket("maxTemp", "台北", YESTERDAY, 30);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));
        when(observationClient.fetchDailyMaxTemperature("台北", YESTERDAY))
                .thenReturn(Optional.empty());

        resolutionService.resolveWeatherMarkets(TODAY);

        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    @Test
    void skipFutureTemperatureMarkets() {
        Market market = createWeatherMarket("maxTemp", "台北", TODAY.plusDays(1), 30);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(observationClient);
        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    @Test
    void skipMonthlyRainMarketsBeforeEarliestResolutionDate() {
        LocalDate monthStart = TODAY.withDayOfMonth(1);
        Market market = createWeatherMarket("monthlyRain", "高雄", monthStart, 200);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(observationClient);
        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    @Test
    void mockObservationModeResolvesMaxTempAsYesWithoutCallingCwa() {
        ReflectionTestUtils.setField(resolutionService, "mockObservationEnabled", true);
        Market market = createWeatherMarket("maxTemp", "台北", YESTERDAY, 30);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(observationClient);
        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.YES);
    }

    @Test
    void mockObservationModeResolvesMonthlyRainAsNoWithoutCallingCwa() {
        ReflectionTestUtils.setField(resolutionService, "mockObservationEnabled", true);
        LocalDate monthStart = LAST_MONTH_START;
        Market market = createWeatherMarket("monthlyRain", "高雄", monthStart, 200);
        when(marketRepository.findByCategory("WEATHER")).thenReturn(List.of(market));

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(observationClient);
        verify(marketService).resolveMarket(market.getId(), SYSTEM_CREATOR_ID, MarketResult.NO);
    }

    @Test
    void doNothingWhenResolutionDisabled() {
        ReflectionTestUtils.setField(resolutionService, "enabled", false);

        resolutionService.resolveWeatherMarkets(TODAY);

        verifyNoInteractions(marketRepository);
        verifyNoInteractions(observationClient);
        verify(marketService, never()).resolveMarket(any(), any(), any());
    }

    private Market createWeatherMarket(String metric, String city, LocalDate date, int threshold) {
        Market market = new Market(
                "Test weather market",
                "Test description",
                "WEATHER",
                "BINARY",
                "https://www.cwa.gov.tw/",
                "Test resolution rule.",
                date.atTime(23, 59, 59)
        );
        market.setCreatorId(SYSTEM_CREATOR_ID);
        market.changeStatus(MarketStatus.CLOSED);
        market.setMetadata(toJson(Map.of(
                "type", "WEATHER",
                "city", city,
                "date", date.toString(),
                "metric", metric,
                "threshold", threshold
        )));
        return market;
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
