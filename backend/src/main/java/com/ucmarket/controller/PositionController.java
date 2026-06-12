package com.ucmarket.controller;

import com.ucmarket.entity.Position;
import com.ucmarket.service.PositionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @GetMapping("/user/{userId}")
    public List<Position> getPositionsByUserId(@PathVariable String userId) {
        return positionService.getPositionsByUserId(userId);
    }

    @GetMapping("/user/{userId}/active")
    public List<Position> getActivePositionsByUserId(@PathVariable String userId) {
        return positionService.getActivePositionsByUserId(userId);
    }
}