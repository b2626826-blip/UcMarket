package com.ucmarket.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.ucmarket.entity.WalletTransactionType;

public record WalletTransactionResponse(
		UUID id,
		WalletTransactionType type,
		BigDecimal amount,
		BigDecimal balanceAfter,
		String referenceType,
		UUID referenceId,
		String memo,
		LocalDateTime createdAt) {
}
