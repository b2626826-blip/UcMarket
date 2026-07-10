package com.ucmarket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

// idempotency key 命中既有交易、但內容跟本次請求對不上（被挪用去做別的），或並發撞到唯一索引。
// 由 GlobalExceptionHandler 的明確 @ExceptionHandler 對映成 409。
// 下面的 @ResponseStatus(CONFLICT) 只是後備：因 GlobalExceptionHandler 有 Exception catch-all 會先回 500
// 蓋掉它，真正生效的是那支明確 handler；保留此標註是防 handler 日後被移除時仍有合理預設。
@ResponseStatus(HttpStatus.CONFLICT)
public class IdempotencyConflictException extends RuntimeException {

	public IdempotencyConflictException(String idempotencyKey) {
		super("idempotency key 已用於另一筆不同的交易: " + idempotencyKey);
	}
}
