package com.ucmarket.dto;

import java.util.UUID;

public class CloseRequest {

    private UUID userId;
    private Long positionId;

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
}