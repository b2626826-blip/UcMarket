package com.ucmarket.dto.admin;

import java.util.List;

import com.ucmarket.dto.MarketResponse;

public record AdminMarketListResponse(
    List<MarketSummaryItem> summary,
    List<MarketResponse> markets
) {}
