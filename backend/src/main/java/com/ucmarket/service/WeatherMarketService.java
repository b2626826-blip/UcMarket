package com.ucmarket.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@Service
@Transactional
public class WeatherMarketService {

    private static final Logger log = LoggerFactory.getLogger(WeatherMarketService.class);

    private static final UUID SYSTEM_CREATOR_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final String CATEGORY = "WEATHER";
    private static final String SOURCE_URL = "https://www.cwa.gov.tw/";

    private static final List<String> CITIES = List.of(
            "台北", "新北", "基隆", "桃園", "新竹", "苗栗", "台中", "彰化", "南投", "雲林",
            "嘉義", "台南", "高雄", "屏東", "宜蘭", "花蓮", "台東", "澎湖", "金門", "連江"
    );

    private static final Map<String, String> CWA_CITY_MAP = Map.ofEntries(
            Map.entry("台北", "臺北市"),
            Map.entry("新北", "新北市"),
            Map.entry("基隆", "基隆市"),
            Map.entry("桃園", "桃園市"),
            Map.entry("新竹", "新竹市"),
            Map.entry("苗栗", "苗栗縣"),
            Map.entry("台中", "臺中市"),
            Map.entry("彰化", "彰化縣"),
            Map.entry("南投", "南投縣"),
            Map.entry("雲林", "雲林縣"),
            Map.entry("嘉義", "嘉義市"),
            Map.entry("台南", "臺南市"),
            Map.entry("高雄", "高雄市"),
            Map.entry("屏東", "屏東縣"),
            Map.entry("宜蘭", "宜蘭縣"),
            Map.entry("花蓮", "花蓮縣"),
            Map.entry("台東", "臺東縣"),
            Map.entry("澎湖", "澎湖縣"),
            Map.entry("金門", "金門縣"),
            Map.entry("連江", "連江縣")
    );

    private static final List<Integer> MONTHLY_RAIN_THRESHOLDS = List.of(200, 400, 600);
    private static final int TEMP_OFFSET_START = -2;
    private static final int TEMP_OFFSET_END = 2;
    private static final int FORECAST_DAYS = 3;

    private final MarketRepository marketRepository;
    private final PriceHistoryService priceHistoryService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${cwa.api.key:}")
    private String cwaApiKey;

    @Value("${weather.mock.enabled:false}")
    private boolean mockEnabled;

    public WeatherMarketService(MarketRepository marketRepository, PriceHistoryService priceHistoryService,
                                ObjectMapper objectMapper) {
        this.marketRepository = marketRepository;
        this.priceHistoryService = priceHistoryService;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        createDailyWeatherMarkets();
    }

    @Scheduled(cron = "0 0 12 * * ?")
    public void createDailyWeatherMarkets() {
        log.info("Starting daily weather market creation. mockEnabled={}, apiKeyPresent={}",
                mockEnabled, cwaApiKey != null && !cwaApiKey.isBlank());

        if (!mockEnabled && (cwaApiKey == null || cwaApiKey.isBlank())) {
            log.warn("No CWA API key configured and mock disabled. Skipping weather market creation.");
            return;
        }

        LocalDate today = LocalDate.now();
        int createdCount = 0;
        for (String city : CITIES) {
            Forecast forecast;
            if (mockEnabled) {
                forecast = createMockForecast(city, today);
                log.debug("Using mock forecast for city={}", city);
            } else {
                forecast = fetchForecast(city);
            }

            if (forecast == null) {
                log.warn("No forecast available for city={}", city);
                continue;
            }

            for (int dayOffset = 0; dayOffset < FORECAST_DAYS; dayOffset++) {
                LocalDate targetDate = today.plusDays(dayOffset);
                DailyForecast daily = forecast.getDay(targetDate);
                if (daily == null) {
                    log.warn("No daily forecast for city={} date={}", city, targetDate);
                    continue;
                }

                createTemperatureMarkets(city, targetDate, daily.maxTemp());
            }

            createMonthlyRainMarkets(city, today);
        }
        log.info("Daily weather market creation completed.");
    }

