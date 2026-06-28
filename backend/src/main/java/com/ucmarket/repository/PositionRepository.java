package com.ucmarket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;

import jakarta.persistence.LockModeType;

public interface PositionRepository extends JpaRepository<Position, UUID> {

    List<Position> findByUserId(UUID userId);

    List<Position> findByUserIdAndStatus(UUID userId, PositionStatus status);

    Optional<Position> findByUserIdAndMarketId(UUID userId, UUID marketId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Position> findWithLockByUserIdAndMarketId(UUID userId, UUID marketId);

    @Modifying
    @Query(value = """
            INSERT INTO positions (
                id,
                user_id,
                market_id,
                yes_shares,
                no_shares,
                yes_cost,
                no_cost,
                status,
                updated_at
            )
            VALUES (
                :id,
                :userId,
                :marketId,
                :shares,
                0,
                :cost,
                0,
                'OPEN',
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, market_id)
            DO UPDATE SET
                yes_shares = positions.yes_shares + EXCLUDED.yes_shares,
                yes_cost = positions.yes_cost + EXCLUDED.yes_cost,
                updated_at = CURRENT_TIMESTAMP
            WHERE positions.status = 'OPEN'
            """, nativeQuery = true)
    int upsertYesBuy(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("marketId") UUID marketId,
            @Param("shares") java.math.BigDecimal shares,
            @Param("cost") java.math.BigDecimal cost
    );

    @Modifying
    @Query(value = """
            INSERT INTO positions (
                id,
                user_id,
                market_id,
                yes_shares,
                no_shares,
                yes_cost,
                no_cost,
                status,
                updated_at
            )
            VALUES (
                :id,
                :userId,
                :marketId,
                0,
                :shares,
                0,
                :cost,
                'OPEN',
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, market_id)
            DO UPDATE SET
                no_shares = positions.no_shares + EXCLUDED.no_shares,
                no_cost = positions.no_cost + EXCLUDED.no_cost,
                updated_at = CURRENT_TIMESTAMP
            WHERE positions.status = 'OPEN'
            """, nativeQuery = true)
    int upsertNoBuy(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("marketId") UUID marketId,
            @Param("shares") java.math.BigDecimal shares,
            @Param("cost") java.math.BigDecimal cost
    );

    List<Position> findByMarketId(UUID marketId);

    List<Position> findByMarketIdAndStatus(UUID marketId, PositionStatus status);
}