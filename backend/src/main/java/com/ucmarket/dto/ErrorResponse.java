package com.ucmarket.dto;

// 統一錯誤格式（例外公版 §1）：error=機器可讀碼、message=人類可讀
public record ErrorResponse(String error, String message) {
}