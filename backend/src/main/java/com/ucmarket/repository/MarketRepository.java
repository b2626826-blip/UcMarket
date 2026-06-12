package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketStatus;

public interface MarketRepository extends JpaRepository<Market, UUID> {

	List<Market> findByStatus(MarketStatus status);

	long countByStatus(MarketStatus status);
}