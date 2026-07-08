package com.ucmarket.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ucmarket.dto.admin.DashboardStatsResponse;
import com.ucmarket.entity.Market;
import com.ucmarket.service.AdminDashboardService;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse stats() {
        return adminDashboardService.getDashboardStats();
    }

    @GetMapping("/reviews")
    public List<Market> reviews() {
        return adminDashboardService.getPendingReviews();
    }
}
