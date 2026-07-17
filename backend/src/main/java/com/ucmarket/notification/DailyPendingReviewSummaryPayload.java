package com.ucmarket.notification;

import java.util.List;
import java.util.UUID;

public record DailyPendingReviewSummaryPayload(
        String summaryDate,
        int pendingCount,
        List<PendingMarketSnapshot> markets) {

    public DailyPendingReviewSummaryPayload {
        markets = List.copyOf(markets);
    }

    public record PendingMarketSnapshot(
            UUID marketId,
            String marketTitle) {
    }
}
