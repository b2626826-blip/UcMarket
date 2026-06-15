package com.ucmarket.service;

import com.ucmarket.dto.BuyRequest;
import com.ucmarket.dto.PositionRequest;
import com.ucmarket.entity.Position;
import com.ucmarket.repository.PositionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class PositionService {

    private final PositionRepository positionRepository;

    public PositionService(PositionRepository positionRepository) {
        this.positionRepository = positionRepository;
    }

    public List<Position> getPositionsByUserId(String userId) {
        return positionRepository.findByUserId(userId);
    }

    public List<Position> getActivePositionsByUserId(String userId) {
        return positionRepository.findByUserIdAndStatus(userId, "ACTIVE");
    }

    public Position createPosition(PositionRequest request) {
        Position position = new Position();

        position.setUserId(request.getUserId());
        position.setMarketId(request.getMarketId());
        position.setOptionId(request.getOptionId());
        position.setShares(request.getShares());
        position.setAvgCost(request.getAvgCost());
        position.setAmount(request.getShares().multiply(request.getAvgCost()));
        position.setStatus("ACTIVE");

        return positionRepository.save(position);
    }

    public Position buy(BuyRequest request) {
        Position position = positionRepository
                .findByUserIdAndMarketIdAndOptionId(
                        request.getUserId(),
                        request.getMarketId(),
                        request.getOptionId()
                )
                .orElse(null);

        if (position == null) {
            Position newPosition = new Position();

            newPosition.setUserId(request.getUserId());
            newPosition.setMarketId(request.getMarketId());
            newPosition.setOptionId(request.getOptionId());
            newPosition.setShares(request.getShares());
            newPosition.setAvgCost(request.getPrice());
            newPosition.setAmount(request.getShares().multiply(request.getPrice()));
            newPosition.setStatus("ACTIVE");

            return positionRepository.save(newPosition);
        }

        BigDecimal oldShares = position.getShares();
        BigDecimal oldAvgCost = position.getAvgCost();

        BigDecimal newShares = request.getShares();
        BigDecimal newPrice = request.getPrice();

        BigDecimal totalShares = oldShares.add(newShares);
        BigDecimal totalCost = oldShares.multiply(oldAvgCost)
                .add(newShares.multiply(newPrice));

        BigDecimal newAvgCost = totalCost.divide(totalShares, 6, RoundingMode.HALF_UP);

        position.setShares(totalShares);
        position.setAvgCost(newAvgCost);
        position.setAmount(totalShares.multiply(newAvgCost));
        position.setStatus("ACTIVE");

        return positionRepository.save(position);
    }
}