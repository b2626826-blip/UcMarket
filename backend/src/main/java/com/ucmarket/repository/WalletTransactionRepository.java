package com.ucmarket.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.WalletTransaction;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

	boolean existsByIdempotencyKey(String idempotencyKey);
}