package com.ucmarket.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.*;

import com.ucmarket.dto.TradeQuoteRequest;
import com.ucmarket.dto.TradeQuoteResponse;
import com.ucmarket.service.TradeService;

@RestController
@RequestMapping("/api/markets/{marketId}/trades")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    @PostMapping("/quote")
    public TradeQuoteResponse quoteBinaryTrade(
            @PathVariable UUID marketId,
            @RequestBody TradeQuoteRequest request
    ) {
        return tradeService.quoteBinaryTrade(marketId, request);
    }

    @PostMapping("/buy")
    public TradeQuoteResponse buyBinaryTrade(
            @PathVariable UUID marketId,
            @RequestParam UUID userId,
            @RequestBody TradeQuoteRequest request
    ) {
        return tradeService.buyBinaryTrade(userId, marketId, request);
    }
}