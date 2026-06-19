package com.ucmarket.dto;

import java.math.BigDecimal;

public class PositionPnlRequest {

    private Long positionId;
    private BigDecimal currentPrice;

    public Long getPositionId() {
        return positionId;
    }

    public void setPositionId(Long positionId) {
        this.positionId = positionId;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }
}