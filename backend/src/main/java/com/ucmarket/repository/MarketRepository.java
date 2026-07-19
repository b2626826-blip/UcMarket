package com.ucmarket.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;

import jakarta.persistence.LockModeType;

public interface MarketRepository extends JpaRepository<Market, UUID> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT m FROM Market m WHERE m.id = :id")
	Optional<Market> findByIdForUpdate(@Param("id") UUID id);

	List<Market> findByStatus(MarketStatus status);

	Page<Market> findByStatus(MarketStatus status, Pageable pageable);

	List<Market> findByStatusAndCloseAtBefore(MarketStatus status, LocalDateTime dateTime);

	List<Market> findByStatusAndCloseAtAfterAndCloseAtLessThanEqual(
			MarketStatus status,
			LocalDateTime after,
			LocalDateTime beforeOrEqual);

	Optional<Market> findByCode(String code);

	List<Market> findByCategory(String category);

	long countByStatus(MarketStatus status);

	Page<Market> findByCategory(String category, Pageable pageable);

	Page<Market> findByCategoryAndStatus(
		String category,
		MarketStatus status,
		Pageable pageable);

	Page<Market> findByCreatorId(UUID creatorId, Pageable pageable);

	Page<Market> findByCreatorIdAndStatusIn(
			UUID creatorId,
			Collection<MarketStatus> statuses,
			Pageable pageable);

	@Query("""
			SELECT m FROM Market m
			WHERE (:status IS NULL OR m.status = :status)
			AND (:category IS NULL OR :category = '' OR m.category = :category)
			AND (
				:kwPattern IS NULL
				OR LOWER(COALESCE(m.title, '')) LIKE :kwPattern
				OR LOWER(COALESCE(m.code, '')) LIKE :kwPattern
			)
			""")
	Page<Market> searchAdminByPattern(
			@Param("status") MarketStatus status,
			@Param("category") String category,
			@Param("kwPattern") String kwPattern,
			Pageable pageable);

	default Page<Market> searchAdmin(MarketStatus status, String category, String keyword, Pageable pageable) {
		String kwPattern = (keyword == null || keyword.isBlank()) ? null
				: "%" + keyword.trim().toLowerCase() + "%";
		String cat = (category == null || category.isBlank()) ? null : category.trim();
		return searchAdminByPattern(status, cat, kwPattern, pageable);
	}
}
