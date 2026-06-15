package com.ucmarket.dto;

import java.math.BigDecimal;

public class BuyRequest {

    private String userId;
    private Long marketId;
    private Long optionId;
    private BigDecimal shares;
    private BigDecimal price;

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

    public BigDecimal getShares() {
        return shares;
    }

    public void setShares(BigDecimal shares) {
        this.shares = shares;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}