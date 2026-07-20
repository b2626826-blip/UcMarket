package com.ucmarket.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ucmarket.dto.ResolutionEvidenceRequest;
import com.ucmarket.dto.ResolutionEvidenceResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.entity.MarketResolutionEvidence;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;
import com.ucmarket.repository.MarketResolutionEvidenceRepository;

@Service
public class MarketResolutionEvidenceService {

    private static final String CURRENT_AFFAIRS = "CURRENT_AFFAIRS";

    private final MarketRepository marketRepository;
    private final MarketResolutionEvidenceRepository evidenceRepository;

    public MarketResolutionEvidenceService(
            MarketRepository marketRepository,
            MarketResolutionEvidenceRepository evidenceRepository) {
        this.marketRepository = marketRepository;
        this.evidenceRepository = evidenceRepository;
    }

    @Transactional
    public ResolutionEvidenceResponse save(UUID marketId, ResolutionEvidenceRequest request) {
        Market market = marketRepository.findById(marketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Market not found"));
        if (!CURRENT_AFFAIRS.equals(market.getCategory())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Resolution evidence is limited to CURRENT_AFFAIRS markets");
        }
        if (market.getStatus() != MarketStatus.CLOSED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Market is not ready for resolution evidence");
        }

        return evidenceRepository.findByMarketIdAndSourceUrl(marketId, request.sourceUrl())
                .map(ResolutionEvidenceResponse::from)
                .orElseGet(() -> ResolutionEvidenceResponse.from(evidenceRepository.save(
                        new MarketResolutionEvidence(
                                marketId,
                                request.sourceUrl(),
                                request.sourceTitle(),
                                request.publishedAt()))));
    }

    @Transactional(readOnly = true)
    public List<ResolutionEvidenceResponse> list(UUID marketId) {
        if (!marketRepository.existsById(marketId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Market not found");
        }
        return evidenceRepository.findByMarketIdOrderByCreatedAtAsc(marketId).stream()
                .map(ResolutionEvidenceResponse::from)
                .toList();
    }
}
