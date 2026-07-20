package com.ucmarket.dto;

import java.util.List;

import org.springframework.data.domain.Page;

public record ResolutionEvidenceCandidatePageResponse(
        List<ResolutionEvidenceCandidateResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last,
        boolean hasNext) {

    public static ResolutionEvidenceCandidatePageResponse from(
            Page<ResolutionEvidenceCandidateResponse> candidates) {
        return new ResolutionEvidenceCandidatePageResponse(
                candidates.getContent(),
                candidates.getNumber(),
                candidates.getSize(),
                candidates.getTotalElements(),
                candidates.getTotalPages(),
                candidates.isFirst(),
                candidates.isLast(),
                candidates.hasNext());
    }
}
