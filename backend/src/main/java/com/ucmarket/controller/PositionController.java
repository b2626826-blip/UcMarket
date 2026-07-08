package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.PositionResponse;
import com.ucmarket.entity.User;
import com.ucmarket.service.PositionService;

@RestController
@RequestMapping("/api/positions")
public class PositionController {

	private final PositionService positionService;

	public PositionController(PositionService positionService) {
		this.positionService = positionService;
	}

	@GetMapping("/me")
	public List<PositionResponse> getMyPositions(@AuthenticationPrincipal User user) {
		return positionService.getPositionsByUserId(user.getId());
	}

	@GetMapping("/me/open")
	public List<PositionResponse> getMyOpenPositions(@AuthenticationPrincipal User user) {
		return positionService.getOpenPositionsByUserId(user.getId());
	}

	@GetMapping("/market/{marketId}")
	public List<PositionResponse> getMarketPositions(@PathVariable UUID marketId) {
		return positionService.getPositionsByMarketId(marketId);
	}

	@GetMapping("/market/{marketId}/open")
	public List<PositionResponse> getOpenMarketPositions(@PathVariable UUID marketId) {
		return positionService.getOpenPositionsByMarketId(marketId);
	}
}
