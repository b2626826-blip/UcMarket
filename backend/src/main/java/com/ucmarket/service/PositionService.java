package com.ucmarket.service;

import com.ucmarket.dto.BuyRequest;
import com.ucmarket.dto.CloseRequest;
import com.ucmarket.dto.PositionRequest;
import com.ucmarket.dto.SellRequest;
import com.ucmarket.entity.Position;
import com.ucmarket.repository.PositionRepository;
import org.springframework.stereotype.Service;
import com.ucmarket.dto.PositionPnlRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import com.ucmarket.dto.SettleRequest;
import java.time.LocalDateTime;
@Service
public class PositionService {

    private final PositionRepository positionRepository;

    public PositionService(PositionRepository positionRepository) {
        this.positionRepository = positionRepository;
    }

    public List<Position> findAll() {
        return positionRepository.findAll();
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
        position.setStatus("ACTIVE");
        position.setSettledAt(null);

        return positionRepository.save(position);
    }

    public Position buy(BuyRequest request) {
        Position position = positionRepository
                .findByUserIdAndMarketIdAndOptionId(
                        request.getUserId(),
                        request.getMarketId(),
                        request.getOptionId())
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
            newPosition.setStatus("ACTIVE");
            newPosition.setSettledAt(null);

            return positionRepository.save(newPosition);
        }

        BigDecimal oldShares = position.getShares();
        BigDecimal oldAmount = position.getAmount();

        BigDecimal totalShares = oldShares.add(buyShares);
        BigDecimal totalAmount = oldAmount.add(buyAmount);
        BigDecimal newAvgCost = totalAmount.divide(totalShares, 6, RoundingMode.HALF_UP);

        position.setShares(totalShares);
        position.setAvgCost(newAvgCost);
        position.setAmount(totalAmount);
        position.setUnrealizedPnl(BigDecimal.ZERO);
        position.setStatus("ACTIVE");
        position.setSettledAt(null);

        return positionRepository.save(position);
    }
    public Position sell(SellRequest request) {

    Position position = positionRepository
            .findByUserIdAndMarketIdAndOptionId(
                    request.getUserId(),
                    request.getMarketId(),
                    request.getOptionId())
            .orElseThrow(() -> new RuntimeException("找不到持倉"));

    BigDecimal remainShares =
            position.getShares().subtract(request.getShares());

    if (remainShares.compareTo(BigDecimal.ZERO) < 0) {
        throw new RuntimeException("賣出股數超過持有股數");
    }

    position.setShares(remainShares);
    position.setAmount(
            remainShares.multiply(position.getAvgCost())
    );

    if (remainShares.compareTo(BigDecimal.ZERO) == 0) {
        position.setStatus("CLOSED");
    }

    return positionRepository.save(position);

    
}
public Position updatePnl(PositionPnlRequest request) {
    Position position = positionRepository
            .findById(request.getPositionId())
            .orElseThrow(() -> new RuntimeException("找不到持倉"));

    BigDecimal pnl = request.getCurrentPrice()
            .subtract(position.getAvgCost())
            .multiply(position.getShares());

    position.setUnrealizedPnl(pnl);

    return positionRepository.save(position);
}
public Position closePosition(CloseRequest request) {
    Position position = positionRepository
            .findById(request.getPositionId())
            .orElseThrow(() -> new RuntimeException("找不到持倉"));

    position.setStatus("CLOSED");

    return positionRepository.save(position);
}
public Position settlePosition(SettleRequest request) {
    Position position = positionRepository
            .findById(request.getPositionId())
            .orElseThrow(() -> new RuntimeException("找不到持倉"));

    position.setStatus("SETTLED");
    position.setSettledAt(LocalDateTime.now());

    return positionRepository.save(position);
}
public List<Position> getPositionsByUserId(String userId) {
    return positionRepository.findByUserId(userId);
}

public List<Position> getActivePositionsByUserId(String userId) {
    return positionRepository.findByUserIdAndStatus(
            userId,
            "ACTIVE"
    );
}
}   