package com.ucmarket.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ucmarket.dto.ResolutionEvidenceCandidateResponse;
import com.ucmarket.entity.MarketStatus;
import com.ucmarket.repository.MarketRepository;

@Service
public class ResolutionEvidenceCandidateService {

    private static final String CURRENT_AFFAIRS = "CURRENT_AFFAIRS";
    private static final int MAX_PAGE_SIZE = 50;

    private final MarketRepository marketRepository;

    public ResolutionEvidenceCandidateService(MarketRepository marketRepository) {
        this.marketRepository = marketRepository;
    }

    @Transactional(readOnly = true)
    public Page<ResolutionEvidenceCandidateResponse> findCandidates(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Sort stableSort = Sort.by(
                Sort.Order.asc("closeAt"),
                Sort.Order.asc("id"));

        return marketRepository.findResolutionEvidenceCandidates(
                        MarketStatus.CLOSED,
                        CURRENT_AFFAIRS,
                        PageRequest.of(safePage, safeSize, stableSort))
                .map(ResolutionEvidenceCandidateResponse::from);
    }
}
