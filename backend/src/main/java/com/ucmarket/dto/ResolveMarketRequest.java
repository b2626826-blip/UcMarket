package com.ucmarket.dto;

import com.ucmarket.entity.MarketResult;

import jakarta.validation.constraints.NotNull;

public record ResolveMarketRequest(@NotNull MarketResult result) {
	
}
