package com.ucmarket.service;
import com.ucmarket.dto.PositionRequest;
import com.ucmarket.entity.Position;
import com.ucmarket.repository.PositionRepository;
import org.springframework.stereotype.Service;
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

    position.setAmount(
            request.getShares().multiply(request.getAvgCost())
    );
position.setStatus("ACTIVE");

    return positionRepository.save(position);
}

}