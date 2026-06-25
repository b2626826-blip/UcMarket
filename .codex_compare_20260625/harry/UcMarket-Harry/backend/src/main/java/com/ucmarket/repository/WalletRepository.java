package com.ucmarket.repository;

import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Wallet;


//繼承 JpaRepository：免費拿到 save / findById / findAll 等 CRUD
//泛型 <Wallet, UUID>：這個 repo 管 Wallet，主鍵型別是 UUID
public interface WalletRepository extends JpaRepository<Wallet, UUID> {

	Optional<Wallet> findByUserId(UUID userId);
	
	// 取錢包「並上悲觀寫鎖」—— 給 credit / debit / lock / unlock 用
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") UUID userId);
}