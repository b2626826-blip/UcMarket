package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.PositionResponse;
import com.ucmarket.service.PositionService;

@RestController
@RequestMapping("/api/positions")
public class PositionController {

	private final PositionService positionService;

	public PositionController(PositionService positionService) {
		this.positionService = positionService;
	}

	@GetMapping("/user/{userId}")
	public List<PositionResponse> getUserPositions(@PathVariable UUID userId) {
		return positionService.getPositionsByUserId(userId);
	}

	@GetMapping("/user/{userId}/open")
	public List<PositionResponse> getOpenUserPositions(@PathVariable UUID userId) {
		return positionService.getOpenPositionsByUserId(userId);
	}
}
