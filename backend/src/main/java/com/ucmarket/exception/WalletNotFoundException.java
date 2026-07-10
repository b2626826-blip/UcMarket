package com.ucmarket.exception;

import java.util.UUID;

/**
 * 找不到指定 user 的錢包時丟出。
 *
 * 繼承 RuntimeException（unchecked，非 checked），三個理由：
 *  1. @Transactional 預設「遇到 RuntimeException 才 rollback」；checked 例外預設不會 rollback。
 *     用 unchecked 才能讓「找不到錢包」自然觸發整筆交易回滾。
 *  2. 不強迫每個呼叫端都 try/catch（checked 會逼你到處 catch 或 throws，很髒）。
 *  3. 之後接 REST 時，由全域 handler 統一把它對映成 HTTP 404 + 你們的例外格式。
 */
public class WalletNotFoundException extends RuntimeException {

	private static final long serialVersionUID = 1L; // 見下方說明

	private final UUID userId; // 哪個 user 的錢包找不到，留著給上層（log / 之後的 handler）用

	public WalletNotFoundException(UUID userId) {
		super("找不到使用者 " + userId + " 的錢包");
		this.userId = userId;
	}

	public UUID getUserId() {
		return userId;
	}
}

// exception 還要強力理解