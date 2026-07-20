package com.ucmarket.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.ResolutionEvidenceCandidatePageResponse;
import com.ucmarket.service.ResolutionEvidenceCandidateService;

@RestController
public class ResolutionEvidenceCandidateController {

    private final ResolutionEvidenceCandidateService candidateService;

    public ResolutionEvidenceCandidateController(
            ResolutionEvidenceCandidateService candidateService) {
        this.candidateService = candidateService;
    }

    @GetMapping("/api/internal/current-affairs/resolution-evidence-candidates")
    public ResolutionEvidenceCandidatePageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResolutionEvidenceCandidatePageResponse.from(
                candidateService.findCandidates(page, size));
    }
}
