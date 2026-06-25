package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.ucmarket.entity.MarketSide;

public record TradeRequest(
	    UUID marketId,
	    MarketSide side,
	    BigDecimal amount
	) {}