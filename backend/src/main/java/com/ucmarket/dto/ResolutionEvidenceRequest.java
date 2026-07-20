package com.ucmarket.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResolutionEvidenceRequest(
        @NotBlank
        @Size(max = 2048)
        @Pattern(regexp = "^https?://\\S+$", message = "sourceUrl must use HTTP or HTTPS")
        String sourceUrl,
        @NotBlank
        @Size(max = 500)
        String sourceTitle,
        Instant publishedAt) {
}
