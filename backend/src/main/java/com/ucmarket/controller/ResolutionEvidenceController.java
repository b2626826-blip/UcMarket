package com.ucmarket.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.ResolutionEvidenceRequest;
import com.ucmarket.dto.ResolutionEvidenceResponse;
import com.ucmarket.service.MarketResolutionEvidenceService;

import jakarta.validation.Valid;

@RestController
public class ResolutionEvidenceController {

    private final MarketResolutionEvidenceService evidenceService;

    public ResolutionEvidenceController(MarketResolutionEvidenceService evidenceService) {
        this.evidenceService = evidenceService;
    }

    @PostMapping("/api/internal/current-affairs/markets/{id}/resolution-evidence")
    public ResolutionEvidenceResponse save(
            @PathVariable UUID id,
            @Valid @RequestBody ResolutionEvidenceRequest request) {
        return evidenceService.save(id, request);
    }

    @GetMapping("/api/admin/markets/{id}/resolution-evidence")
    public List<ResolutionEvidenceResponse> list(@PathVariable UUID id) {
        return evidenceService.list(id);
    }
}
