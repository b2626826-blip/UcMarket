package com.ucmarket.dto;

import java.math.BigDecimal;

import com.ucmarket.entity.MarketSide;

public record TradeQuoteResponse(
		BigDecimal odds,    // 顯示給使用者的賠率 (例如 1.45)
	    BigDecimal amount   // 使用者投入的金額
	) {
	}