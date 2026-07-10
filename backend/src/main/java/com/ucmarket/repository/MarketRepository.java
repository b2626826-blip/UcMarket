package com.ucmarket.repository;

import java.time.LocalDateTime;
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

	List<Market> findByStatusAndCloseAtBefore(MarketStatus status, LocalDateTime dateTime);

	Optional<Market> findByCode(String code);

	long countByStatus(MarketStatus status);

	Page<Market> findByCategory(String category, Pageable pageable);

	Page<Market> findByCategoryAndStatus(
		String category,
		MarketStatus status,
		Pageable pageable);
}
