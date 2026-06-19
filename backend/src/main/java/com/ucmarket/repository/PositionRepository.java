package com.ucmarket.repository;

import com.ucmarket.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PositionRepository extends JpaRepository<Position, Long> {

    List<Position> findByUserId(String userId);

    List<Position> findByUserIdAndStatus(
            String userId,
            String status
    );

    Optional<Position> findByUserIdAndMarketIdAndOptionId(
            String userId,
            Long marketId,
            Long optionId
    );
}