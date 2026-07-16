package com.ucmarket.dto.admin;

import java.math.BigDecimal;

// 管理員錢包調整請求
// direction: "CREDIT"(加值) | "DEBIT"(扣除)；amount: 正數；reason: 原因(進 memo，用戶看得到)
public record AdminWalletAdjustRequest(
        String direction,
        BigDecimal amount,
        String reason) {
}
