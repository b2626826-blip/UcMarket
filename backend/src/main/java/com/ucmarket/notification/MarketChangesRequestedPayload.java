package com.ucmarket.notification;

public record MarketChangesRequestedPayload(
        String marketTitle,
        String comment) {
}
