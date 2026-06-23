package com.ucmarket.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;

public interface MarketRepository extends JpaRepository<Market, UUID> {

	List<Market> findByStatus(MarketStatus status);

	List<Market> findByStatusAndCloseAtBefore(MarketStatus status, LocalDateTime dateTime);

	Optional<Market> findByCode(String code);

	long countByStatus(MarketStatus status);
}
