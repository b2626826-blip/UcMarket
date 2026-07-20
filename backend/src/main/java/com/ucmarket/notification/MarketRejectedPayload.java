package com.ucmarket.notification;

public record MarketRejectedPayload(
        String marketTitle,
        String reason) {
}
