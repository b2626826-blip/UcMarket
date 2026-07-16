package com.ucmarket.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record ReviewMarketRequest(
    @NotBlank String comment
) {}
