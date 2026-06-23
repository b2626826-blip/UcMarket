package com.ucmarket.service;

import com.ucmarket.dto.BuyRequest;
import com.ucmarket.dto.CloseRequest;
import com.ucmarket.dto.PositionPnlRequest;
import com.ucmarket.dto.PositionRequest;
import com.ucmarket.dto.SellRequest;
import com.ucmarket.dto.SettleRequest;
import com.ucmarket.entity.Position;
import com.ucmarket.repository.PositionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

    public List<Position> getActivePositionsByUserId(UUID userId) {
        return positionRepository.findByUserIdAndStatus(userId, "OPEN");
    }

    public Position createPosition(PositionRequest request) {
        Position position = new Position();

        position.setUserId(request.getUserId());
        position.setMarketId(request.getMarketId());
        position.setOptionId(request.getOptionId());

        position.setShares(request.getShares());
        position.setAvgCost(request.getAvgCost());
        position.setAmount(request.getAmount());

        position.setUnrealizedPnl(BigDecimal.ZERO);
        position.setStatus("OPEN");

        return positionRepository.save(position);
    }

    public Position buy(BuyRequest request) {
        Position position = positionRepository
                .findByUserIdAndMarketIdAndOptionIdAndStatus(
                        request.getUserId(),
                        request.getMarketId(),
                        request.getOptionId(),
                        "OPEN"
                )
                .orElse(null);

        BigDecimal buyShares = request.getShares();
        BigDecimal buyPrice = request.getPrice();
        BigDecimal buyAmount = buyShares.multiply(buyPrice);

        if (position == null) {
            Position newPosition = new Position();

            newPosition.setUserId(request.getUserId());
            newPosition.setMarketId(request.getMarketId());
            newPosition.setOptionId(request.getOptionId());

            newPosition.setShares(buyShares);
            newPosition.setAvgCost(buyPrice);
            newPosition.setAmount(buyAmount);

            newPosition.setUnrealizedPnl(BigDecimal.ZERO);
            newPosition.setStatus("OPEN");

            return positionRepository.save(newPosition);
        }

        BigDecimal totalShares = position.getShares().add(buyShares);
        BigDecimal totalAmount = position.getAmount().add(buyAmount);
        BigDecimal newAvgCost = totalAmount.divide(totalShares, 6, RoundingMode.HALF_UP);

        position.setShares(totalShares);
        position.setAmount(totalAmount);
        position.setAvgCost(newAvgCost);
        position.setUnrealizedPnl(BigDecimal.ZERO);
        position.setStatus("OPEN");

        return positionRepository.save(position);
    }

    public Position sell(SellRequest request) {
        Position position = positionRepository
                .findByUserIdAndMarketIdAndOptionIdAndStatus(
                        request.getUserId(),
                        request.getMarketId(),
                        request.getOptionId(),
                        "OPEN"
                )
                .orElseThrow(() -> new RuntimeException("找不到你的持倉"));

        BigDecimal sellShares = request.getShares();
        BigDecimal remainShares = position.getShares().subtract(sellShares);

        if (remainShares.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("賣出股數超過持有股數");
        }

        position.setShares(remainShares);
        position.setAmount(remainShares.multiply(position.getAvgCost()));
        position.setUnrealizedPnl(BigDecimal.ZERO);

        if (remainShares.compareTo(BigDecimal.ZERO) == 0) {
            position.setStatus("CANCELED");
        }

        return positionRepository.save(position);
    }

    public Position updatePnl(PositionPnlRequest request) {
        Position position = positionRepository
                .findByIdAndUserId(
                        request.getPositionId(),
                        request.getUserId()
                )
                .orElseThrow(() -> new RuntimeException("找不到你的持倉"));

        BigDecimal pnl = request.getCurrentPrice()
                .subtract(position.getAvgCost())
                .multiply(position.getShares());

        position.setUnrealizedPnl(pnl);

        return positionRepository.save(position);
    }

    public Position closePosition(CloseRequest request) {
        Position position = positionRepository
                .findByIdAndUserId(
                        request.getPositionId(),
                        request.getUserId()
                )
                .orElseThrow(() -> new RuntimeException("找不到你的持倉"));

        position.setStatus("CANCELED");

        return positionRepository.save(position);
    }

    public Position settlePosition(SettleRequest request) {
        Position position = positionRepository
                .findByIdAndUserId(
                        request.getPositionId(),
                        request.getUserId()
                )
                .orElseThrow(() -> new RuntimeException("找不到你的持倉"));

        position.setStatus("SETTLED");
        position.setSettledAt(LocalDateTime.now());

        return positionRepository.save(position);
    }
}