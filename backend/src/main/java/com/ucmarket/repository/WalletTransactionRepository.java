package com.ucmarket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.WalletTransaction;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

	// Harry 查明細：時間倒序、同秒用 id 倒序穩定排序（I-6）。Pageable 分頁
	List<WalletTransaction> findByWalletIdOrderByCreatedAtDescIdDesc(UUID walletId, Pageable pageable);

	// Harry 全防重：這個 idemKey 寫過了沒（最多 0 或 1 筆）
	Optional<WalletTransaction> findByIdempotencyKey(String idempotencyKey);

}
