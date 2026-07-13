package com.ucmarket.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@Service
public class WeatherMarketResolutionService {

    private static final Logger log = LoggerFactory.getLogger(WeatherMarketResolutionService.class);
    private static final UUID SYSTEM_CREATOR_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final String CATEGORY = "WEATHER";

    private final MarketRepository marketRepository;
    private final CwaObservationClient observationClient;
    private final MarketService marketService;
    private final ObjectMapper objectMapper;

    @Value("${weather.resolution.enabled:false}")
    private boolean enabled;

    @Value("${weather.mock.observation.enabled:false}")
    private boolean mockObservationEnabled;

    public WeatherMarketResolutionService(MarketRepository marketRepository,
                                          CwaObservationClient observationClient,
                                          MarketService marketService,
                                          ObjectMapper objectMapper) {
        this.marketRepository = marketRepository;
        this.observationClient = observationClient;
        this.marketService = marketService;
        this.objectMapper = objectMapper;
    }

    @Scheduled(cron = "${weather.resolution.cron:0 0 * * * ?}")
    public void resolveWeatherMarkets() {
        if (!enabled) {
            log.debug("Weather market resolution is disabled.");
            return;
        }

        log.info("Starting automatic weather market resolution.");
        List<Market> weatherMarkets = marketRepository.findByCategory(CATEGORY);
        LocalDate today = LocalDate.now();
        int resolvedCount = 0;
        int skippedCount = 0;

        for (Market market : weatherMarkets) {
            if (market.getStatus() != MarketStatus.CLOSED) {
                continue;
            }
            if (market.getResult() != null) {
                continue;
            }

            Map<String, Object> metadata = parseMetadata(market);
            String metric = (String) metadata.get("metric");
            String city = (String) metadata.get("city");
            String dateStr = (String) metadata.get("date");
            Object thresholdObj = metadata.get("threshold");

            if (metric == null || city == null || dateStr == null || thresholdObj == null) {
                log.warn("Market {} has incomplete weather metadata, skipping.", market.getId());
                continue;
            }

            int threshold = ((Number) thresholdObj).intValue();
            MarketResult result = null;

            try {
                if ("maxTemp".equals(metric)) {
                    result = resolveMaxTemp(city, LocalDate.parse(dateStr), threshold, today);
                } else if ("monthlyRain".equals(metric)) {
                    result = resolveMonthlyRain(city, LocalDate.parse(dateStr), threshold, today);
                } else {
                    log.warn("Unknown weather metric '{}' for market {}, skipping.", metric, market.getId());
                    continue;
                }
            } catch (Exception e) {
                log.error("Error determining result for market {}: {}", market.getId(), e.getMessage(), e);
                skippedCount++;
                continue;
            }

            if (result == null) {
                log.debug("Market {} not ready for resolution yet (observation data unavailable).", market.getId());
                skippedCount++;
                continue;
            }

            try {
                marketService.resolveMarket(market.getId(), SYSTEM_CREATOR_ID, result);
                resolvedCount++;
                log.info("Resolved weather market {} with result {}.", market.getId(), result);
            } catch (Exception e) {
                log.error("Failed to resolve market {}: {}", market.getId(), e.getMessage(), e);
                skippedCount++;
            }
        }

        log.info("Automatic weather market resolution completed. resolved={}, skipped={}", resolvedCount, skippedCount);
    }

    private MarketResult resolveMaxTemp(String city, LocalDate date, int threshold, LocalDate today) {
        if (!date.isBefore(today)) {
            log.debug("Temperature market date {} is not in the past yet, skipping.", date);
            return null;
        }

        if (mockObservationEnabled) {
            log.info("Mock observation enabled: resolving temperature market as YES (threshold={}).", threshold);
            return MarketResult.YES;
        }

        return observationClient.fetchDailyMaxTemperature(city, date)
                .map(maxTemp -> {
                    log.debug("Resolving temperature market for city={} date={}: maxTemp={} threshold={}",
                            city, date, maxTemp, threshold);
                    return maxTemp >= threshold ? MarketResult.YES : MarketResult.NO;
                })
                .orElse(null);
    }

    private MarketResult resolveMonthlyRain(String city, LocalDate monthStart, int threshold, LocalDate today) {
        YearMonth yearMonth = YearMonth.from(monthStart);
        LocalDate earliestResolutionDate = monthStart.plusMonths(1).withDayOfMonth(2);
        if (today.isBefore(earliestResolutionDate)) {
            log.debug("Monthly rain market for {} is not ready for resolution yet (earliest date: {}).",
                    yearMonth, earliestResolutionDate);
            return null;
        }

        if (mockObservationEnabled) {
            log.info("Mock observation enabled: resolving monthly rain market as NO (threshold={}).", threshold);
            return MarketResult.NO;
        }

        return observationClient.fetchMonthlyTotalPrecipitation(city, yearMonth)
                .map(total -> {
                    log.debug("Resolving monthly rain market for city={} yearMonth={}: total={}mm threshold={}mm",
                            city, yearMonth, total, threshold);
                    return total > threshold ? MarketResult.YES : MarketResult.NO;
                })
                .orElse(null);
    }

    private Map<String, Object> parseMetadata(Market market) {
        if (market.getMetadata() == null || market.getMetadata().isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(market.getMetadata(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse metadata for market {}: {}", market.getId(), e.getMessage());
            return Map.of();
        }
    }
}
