package com.ucmarket.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Wallet;

import jakarta.persistence.LockModeType;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {
    Optional<Wallet> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") UUID userId);

    // F4：並發安全的 get-or-create —— DB 層 upsert，衝突即 DO NOTHING（不丟例外、不毒化交易）。
    // ON CONFLICT DO NOTHING（不指定 target）H2/Postgres 皆支援；id 由 Java 傳入避免 DB 專屬 UUID 函式。
    @Modifying
    @Query(value = "INSERT INTO wallets (id, user_id, balance, locked_balance, version, created_at, updated_at) "
            + "VALUES (:id, :userId, 0, 0, 0, now(), now()) "
            + "ON CONFLICT DO NOTHING", nativeQuery = true)
    void insertIfAbsent(@Param("id") UUID id, @Param("userId") UUID userId);
}
