package com.ucmarket.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.*;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.service.ResolutionService;

@RestController
@RequestMapping("/api/markets/{marketId}/resolution")
public class ResolutionController {

    private final ResolutionService resolutionService;

    public ResolutionController(ResolutionService resolutionService) {
        this.resolutionService = resolutionService;
    }

    @PostMapping("/resolve")
    public Market resolveMarket(
            @PathVariable UUID marketId,
            @RequestParam MarketResult result
    ) {
        return resolutionService.resolveMarket(marketId, result);
    }

    @PostMapping("/cancel")
    public Market cancelMarket(
            @PathVariable UUID marketId
    ) {
        return resolutionService.cancelMarket(marketId);
    }
}