package com.ucmarket.dto;

import java.math.BigDecimal;

public class SellRequest {

    private String userId;
    private Long marketId;
    private Long optionId;

    private String side;
    private BigDecimal shares;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Long getMarketId() {
        return marketId;
    }

    public void setMarketId(Long marketId) {
        this.marketId = marketId;
    }

    public Long getOptionId() {
        return optionId;
    }

    public void setOptionId(Long optionId) {
        this.optionId = optionId;
    }

    public String getSide() {
        return side;
    }

    public void setSide(String side) {
        this.side = side;
    }

    public BigDecimal getShares() {
        return shares;
    }

    public void setShares(BigDecimal shares) {
        this.shares = shares;
    }
}