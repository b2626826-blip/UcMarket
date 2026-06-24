package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.entity.Position;
import com.ucmarket.service.PositionService;

@RestController
@RequestMapping("/api/positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @GetMapping
    public List<Position> getAllPositions() {
        return positionService.findAll();
    }

    @GetMapping("/user/{userId}")
    public List<Position> getUserPositions(
            @PathVariable UUID userId) {

        return positionService.getPositionsByUserId(userId);
    }

    @GetMapping("/user/{userId}/open")
    public List<Position> getOpenUserPositions(
            @PathVariable UUID userId) {

        return positionService.getOpenPositionsByUserId(userId);
    }

    @GetMapping("/market/{marketId}")
    public List<Position> getMarketPositions(
            @PathVariable UUID marketId) {

        return positionService.getPositionsByMarketId(marketId);
    }

    @GetMapping("/market/{marketId}/open")
    public List<Position> getOpenMarketPositions(
            @PathVariable UUID marketId) {

        return positionService.getOpenPositionsByMarketId(marketId);
    }
}