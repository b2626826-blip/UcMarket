package com.ucmarket.dto;

import java.math.BigDecimal;

import com.ucmarket.entity.MarketSide;

public record TradeQuoteRequest(

        MarketSide side,

        BigDecimal amount

) {
}