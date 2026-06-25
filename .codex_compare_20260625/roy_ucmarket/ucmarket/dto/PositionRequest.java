package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.ucmarket.entity.MarketSide;

public record PositionRequest(

        UUID userId,

        UUID marketId,

        MarketSide side,

        BigDecimal shares,

        BigDecimal cost

) {
}