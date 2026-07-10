package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

// ⚠️ DEV ONLY：手動測 credit/debit 的請求體
public record DevTxRequest(UUID userId, BigDecimal amount, String refType, UUID refId, String idemKey) {
}