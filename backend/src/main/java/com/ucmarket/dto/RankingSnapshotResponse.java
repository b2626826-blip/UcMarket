package com.ucmarket.dto;

import java.time.Instant;
import java.util.List;

public record RankingSnapshotResponse(
		String metric,
		Instant asOf,
		List<RankingSnapshotItemResponse> items
) {
}
