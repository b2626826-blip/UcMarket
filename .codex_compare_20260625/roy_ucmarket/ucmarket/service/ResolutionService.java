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
                .orElseThrow(() -> new IllegalArgumentException("找不到市場"));

        if (market.getStatus() == MarketStatus.RESOLVED) {
            throw new IllegalArgumentException("市場已經結算過了");
        }

        market.setStatus(MarketStatus.RESOLVED);
        market.setResult(result);

        List<Position> positions =
                positionRepository.findByMarketIdAndStatus(
                        marketId,
                        PositionStatus.OPEN
                );

        for (Position position : positions) {
            position.setStatus(PositionStatus.SETTLED);
        }

        positionRepository.saveAll(positions);

        return marketRepository.save(market);
    }

    @Transactional
    public Market cancelMarket(UUID marketId) {

        Market market = marketRepository.findById(marketId)
                .orElseThrow(() -> new IllegalArgumentException("找不到市場"));

        market.setStatus(MarketStatus.CANCELED);

        List<Position> positions =
                positionRepository.findByMarketIdAndStatus(
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