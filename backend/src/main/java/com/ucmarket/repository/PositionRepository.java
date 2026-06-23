package com.ucmarket.repository;

import com.ucmarket.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PositionRepository extends JpaRepository<Position, Long> {

    List<Position> findByUserId(UUID userId);

    List<Position> findByUserIdAndStatus(UUID userId, String status);

    Optional<Position> findByUserIdAndMarketIdAndOptionIdAndStatus(
            UUID userId,
            UUID marketId,
            UUID optionId,
            String status
    );

    Optional<Position> findByIdAndUserId(
            Long id,
            UUID userId
    );
}