package com.ucmarket.service;

import java.util.List;

import com.ucmarket.entity.MarketReviewCheck;

public record MarketPreReviewResult(
        List<MarketReviewCheck> checks,
        List<String> blockingRuleCodes) {

    public MarketPreReviewResult {
        checks = List.copyOf(checks);
        blockingRuleCodes = List.copyOf(blockingRuleCodes);
    }

    public boolean blocked() {
        return !blockingRuleCodes.isEmpty();
    }
}
