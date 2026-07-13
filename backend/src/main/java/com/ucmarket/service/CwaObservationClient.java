package com.ucmarket.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class CwaObservationClient {

    private static final Logger log = LoggerFactory.getLogger(CwaObservationClient.class);

    private static final String TEMPERATURE_DATASET_ID = "C-B0024-001";
    private static final String PRECIPITATION_DATASET_ID = "C-B0025-001";
    private static final String BASE_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/";

    // City (as stored in market metadata) -> CWA station ID
    private static final Map<String, String> CITY_STATION_MAP = Map.ofEntries(
            Map.entry("台北", "466920"),
            Map.entry("新北", "466881"),
            Map.entry("基隆", "466940"),
            Map.entry("桃園", "467050"),
            Map.entry("新竹", "467571"),
            Map.entry("苗栗", "467280"),
            Map.entry("台中", "467490"),
            Map.entry("彰化", "467270"),
            Map.entry("南投", "467650"),
            Map.entry("雲林", "467290"),
            Map.entry("嘉義", "467480"),
            Map.entry("台南", "467410"),
            Map.entry("高雄", "467441"),
            Map.entry("屏東", "467590"),
            Map.entry("宜蘭", "467080"),
            Map.entry("花蓮", "466990"),
            Map.entry("台東", "467660"),
            Map.entry("澎湖", "467350"),
            Map.entry("金門", "467110"),
            Map.entry("連江", "467990")
    );

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${cwa.api.key:}")
    private String cwaApiKey;

    public CwaObservationClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Fetch the observed daily maximum temperature for a city on a specific date.
     */
    public Optional<Double> fetchDailyMaxTemperature(String city, LocalDate date) {
        String stationId = CITY_STATION_MAP.get(city);
        if (stationId == null) {
            log.warn("No CWA station mapping for city={}", city);
            return Optional.empty();
        }

        String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);
        String url = buildUrl(TEMPERATURE_DATASET_ID);

        log.debug("Fetching daily max temperature from CWA for city={} stationId={} date={}", city, stationId, dateStr);
        try {
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.isBlank()) {
                log.warn("Empty CWA temperature response for city={} date={}", city, dateStr);
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode location = findStation(root, stationId);
            if (location == null) {
                log.warn("Station {} not found in CWA temperature response for city={}", stationId, city);
                return Optional.empty();
            }

            JsonNode dailyStats = location.path("stationObsStatistics").path("AirTemperature").path("daily");
            if (!dailyStats.isArray()) {
                log.warn("No daily temperature statistics for city={} date={}", city, dateStr);
                return Optional.empty();
            }

            for (JsonNode day : dailyStats) {
                if (dateStr.equals(day.path("Date").asText(null))) {
                    double value = day.path("Maximum").asDouble(Double.NaN);
                    if (!Double.isNaN(value)) {
                        log.info("Observed max temperature for city={} date={}: {}°C", city, dateStr, value);
                        return Optional.of(value);
                    }
                    return Optional.empty();
                }
            }

            log.warn("No temperature data for city={} date={} in CWA response", city, dateStr);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to fetch CWA temperature for city={} date={}: {}", city, dateStr, e.getMessage(), e);
            return Optional.empty();
        }
    }

    /**
     * Fetch the observed monthly total precipitation for a city in a specific month.
     */
    public Optional<Double> fetchMonthlyTotalPrecipitation(String city, YearMonth yearMonth) {
        String stationId = CITY_STATION_MAP.get(city);
        if (stationId == null) {
            log.warn("No CWA station mapping for city={}", city);
            return Optional.empty();
        }

        String yearMonthStr = yearMonth.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String url = buildUrl(PRECIPITATION_DATASET_ID);

        log.debug("Fetching monthly precipitation from CWA for city={} stationId={} yearMonth={}", city, stationId, yearMonthStr);
        try {
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.isBlank()) {
                log.warn("Empty CWA precipitation response for city={} yearMonth={}", city, yearMonthStr);
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode location = findStation(root, stationId);
            if (location == null) {
                log.warn("Station {} not found in CWA precipitation response for city={}", stationId, city);
                return Optional.empty();
            }

            JsonNode monthlyStats = location.path("stationObsStatistics").path("Precipitation").path("monthly");
            if (!monthlyStats.isArray()) {
                log.warn("No monthly precipitation statistics for city={} yearMonth={}", city, yearMonthStr);
                return Optional.empty();
            }

            for (JsonNode month : monthlyStats) {
                if (yearMonthStr.equals(month.path("YearMonth").asText(null))) {
                    String raw = month.path("Total").asText(null);
                    double value = parseDoubleSafe(raw);
                    if (!Double.isNaN(value)) {
                        log.info("Observed monthly precipitation for city={} yearMonth={}: {}mm", city, yearMonthStr, value);
                        return Optional.of(value);
                    }
                    log.warn("Invalid precipitation total for city={} yearMonth={}: '{}'", city, yearMonthStr, raw);
                    return Optional.empty();
                }
            }

            log.warn("No precipitation data for city={} yearMonth={} in CWA response", city, yearMonthStr);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to fetch CWA precipitation for city={} yearMonth={}: {}", city, yearMonthStr, e.getMessage(), e);
            return Optional.empty();
        }
    }

    private String buildUrl(String datasetId) {
        return UriComponentsBuilder
                .fromHttpUrl(BASE_URL + datasetId)
                .queryParam("Authorization", cwaApiKey)
                .toUriString();
    }

    private JsonNode findStation(JsonNode root, String stationId) {
        JsonNode locations = root.path("records").path("location");
        if (!locations.isArray()) {
            return null;
        }
        for (JsonNode location : locations) {
            if (stationId.equals(location.path("station").path("StationID").asText(null))) {
                return location;
            }
        }
        return null;
    }

    private double parseDoubleSafe(String raw) {
        if (raw == null || raw.isBlank()) {
            return Double.NaN;
        }
        try {
            // "T" means trace precipitation, treat as 0 for monthly totals
            if ("T".equalsIgnoreCase(raw.trim())) {
                return 0.0;
            }
            return Double.parseDouble(raw.replaceAll("[^0-9\\-\\.]", ""));
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }
}
