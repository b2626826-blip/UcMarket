package com.ucmarket.controller;

import com.ucmarket.dto.BuyRequest;
import com.ucmarket.dto.CloseRequest;
import com.ucmarket.dto.PositionPnlRequest;
import com.ucmarket.dto.PositionRequest;
import com.ucmarket.dto.SellRequest;
import com.ucmarket.dto.SettleRequest;
import com.ucmarket.entity.Position;
import com.ucmarket.service.PositionService;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @GetMapping
    public List<Position> findAll() {
        return positionService.findAll();
    }

    @PostMapping
    public Position createPosition(@RequestBody PositionRequest request) {
        return positionService.createPosition(request);
    }

    @PostMapping("/buy")
    public Position buy(@RequestBody BuyRequest request) {
        return positionService.buy(request);
    }

    @PostMapping("/sell")
    public Position sell(@RequestBody SellRequest request) {
        return positionService.sell(request);
    }

    @PostMapping("/pnl")
    public Position updatePnl(@RequestBody PositionPnlRequest request) {
        return positionService.updatePnl(request);
    }

    @PostMapping("/close")
    public Position closePosition(@RequestBody CloseRequest request) {
        return positionService.closePosition(request);
    }

    @PostMapping("/settle")
    public Position settlePosition(@RequestBody SettleRequest request) {
        return positionService.settlePosition(request);
    }

    @GetMapping("/user/{userId}")
    public List<Position> getPositionsByUserId(@PathVariable UUID userId) {
        return positionService.getPositionsByUserId(userId);
    }

    @GetMapping("/user/{userId}/active")
    public List<Position> getActivePositionsByUserId(@PathVariable UUID userId) {
        return positionService.getActivePositionsByUserId(userId);
    }
}