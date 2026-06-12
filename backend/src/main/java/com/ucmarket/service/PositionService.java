package com.ucmarket.service;

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
}