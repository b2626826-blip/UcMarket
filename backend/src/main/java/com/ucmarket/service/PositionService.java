package com.ucmarket.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.PositionResponse;
import com.ucmarket.entity.MarketSide;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.PositionRepository;

@Service
public class PositionService {

    private final PositionRepository positionRepository;

    public PositionService(PositionRepository positionRepository) {
        this.positionRepository = positionRepository;
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> findAll() {
        return positionRepository.findAll()
                .stream()
                .map(PositionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> getPositionsByUserId(UUID userId) {
        requireId(userId, "User id is required");

        return positionRepository.findByUserId(userId)
                .stream()
                .map(PositionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> getOpenPositionsByUserId(UUID userId) {
        requireId(userId, "User id is required");

        return positionRepository.findByUserIdAndStatus(userId, PositionStatus.OPEN)
                .stream()
                .map(PositionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> getPositionsByMarketId(UUID marketId) {
        requireId(marketId, "Market id is required");

        return positionRepository.findByMarketId(marketId)
                .stream()
                .map(PositionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> getOpenPositionsByMarketId(UUID marketId) {
        requireId(marketId, "Market id is required");

        return positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN)
                .stream()
                .map(PositionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Position> findOpenByMarket(UUID marketId) {
        requireId(marketId, "Market id is required");
        return positionRepository.findByMarketIdAndStatus(marketId, PositionStatus.OPEN);
    }

    @Transactional
    public Position addBuyPosition(
            UUID userId,
            UUID marketId,
            MarketSide side,
            BigDecimal shares,
            BigDecimal cost
    ) {
        validateBuyInput(userId, marketId, side, shares, cost);

        Position position = positionRepository
                .findByUserIdAndMarketId(userId, marketId)
                .orElseGet(() -> {
                    Position p = new Position();
                    p.setUserId(userId);
                    p.setMarketId(marketId);
                    p.setStatus(PositionStatus.OPEN);
                    return p;
                });

        if (position.getStatus() != PositionStatus.OPEN) {
            throw new IllegalStateException("Position is not open");
        }

        if (side == MarketSide.YES) {
            position.setYesShares(position.getYesShares().add(shares));
            position.setYesCost(position.getYesCost().add(cost));
        } else if (side == MarketSide.NO) {
            position.setNoShares(position.getNoShares().add(shares));
            position.setNoCost(position.getNoCost().add(cost));
        } else {
            throw new IllegalArgumentException("Side must be YES or NO");
        }

        return positionRepository.save(position);
    }

    @Transactional
    public Position sellPosition(
            UUID userId,
            UUID marketId,
            MarketSide side,
            BigDecimal shares
    ) {
        validateSellInput(userId, marketId, side, shares);

        Position position = positionRepository
                .findByUserIdAndMarketId(userId, marketId)
                .orElseThrow(() -> new IllegalArgumentException("Position not found"));

        if (position.getStatus() != PositionStatus.OPEN) {
            throw new IllegalStateException("Position is not open");
        }

        if (side == MarketSide.YES) {
            if (position.getYesShares().compareTo(shares) < 0) {
                throw new IllegalArgumentException("Not enough YES shares");
            }
            position.setYesShares(position.getYesShares().subtract(shares));
        } else if (side == MarketSide.NO) {
            if (position.getNoShares().compareTo(shares) < 0) {
                throw new IllegalArgumentException("Not enough NO shares");
            }
            position.setNoShares(position.getNoShares().subtract(shares));
        } else {
            throw new IllegalArgumentException("Side must be YES or NO");
        }

        return positionRepository.save(position);
    }

    private void validateBuyInput(
            UUID userId,
            UUID marketId,
            MarketSide side,
            BigDecimal shares,
            BigDecimal cost
    ) {
        validateSellInput(userId, marketId, side, shares);
        if (cost == null || cost.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Cost must be positive");
        }
    }

    private void validateSellInput(
            UUID userId,
            UUID marketId,
            MarketSide side,
            BigDecimal shares
    ) {
        requireId(userId, "User id is required");
        requireId(marketId, "Market id is required");
        if (side == null) {
            throw new IllegalArgumentException("Side is required");
        }
        if (shares == null || shares.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Shares must be positive");
        }
    }

    private void requireId(UUID id, String message) {
        if (id == null) {
            throw new IllegalArgumentException(message);
        }
    }
}