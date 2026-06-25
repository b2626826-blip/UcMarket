package com.ucmarket.dto;

import java.math.BigDecimal;

import com.ucmarket.entity.MarketSide;

public record TradeQuoteResponse(

        MarketSide side,

        BigDecimal amount,

        BigDecimal price,

        BigDecimal shares

) {
}