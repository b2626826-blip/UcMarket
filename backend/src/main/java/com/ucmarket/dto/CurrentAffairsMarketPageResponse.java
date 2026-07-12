package com.ucmarket.dto;

import java.util.List;

public record CurrentAffairsMarketPageResponse(
		List<CurrentAffairsMarketResponse> content,
		int page,
		int size,
		long totalElements,
		int totalPages,
		boolean first,
		boolean last,
		boolean hasNext) {
}
