package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Trade;

public interface TradeRepository extends JpaRepository<Trade, UUID> {

	@Query("SELECT SUM(t.amount) FROM Trade t WHERE t.marketId = :marketId")
	BigDecimal sumAmountByMarketId(@Param("marketId") UUID marketId);
}