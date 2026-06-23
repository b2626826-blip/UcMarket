package com.ucmarket.dto;

import java.util.UUID;

public class ResolveMarketRequest {

    private UUID marketId;
    private String result;

    public UUID getMarketId() {
        return marketId;
    }

    public void setMarketId(UUID marketId) {
        this.marketId = marketId;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }
}