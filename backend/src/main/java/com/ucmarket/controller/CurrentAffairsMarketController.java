package com.ucmarket.controller;

import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.CurrentAffairsMarketPageResponse;
import com.ucmarket.dto.CurrentAffairsMarketResponse;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.CurrentAffairsMarketRepository;

@RestController
@RequestMapping("/api/current-affairs/markets")
public class CurrentAffairsMarketController {

	private static final int MAX_PAGE_SIZE = 50;

	private final CurrentAffairsMarketRepository currentAffairsMarketRepository;

	public CurrentAffairsMarketController(CurrentAffairsMarketRepository currentAffairsMarketRepository) {
		this.currentAffairsMarketRepository = currentAffairsMarketRepository;
	}

	@GetMapping
	public CurrentAffairsMarketPageResponse listMarkets(
			@RequestParam(defaultValue = "ACTIVE") MarketStatus status,
			@RequestParam(defaultValue = "popular") String sort,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
		String normalizedSort = sort.toLowerCase(Locale.ROOT);
		validateSort(normalizedSort);
		Page<CurrentAffairsMarketResponse> markets = currentAffairsMarketRepository.findPageWithVolume(
				status, normalizedSort, PageRequest.of(safePage, safeSize));

		return new CurrentAffairsMarketPageResponse(
				markets.getContent(),
				markets.getNumber(), markets.getSize(), markets.getTotalElements(), markets.getTotalPages(),
				markets.isFirst(), markets.isLast(), markets.hasNext());
	}

	private void validateSort(String sort) {
		if (!sort.equals("popular") && !sort.equals("latest") && !sort.equals("closing")) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sort: " + sort);
		}
	}
}
