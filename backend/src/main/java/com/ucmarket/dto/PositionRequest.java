package com.ucmarket.dto;

import java.math.BigDecimal;

public class PositionRequest {

    private String userId;
    private Long marketId;
    private Long optionId;
    private BigDecimal shares;
    private BigDecimal avgCost;

    public String getUserId() {
        return userId;
    }

    public Long getMarketId() {
        return marketId;
    }
    public Long getOptionId() {
        return optionId;
    }

    public BigDecimal getShares() {
        return shares;
    }

    public BigDecimal getAvgCost() {
        return avgCost;
    }
}