package com.ucmarket.dto;

import java.math.BigDecimal;
import java.util.UUID;

// 查餘額回傳體。不直接回 Wallet entity（會洩漏內部欄位、把 API 綁死在 DB 結構上）
public record BalanceResponse(UUID userId, BigDecimal balance) {
}