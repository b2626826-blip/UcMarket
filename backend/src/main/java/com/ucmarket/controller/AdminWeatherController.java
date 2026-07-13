package com.ucmarket.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.service.WeatherMarketResolutionService;

@RestController
@RequestMapping("/api/admin/weather")
public class AdminWeatherController {

    private final WeatherMarketResolutionService resolutionService;

    public AdminWeatherController(WeatherMarketResolutionService resolutionService) {
        this.resolutionService = resolutionService;
    }

    /**
     * Manually trigger automatic resolution for all eligible weather markets.
     * Only users with ADMIN role can access this endpoint (enforced by SecurityConfig).
     */
    @PostMapping("/resolve")
    public ResponseEntity<Map<String, Object>> resolveWeatherMarkets() {
        resolutionService.resolveWeatherMarkets();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Weather market resolution triggered."
        ));
    }
}