    private void createTemperatureMarkets(String city, LocalDate date, Integer maxTemp) {
        if (maxTemp == null) return;

        for (int offset = TEMP_OFFSET_START; offset <= TEMP_OFFSET_END; offset++) {
            int threshold = maxTemp + offset;
            if (threshold < 0) continue;

            String title = String.format("%s %s最高溫會超過 %d°C 嗎？", formatDate(date), city, threshold);
            String description = String.format("此市場預測 %s %s地區的最高溫是否會超過 %d°C。", date, city, threshold);
            String resolutionRule = String.format(
                    "以交通部中央氣象署（CWA）公布的 %s %s地區觀測資料為準。若當日最高溫大於或等於 %d°C，則結算為 YES；否則結算為 NO。",
                    date, city, threshold);

            createMarketIfNotExists(city, date, "maxTemp", threshold, title, description, resolutionRule, date.atTime(23, 59, 59));
        }
    }

    private void createMonthlyRainMarkets(String city, LocalDate baseDate) {
        LocalDate monthStart = baseDate.withDayOfMonth(1);
        LocalDateTime closeAt = monthStart.plusDays(27).atTime(23, 59, 59);
        String monthLabel = monthStart.format(DateTimeFormatter.ofPattern("M月"));
        String monthLabelFull = monthStart.format(DateTimeFormatter.ofPattern("yyyy年M月"));

        for (int threshold : MONTHLY_RAIN_THRESHOLDS) {
            String title = String.format("%s %s月降雨量會超過 %dmm 嗎？", monthLabel, city, threshold);
            // city > StationName 相關縣市 ,JSON無city的keys
            String description = String.format("此市場預測 %s %s地區的月累積降雨量是否會超過 %dmm。", monthLabelFull, city, threshold);
            String resolutionRule = String.format(
                    "以交通部中央氣象署（CWA）公布的 C-B0025-001 月降雨量觀測資料為準。若 %s %s地區累積降雨量超過 %dmm，則結算為 YES；否則結算為 NO。",
                    monthLabelFull, city, threshold);

            createMarketIfNotExists(city, monthStart, "monthlyRain", threshold, title, description, resolutionRule, closeAt);
        }
    }

    private void createMarketIfNotExists(String city, LocalDate date, String metric, int threshold,
                                         String title, String description, String resolutionRule,
                                         LocalDateTime closeAt) {
        if (exists(city, date, metric, threshold)) {
            log.debug("Market already exists for city={} date={} metric={} threshold={}", city, date, metric, threshold);
            return;
        }

        Market market = new Market(title, description, CATEGORY, "BINARY", SOURCE_URL, resolutionRule, closeAt);
        market.setCreatorId(SYSTEM_CREATOR_ID);
        market.changeStatus(MarketStatus.ACTIVE);
        market.setMetadata(toJson(Map.of(
                "type", "WEATHER",
                "city", city,
                "date", date.toString(),
                "metric", metric,
                "threshold", threshold
        )));

        Market saved = marketRepository.save(market);
        priceHistoryService.recordInitialPrice(saved.getId());
        log.info("Created weather market: id={} city={} date={} metric={} threshold={}",
                saved.getId(), city, date, metric, threshold);
    }

    private boolean exists(String city, LocalDate date, String metric, int threshold) {
        List<Market> existing = marketRepository.findByCategory(CATEGORY);
        for (Market market : existing) {
            if (market.getMetadata() == null || market.getMetadata().isBlank()) continue;
            try {
                JsonNode node = objectMapper.readTree(market.getMetadata());
                if (city.equals(node.path("city").asText(null))
                        && date.toString().equals(node.path("date").asText(null))
                        && metric.equals(node.path("metric").asText(null))
                        && threshold == node.path("threshold").asInt()) {
                    return true;
                }
            } catch (Exception e) {
                // skip malformed metadata
            }
        }
        return false;
    }

