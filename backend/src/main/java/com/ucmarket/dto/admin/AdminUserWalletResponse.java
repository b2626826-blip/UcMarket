package com.ucmarket.dto.admin;

import java.math.BigDecimal;
import java.util.List;

import com.ucmarket.dto.WalletTransactionResponse;

// 管理員查某用戶錢包:餘額 + 最近流水（給調整頁面板顯示）
public record AdminUserWalletResponse(
        BigDecimal balance,
        List<WalletTransactionResponse> transactions) {
}
