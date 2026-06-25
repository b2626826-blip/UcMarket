package com.ucmarket.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResult;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.entity.Position;
import com.ucmarket.entity.PositionStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.PositionRepository;

@Service
public class ResolutionService {

    private final MarketRepository marketRepository;
    private final PositionRepository positionRepository;

    public ResolutionService(
            MarketRepository marketRepository,
            PositionRepository positionRepository
    ) {
        this.marketRepository = marketRepository;
        this.positionRepository = positionRepository;
    }

    @Transactional
    public Market resolveMarket(UUID marketId, MarketResult result) {
        Market market = marketRepository.findById(marketId)
                .orElseThrow(() -> new IllegalArgumentException("Market not found"));

        if (market.getStatus() == MarketStatus.RESOLVED) {
            throw new IllegalArgumentException("Market is already resolved");
        }

        if (market.getStatus() != MarketStatus.ACTIVE && market.getStatus() != MarketStatus.CLOSED) {
            throw new IllegalArgumentException("Market is not ready to resolve");
        }

        List<Position> positions = positionRepository.findByMarketIdAndStatus(
                marketId,
                PositionStatus.OPEN
        );

        for (Position position : positions) {
            position.setStatus(PositionStatus.SETTLED);
        }

        positionRepository.saveAll(positions);
        market.resolve(result);

        return marketRepository.save(market);
    }

    @Transactional
    public Market cancelMarket(UUID marketId) {
        Market market = marketRepository.findById(marketId)
                .orElseThrow(() -> new IllegalArgumentException("Market not found"));

        market.cancel();

        List<Position> positions = positionRepository.findByMarketIdAndStatus(
                marketId,
                PositionStatus.OPEN
        );

        for (Position position : positions) {
            position.setStatus(PositionStatus.CANCELED);
        }

        positionRepository.saveAll(positions);

        return marketRepository.save(market);
    }
}
