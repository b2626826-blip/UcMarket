package com.ucmarket.exception;

import java.math.BigDecimal;
import java.util.UUID;

// 可用餘額不足以扣款時丟（debit / lock 用）。
public class InsufficientFundsException extends RuntimeException {

    public InsufficientFundsException(UUID userId, BigDecimal required, BigDecimal available) {
        super("餘額不足，userId=" + userId + "：需要 " + required + "，可用 " + available);
    }
}