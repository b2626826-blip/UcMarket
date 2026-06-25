package com.ucmarket.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;


public record WalletResponse(
		UUID id,
		UUID userId,
		BigDecimal balance, //應該要是0
		LocalDateTime createdAt 
		// 時間戳不確定要不要 需再跟組員對接
) {
}
