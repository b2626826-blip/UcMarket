package com.ucmarket.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.MarketResolutionEvidence;

public interface MarketResolutionEvidenceRepository
        extends JpaRepository<MarketResolutionEvidence, UUID> {

    Optional<MarketResolutionEvidence> findByMarketIdAndSourceUrl(UUID marketId, String sourceUrl);

    List<MarketResolutionEvidence> findByMarketIdOrderByCreatedAtAsc(UUID marketId);
}
