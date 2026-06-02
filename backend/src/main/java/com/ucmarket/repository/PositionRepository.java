package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;

public interface PositionRepository extends JpaRepository<Position, UUID> {

	List<Position> findByMarketIdAndStatus(UUID marketId, PositionStatus status);
}