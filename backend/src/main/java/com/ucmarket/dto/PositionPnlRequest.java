package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class PositionPnlRequest {

    private UUID userId;
    private Long positionId;
    private BigDecimal currentPrice;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

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