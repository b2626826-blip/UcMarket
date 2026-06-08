package com.ucmarket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.ucmarket.dto.ErrorResponse;

// 全 app 共用：把領域例外「翻譯」成 HTTP 狀態碼 + 統一 ErrorResponse（例外公版 §2/§3）。
// Controller/Service 不自己設狀態碼，只管 throw 領域例外 → 翻譯交給這裡（分層乾淨）。
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(WalletNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleWalletNotFound(WalletNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("WALLET_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientFunds(InsufficientFundsException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)   // 422
                .body(new ErrorResponse("INSUFFICIENT_FUNDS", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)            // 400
                .body(new ErrorResponse("VALIDATION", "輸入驗證失敗"));
    }

    // 兜底：沒接到的未預期錯誤 → 500，且「不洩內部細節」（不回 ex.getMessage()）
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        // TODO: 這裡之後要 log.error(ex)（500 一定要記 log 才查得到）
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)  // 500
                .body(new ErrorResponse("INTERNAL", "伺服器發生未預期錯誤"));
    }
}