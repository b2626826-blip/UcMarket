package com.ucmarket.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public List<Position> findAll() {
        return positionRepository.findAll();
    }

    public List<Position> getPositionsByUserId(UUID userId) {
        return positionRepository.findByUserId(userId);
    }

    public List<Position> getOpenPositionsByUserId(UUID userId) {
        return positionRepository.findByUserIdAndStatus(userId, PositionStatus.OPEN);
    }

    public List<Position> getPositionsByMarketId(UUID marketId) {
        return positionRepository.findByMarketId(marketId);
    }

    public List<Position> getOpenPositionsByMarketId(UUID marketId) {
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
        Position position = positionRepository
                .findByUserIdAndMarketId(userId, marketId)
                .orElseGet(() -> {
                    Position newPosition = new Position();
                    newPosition.setUserId(userId);
                    newPosition.setMarketId(marketId);
                    newPosition.setStatus(PositionStatus.OPEN);
                    return newPosition;
                });

        if (side == MarketSide.YES) {
            position.setYesShares(position.getYesShares().add(shares));
            position.setYesCost(position.getYesCost().add(cost));
        } else if (side == MarketSide.NO) {
            position.setNoShares(position.getNoShares().add(shares));
            position.setNoCost(position.getNoCost().add(cost));
        } else {
            throw new IllegalArgumentException("side 只能是 YES 或 NO");
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
        Position position = positionRepository
                .findByUserIdAndMarketId(userId, marketId)
                .orElseThrow(() -> new IllegalArgumentException("找不到持倉"));

        if (side == MarketSide.YES) {
            if (position.getYesShares().compareTo(shares) < 0) {
                throw new IllegalArgumentException("YES 持倉不足");
            }

            position.setYesShares(position.getYesShares().subtract(shares));

        } else if (side == MarketSide.NO) {
            if (position.getNoShares().compareTo(shares) < 0) {
                throw new IllegalArgumentException("NO 持倉不足");
            }

            position.setNoShares(position.getNoShares().subtract(shares));

        } else {
            throw new IllegalArgumentException("side 只能是 YES 或 NO");
        }

        return positionRepository.save(position);
    }

    @Transactional
    public void settleByMarketId(UUID marketId) {
        List<Position> positions = positionRepository
                .findByMarketIdAndStatus(marketId, PositionStatus.OPEN);

        for (Position position : positions) {
            position.setStatus(PositionStatus.SETTLED);
        }

        positionRepository.saveAll(positions);
    }

    @Transactional
    public void cancelByMarketId(UUID marketId) {
        List<Position> positions = positionRepository
                .findByMarketIdAndStatus(marketId, PositionStatus.OPEN);

        for (Position position : positions) {
            position.setStatus(PositionStatus.CANCELED);
        }

        positionRepository.saveAll(positions);
    }
}