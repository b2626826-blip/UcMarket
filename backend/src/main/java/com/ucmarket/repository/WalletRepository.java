package com.ucmarket.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Wallet;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {

	Optional<Wallet> findByUserId(UUID userId);
}