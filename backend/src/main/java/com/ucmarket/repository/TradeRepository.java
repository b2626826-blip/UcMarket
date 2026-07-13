package com.ucmarket.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Trade;

public interface TradeRepository extends JpaRepository<Trade, UUID> {

	@Query("""
			SELECT t.marketId AS marketId, SUM(t.amount) AS volume
			FROM Trade t
			WHERE t.marketId IN :marketIds
			GROUP BY t.marketId
			""")
	List<MarketVolume> findVolumesByMarketIds(
			@Param("marketIds") Collection<UUID> marketIds);
}
