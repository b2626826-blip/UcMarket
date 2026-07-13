package com.ucmarket.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.ucmarket.dto.CurrentAffairsMarketResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;

public interface CurrentAffairsMarketRepository extends Repository<Market, UUID> {

	@Query(value = """
			SELECT new com.ucmarket.dto.CurrentAffairsMarketResponse(
				m.id, m.code, m.title, m.description, m.category, m.sourceUrl, m.imageUrl,
				m.resolutionRule, m.closeAt, m.status, m.yesPool, m.noPool, m.createdAt,
				m.updatedAt, COALESCE(SUM(t.amount), 0)
			)
			FROM Market m
			LEFT JOIN Trade t ON t.marketId = m.id
			WHERE m.category = 'CURRENT_AFFAIRS' AND m.status = :status
			GROUP BY m
			ORDER BY
				CASE WHEN :sort = 'popular' THEN COALESCE(SUM(t.amount), 0) END DESC,
				CASE WHEN :sort = 'popular' THEN m.createdAt END DESC,
				CASE WHEN :sort = 'latest' THEN m.createdAt END DESC,
				CASE WHEN :sort = 'closing' THEN m.closeAt END ASC,
				m.id ASC
			""", countQuery = """
			SELECT COUNT(m) FROM Market m
			WHERE m.category = 'CURRENT_AFFAIRS' AND m.status = :status
			""")
	Page<CurrentAffairsMarketResponse> findPageWithVolume(
			@Param("status") MarketStatus status,
			@Param("sort") String sort,
			Pageable pageable);

	@Query(value = """
			SELECT m FROM Market m
			LEFT JOIN Trade t ON t.marketId = m.id
			WHERE m.category = 'CURRENT_AFFAIRS' AND m.status = :status
			GROUP BY m
			ORDER BY COALESCE(SUM(t.amount), 0) DESC, m.createdAt DESC, m.id ASC
			""", countQuery = """
			SELECT COUNT(m) FROM Market m
			WHERE m.category = 'CURRENT_AFFAIRS' AND m.status = :status
			""")
	Page<Market> findPopularByStatus(@Param("status") MarketStatus status, Pageable pageable);

	@Query("""
			SELECT m FROM Market m
			WHERE m.category = 'CURRENT_AFFAIRS' AND m.status = :status
			""")
	Page<Market> findByStatus(@Param("status") MarketStatus status, Pageable pageable);

	@Query("""
			SELECT t.marketId AS marketId, SUM(t.amount) AS volume
			FROM Trade t
			WHERE t.marketId IN :marketIds
			GROUP BY t.marketId
			""")
	List<MarketVolume> findVolumesByMarketIds(
			@Param("marketIds") Collection<UUID> marketIds);
}
