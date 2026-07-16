package com.ucmarket.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Trade;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.TradeAction;

public interface TradeRepository extends JpaRepository<Trade, UUID> {

	Optional<Trade> findByIdempotencyKey(String idempotencyKey);

	long countByAction(TradeAction action);

	@Query("SELECT SUM(t.amount) FROM Trade t WHERE t.marketId = :marketId")
	BigDecimal sumAmountByMarketId(@Param("marketId") UUID marketId);

	@Query("""
			SELECT t.marketId AS marketId, SUM(t.amount) AS volume
			FROM Trade t
			WHERE t.marketId IN :marketIds
			GROUP BY t.marketId
			""")
	List<MarketVolume> findVolumesByMarketIds(
			@Param("marketIds") Collection<UUID> marketIds);

	@Query("""
			SELECT t FROM Trade t
			WHERE (:action IS NULL OR t.action = :action)
			AND (:side IS NULL OR t.side = :side)
			AND (:kwPattern IS NULL OR LOWER(COALESCE(t.code, '')) LIKE :kwPattern)
			""")
	Page<Trade> searchByPattern(
			@Param("action") TradeAction action,
			@Param("side") MarketSide side,
			@Param("kwPattern") String kwPattern,
			Pageable pageable);

	default Page<Trade> search(TradeAction action, MarketSide side, String keyword, Pageable pageable) {
		String kwPattern = (keyword == null || keyword.isBlank()) ? null
				: "%" + keyword.trim().toLowerCase() + "%";
		return searchByPattern(action, side, kwPattern, pageable);
	}
}
