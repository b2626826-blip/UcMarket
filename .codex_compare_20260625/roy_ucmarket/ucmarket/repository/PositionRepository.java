package com.ucmarket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;

public interface PositionRepository extends JpaRepository<Position, UUID> {

    List<Position> findByUserId(UUID userId);

    List<Position> findByUserIdAndStatus(UUID userId, PositionStatus status);

    Optional<Position> findByUserIdAndMarketId(UUID userId, UUID marketId);

    List<Position> findByMarketId(UUID marketId);

    List<Position> findByMarketIdAndStatus(UUID marketId, PositionStatus status);
}