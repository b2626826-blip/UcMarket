package com.ucmarket.notification;

public record MarketSubmittedPayload(
        String marketTitle,
        RecipientType recipientType) {

    public enum RecipientType {
        CREATOR,
        CREATOR_ADMIN,
        ADMIN
    }
}