    private Forecast fetchForecast(String city) {
        String cwaCity = CWA_CITY_MAP.getOrDefault(city, city);
        String url = UriComponentsBuilder
                .fromHttpUrl("https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001")
                .queryParam("Authorization", cwaApiKey)
                .queryParam("locationName", cwaCity)
                .toUriString();

        log.info("Fetching CWA forecast for city={} (cwaCity={})", city, cwaCity);
        try {
            String response = restTemplate.getForObject(url, String.class);
            if (response == null) {
                log.warn("Empty response from CWA for city={}", city);
                return null;
            }
            log.debug("CWA response preview for city={}: {}", city,
                    response.length() > 200 ? response.substring(0, 200) + "..." : response);
            Forecast forecast = parseForecast(response, city);
            log.info("Parsed forecast for city={}: {} days", city, forecast != null ? forecast.days().size() : 0);
            return forecast;
        } catch (Exception e) {
            log.error("Failed to fetch CWA forecast for city={}: {}", city, e.getMessage(), e);
            return null;
        }
    }

    private Forecast createMockForecast(String city, LocalDate today) {
        int cityIndex = CITIES.indexOf(city);
        List<DailyForecast> days = new ArrayList<>();
        for (int i = 0; i < FORECAST_DAYS; i++) {
            LocalDate date = today.plusDays(i);
            int maxTemp = 26 + (cityIndex % 8) + (i % 3);
            int minTemp = Math.max(18, maxTemp - 6);
            int rainProb = ((cityIndex * 7 + i * 23) % 9) * 10;
            days.add(new DailyForecast(date, maxTemp, minTemp, rainProb));
        }
        return new Forecast(city, days);
    }

    private Forecast parseForecast(String response, String city) {
        if (response == null) return null;
        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode location = root.path("records").path("location").get(0);
            if (location == null) return null;

            Map<LocalDate, DailyForecast> byDate = new LinkedHashMap<>();
            for (JsonNode element : location.path("weatherElement")) {
                String code = element.path("elementName").asText();
                for (JsonNode time : element.path("time")) {
                    String startTime = time.path("startTime").asText();
                    LocalDate date = LocalDate.parse(startTime.substring(0, 10));
                    String raw = time.path("parameter").path("parameterName").asText();
                    int value = parseIntSafe(raw);

                    DailyForecast current = byDate.getOrDefault(date, new DailyForecast(date));
                    if ("MaxT".equals(code)) {
                        current = current.withMaxTemp(value);
                    } else if ("MinT".equals(code)) {
                        current = current.withMinTemp(value);
                    } else if ("PoP".equals(code)) {
                        current = current.withRainProb(value);
                    }
                    byDate.put(date, current);
                }
            }

            List<DailyForecast> days = byDate.values().stream()
                    .sorted((a, b) -> a.date().compareTo(b.date()))
                    .collect(Collectors.toList());
            return new Forecast(city, days);
        } catch (Exception e) {
            log.error("Failed to parse CWA forecast for city={}: {}", city, e.getMessage(), e);
            return null;
        }
    }

    private int parseIntSafe(String raw) {
        try {
            return Integer.parseInt(raw.replaceAll("[^0-9\\-]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String formatDate(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("MM/dd"));
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize metadata", e);
        }
    }

    private record Forecast(String city, List<DailyForecast> days) {
        DailyForecast getDay(LocalDate date) {
            return days.stream()
                    .filter(d -> d.date().equals(date))
                    .findFirst()
                    .orElse(null);
        }
    }

    private record DailyForecast(LocalDate date, Integer maxTemp, Integer minTemp, Integer rainProb) {
        DailyForecast(LocalDate date) {
            this(date, null, null, null);
        }

        DailyForecast withMaxTemp(Integer maxTemp) {
            return new DailyForecast(date, maxTemp, minTemp, rainProb);
        }

        DailyForecast withMinTemp(Integer minTemp) {
            return new DailyForecast(date, maxTemp, minTemp, rainProb);
        }

        DailyForecast withRainProb(Integer rainProb) {
            return new DailyForecast(date, maxTemp, minTemp, rainProb);
        }
    }
}
