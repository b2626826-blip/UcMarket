package com.ucmarket.dto.admin;

import java.util.List;

import com.ucmarket.entity.Market;

public record AdminMarketListResponse(
    List<MarketSummaryItem> summary,
    List<Market> markets
) {}
