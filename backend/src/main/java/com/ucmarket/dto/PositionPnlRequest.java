package com.ucmarket.dto;

import java.math.BigDecimal;

public class PositionPnlRequest {

    private Long positionId;
    private BigDecimal currentPrice;

    public Long getPositionId() {
        return positionId;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }
}