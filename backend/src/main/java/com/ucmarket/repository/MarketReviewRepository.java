package com.ucmarket.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ucmarket.entity.MarketReview;

public interface MarketReviewRepository extends JpaRepository<MarketReview, UUID> {
    List<MarketReview> findByMarketIdOrderByCreatedAtDesc(UUID marketId);
}
