package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Trade;

public interface TradeRepository extends JpaRepository<Trade, UUID> {

    List<Trade> findByUserId(UUID userId);

    List<Trade> findByMarketId(UUID marketId);

    List<Trade> findByUserIdAndMarketId(UUID userId, UUID marketId);
}