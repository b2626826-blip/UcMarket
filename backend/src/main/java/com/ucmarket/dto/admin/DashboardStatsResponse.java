package com.ucmarket.dto.admin;

public record DashboardStatsResponse(
    long totalUsers,
    long totalMarkets,
    long pendingCount,
    long activeCount,
    long resolvedCount,
    long rejectedCount,
    long draftCount
) {}
